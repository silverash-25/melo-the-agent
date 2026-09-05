const { EventEmitter } = require('events');
const { createPlan, getNextAction } = require('./planner');
const { executeAction } = require('../n8n/client');
const { normalizeObservation } = require('../observer/observer');
const { evaluateGoal } = require('../evaluator/evaluator');
const { validateSchema } = require('../utils/schemas');
const { v4: uuidv4 } = require('uuid');

const MAX_ITERATIONS = parseInt(process.env.MAX_ITERATIONS || '10', 10);
const TASK_BUDGET_MS = parseInt(process.env.TASK_BUDGET_MS || '300000', 10); // 5 minutes
const EVAL_CHECKPOINT_INTERVAL = 3; // Evaluate every N successful actions

class MeloOrchestrator extends EventEmitter {
  constructor() {
    super();
    this.tasks = new Map();
  }

  getTaskState(taskId) {
    return this.tasks.get(taskId);
  }

  emitEvent(taskId, eventType, data) {
    const timestamp = new Date().toISOString();
    const payload = {
      event: eventType,
      data: data,
      timestamp: timestamp
    };
    
    const task = this.tasks.get(taskId);
    if (task) {
      task.events.push(payload);
    }
    
    this.emit(`task-${taskId}`, payload);
    this.emit('all-events', payload);
  }

  remainingBudgetMs(task) {
    return Math.max(0, TASK_BUDGET_MS - (Date.now() - task.startTime));
  }

  async startTask(goalString) {
    const taskId = uuidv4();
    const taskState = {
      taskId: taskId,
      goal: goalString,
      status: 'created',
      plan: null,
      currentAction: null,
      actionHistory: [],
      observations: [],
      evaluations: [],
      events: [],
      iterationCount: 0,
      retries: 0,
      startTime: Date.now(),
      timing: [],         // Instrumentation
      nemotronCalls: 0,
      evalCalls: 0,
      replanCalls: 0,
      toolCalls: 0,
      consecutiveSuccesses: 0  // For eval checkpoint logic
    };
    
    this.tasks.set(taskId, taskState);

    this.emitEvent(taskId, 'task.created', {
      task_id: taskId,
      goal: goalString,
      created_at: new Date().toISOString()
    });

    // Start background loop
    this.runLoop(taskId).catch(err => {
      console.error(`Task ${taskId} failed:`, err);
      taskState.status = 'failed';
      this.emitEvent(taskId, 'task.failed', {
        task_id: taskId,
        reason: err.message
      });
    });

    return taskId;
  }

  _logTiming(task, stage, durationMs) {
    task.timing.push({ stage, durationMs, elapsed: Date.now() - task.startTime });
    console.log(`[TIMING] ${stage}: ${durationMs}ms (total elapsed: ${Date.now() - task.startTime}ms)`);
  }

  _shouldEvaluate(task, actionRes) {
    // Always evaluate on action failure
    if (!actionRes.success) return true;

    // Always evaluate when plan steps are exhausted
    // (We detect this by checking if consecutiveSuccesses >= plan steps remaining)
    const totalSteps = task.plan ? task.plan.steps.length : 0;
    const completedActions = task.actionHistory.filter(a => a.success).length;
    if (completedActions >= totalSteps) return true;

    // Safety checkpoint: every N successful actions
    if (task.consecutiveSuccesses > 0 && task.consecutiveSuccesses % EVAL_CHECKPOINT_INTERVAL === 0) return true;

    // Check for unexpected/ambiguous output
    if (actionRes.data && actionRes.data.result_count === 0) return true;

    return false;
  }

  async runLoop(taskId) {
    const task = this.tasks.get(taskId);
    
    try {
      task.status = 'planning';
      
      let t0 = Date.now();
      const plan = await createPlan(taskId, task.goal, {
        remainingBudgetMs: this.remainingBudgetMs(task)
      });
      task.nemotronCalls++;
      this._logTiming(task, 'createPlan', Date.now() - t0);
      task.plan = plan;
      
      this.emitEvent(taskId, 'plan.created', {
        task_id: taskId,
        objective: plan.objective,
        steps: plan.steps,
        status: plan.status
      });

      // Main execution loop
      while (task.status !== 'completed' && task.status !== 'failed') {
        // Budget check
        const remaining = this.remainingBudgetMs(task);
        if (remaining < 10000) { // Less than 10s left
          throw new Error(`Task budget nearly exhausted (${Math.round(remaining/1000)}s remaining). Stopping gracefully.`);
        }

        if (task.iterationCount >= MAX_ITERATIONS) {
          throw new Error(`Maximum iterations reached (${MAX_ITERATIONS}). The required external data could not be retrieved or task is stuck.`);
        }
        
        task.iterationCount++;
        
        // 1. Get next action
        task.status = 'executing';
        t0 = Date.now();
        const actionReq = await getNextAction(taskId, task.goal, task.plan, task.observations, task.actionHistory, {
          remainingBudgetMs: this.remainingBudgetMs(task)
        });
        task.nemotronCalls++;
        this._logTiming(task, `getNextAction[${task.iterationCount}]`, Date.now() - t0);
        task.currentAction = actionReq;
        
        // --- Stagnation Detection ---
        const lastReq = task.lastActionReq;
        if (lastReq && lastReq.action === actionReq.action && JSON.stringify(lastReq.parameters) === JSON.stringify(actionReq.parameters)) {
          task.stagnantCount = (task.stagnantCount || 0) + 1;
          if (task.stagnantCount >= 2) { // 3 consecutive identical actions
            throw new Error("Stagnation detected: Agent is repeating the exact same action without progressing.");
          }
        } else {
          task.stagnantCount = 0;
        }
        task.lastActionReq = actionReq;
        
        this.emitEvent(taskId, 'action.started', {
          task_id: taskId,
          action_id: actionReq.action_id,
          action: actionReq.action,
          reason: actionReq.reason,
          parameters: actionReq.parameters
        });

        // 2. Execute Action
        t0 = Date.now();
        const actionRes = await executeAction(actionReq);
        task.toolCalls++;
        this._logTiming(task, `executeAction[${task.iterationCount}:${actionReq.action}]`, Date.now() - t0);
        task.actionHistory.push(actionRes);
        
        this.emitEvent(taskId, 'action.completed', {
          task_id: taskId,
          action_id: actionRes.action_id,
          success: actionRes.success,
          summary: actionRes.error ? `Failed: ${actionRes.error}` : `Success`,
          data: actionRes.data,
          error: actionRes.error,
          metadata: actionRes.metadata
        });

        // 3. Observe
        task.status = 'observing';
        const observation = normalizeObservation(actionRes);
        
        // Reset stagnation if a new observation is produced
        const lastObs = task.observations.length > 0 ? task.observations[task.observations.length - 1] : null;
        if (lastObs && observation.summary !== lastObs.summary) {
          task.stagnantCount = 0; 
        }
        
        task.observations.push(observation);
        this.emitEvent(taskId, 'observation.received', observation);

        // Track consecutive successes
        if (actionRes.success) {
          task.consecutiveSuccesses++;
        } else {
          task.consecutiveSuccesses = 0;
        }

        // 4. Smart Evaluation — only at checkpoints
        if (this._shouldEvaluate(task, actionRes)) {
          task.status = 'evaluating';
          this.emitEvent(taskId, 'evaluation.started', { task_id: taskId });
          
          t0 = Date.now();
          const evaluation = await evaluateGoal(taskId, task.goal, task.plan, task.observations, task.evaluations, {
            remainingBudgetMs: this.remainingBudgetMs(task)
          });
          task.nemotronCalls++;
          task.evalCalls++;
          this._logTiming(task, `evaluateGoal[${task.iterationCount}]`, Date.now() - t0);
          task.evaluations.push(evaluation);
          
          this.emitEvent(taskId, 'evaluation.completed', evaluation);

          // 5. Decide
          if (evaluation.status === 'pass') {
            // --- Final Answer Synthesis ---
            const { askNemotron } = require('./nemotron');
            const sysPrompt = `You are the MELO Final Synthesizer. Based on the user's goal and the verified evidence, write a concise, direct, user-facing final answer.
CRITICAL RULES:
- Use ONLY verified information from the supplied observations.
- NEVER invent, estimate, or fabricate numerical values.
- Preserve exact numerical results returned by tools.
- If a value cannot be verified from observations, state that explicitly.
- Do not claim an artifact was created unless a tool result confirms it.
- No internal chain of thought or planner logs.`;

            const verifiedEvidence = {
              goal: task.goal,
              verified_observations: task.observations,
              evaluation_summary: evaluation.reason
            };

            const userPrompt = `Evidence Payload:\n${JSON.stringify(verifiedEvidence, null, 2)}\n\nSynthesize the final result.`;
            
            let finalResult = evaluation.reason; // Fallback
            try {
              t0 = Date.now();
              const synthRes = await askNemotron(sysPrompt, userPrompt, false, 0.2, {
                maxTokens: 1024,
                remainingBudgetMs: this.remainingBudgetMs(task)
              });
              task.nemotronCalls++;
              this._logTiming(task, 'finalSynthesis', Date.now() - t0);
              finalResult = synthRes.trim();
            } catch (e) {
              console.error("Failed to synthesize final answer:", e);
            }
            
            const totalDuration = Date.now() - task.startTime;
            console.log(`\n[PERF SUMMARY] Task ${taskId}`);
            console.log(`  Total duration: ${totalDuration}ms (${(totalDuration/1000).toFixed(1)}s)`);
            console.log(`  Nemotron calls: ${task.nemotronCalls}`);
            console.log(`  Evaluator calls: ${task.evalCalls}`);
            console.log(`  Replan calls: ${task.replanCalls}`);
            console.log(`  Tool calls: ${task.toolCalls}`);
            console.log(`  Iterations: ${task.iterationCount}`);
            console.log(`  Timing breakdown:`);
            task.timing.forEach(t => console.log(`    ${t.stage}: ${t.durationMs}ms`));
            
            task.status = 'completed';
            this.emitEvent(taskId, 'task.completed', {
              task_id: taskId,
              result: finalResult,
              summary: evaluation.reason
            });
            break;
          } else if (evaluation.status === 'fail') {
            task.status = 'failed';
            this.emitEvent(taskId, 'task.failed', {
              task_id: taskId,
              reason: evaluation.reason
            });
            break;
          } else {
            // Incomplete -> Replan
            task.status = 'replanning';
            this.emitEvent(taskId, 'replan.started', {
              task_id: taskId,
              reason: evaluation.reason
            });
            
            t0 = Date.now();
            const newPlan = await createPlan(taskId, task.goal + " - taking into account: " + evaluation.reason, {
              remainingBudgetMs: this.remainingBudgetMs(task)
            });
            task.nemotronCalls++;
            task.replanCalls++;
            this._logTiming(task, `replan[${task.iterationCount}]`, Date.now() - t0);
            
            const oldSteps = new Set(task.plan.steps);
            const newSteps = newPlan.steps.filter(s => !oldSteps.has(s));
            
            task.plan = newPlan;
            task.consecutiveSuccesses = 0; // Reset after replan
            
            this.emitEvent(taskId, 'plan.updated', {
              task_id: taskId,
              objective: newPlan.objective,
              steps: newSteps.length > 0 ? newSteps : ["Continue execution"],
              status: newPlan.status
            });
          }
        }
        // If evaluation was skipped, the loop continues to the next iteration
        // (getNextAction will pick the next step from the plan)
      }

    } catch (e) {
      const totalDuration = Date.now() - task.startTime;
      console.error(`Task ${taskId} failed after ${totalDuration}ms:`, e);
      console.log(`[PERF SUMMARY] Task ${taskId} (FAILED)`);
      console.log(`  Total duration: ${totalDuration}ms (${(totalDuration/1000).toFixed(1)}s)`);
      console.log(`  Nemotron calls: ${task.nemotronCalls}`);
      console.log(`  Evaluator calls: ${task.evalCalls}`);
      console.log(`  Replan calls: ${task.replanCalls}`);
      console.log(`  Tool calls: ${task.toolCalls}`);
      console.log(`  Iterations: ${task.iterationCount}`);
      if (task.timing.length > 0) {
        console.log(`  Timing breakdown:`);
        task.timing.forEach(t => console.log(`    ${t.stage}: ${t.durationMs}ms`));
      }
      
      task.status = 'failed';
      this.emitEvent(taskId, 'task.failed', {
        task_id: taskId,
        reason: e.message
      });
    }
  }
}

const orchestrator = new MeloOrchestrator();
module.exports = { orchestrator };

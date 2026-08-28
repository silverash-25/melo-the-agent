/**
 * MELO TaskStore
 * 
 * Central reactive state store using EventTarget-based pub/sub.
 * The store processes incoming MELO events and updates state.
 * UI components subscribe to state changes.
 * 
 * The frontend DISPLAYS state — the backend DECIDES state.
 */
import { EventTypes, TaskStatus } from './EventTypes.js';

/**
 * Creates a new TaskStore instance.
 */
export function createTaskStore() {
  const emitter = new EventTarget();

  /** @type {TaskState} */
  let state = getInitialState();

  function getInitialState() {
    return {
      taskId: null,
      goal: '',
      status: TaskStatus.IDLE,
      plan: null,            // { objective, steps: [{ text, status }] }
      currentStepIndex: -1,
      events: [],            // timeline entries
      currentAction: null,   // { action_id, action, reason, parameters, status }
      observations: [],
      evaluation: null,      // { status, requirements_met, requirements_missing, reason }
      result: null,          // final output string
      error: null,           // { message, actionsAttempted, replans }
      startedAt: null,
      iteration: 0,
      replanned: false,      // has a replan occurred during this task?
    };
  }

  function getState() {
    return { ...state };
  }

  function subscribe(listener) {
    const handler = (e) => listener(e.detail);
    emitter.addEventListener('statechange', handler);
    return () => emitter.removeEventListener('statechange', handler);
  }

  function notify() {
    emitter.dispatchEvent(new CustomEvent('statechange', { detail: getState() }));
  }

  function addTimelineEntry(event) {
    const { type, source, message, timestamp } = categorizeEvent(event);
    state.events = [
      ...state.events,
      {
        id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type,
        source,
        message,
        timestamp: timestamp || new Date().toISOString(),
        raw: event,
      },
    ];
  }

  /**
   * Categorize an event into timeline-friendly fields.
   * Shows safe, high-level status messages — never private chain-of-thought.
   */
  function categorizeEvent(event) {
    const ts = event.timestamp || new Date().toISOString();
    switch (event.event) {
      case EventTypes.TASK_CREATED:
        return { type: 'task', source: 'system', message: `Goal received: "${event.data?.goal || state.goal}"`, timestamp: ts };
      case EventTypes.PLAN_CREATED:
        return { type: 'plan', source: 'melo', message: `Plan created with ${event.data?.steps?.length || 0} steps`, timestamp: ts };
      case EventTypes.ACTION_STARTED:
        return { type: 'action', source: 'melo', message: `Starting: ${event.data?.action || 'action'}`, timestamp: ts };
      case EventTypes.ACTION_COMPLETED:
        return { type: 'action', source: 'tool', message: event.data?.success ? `Completed: ${event.data?.summary || event.data?.action || 'action'}` : `Failed: ${event.data?.error || 'Unknown error'}`, timestamp: ts };
      case EventTypes.OBSERVATION_RECEIVED:
        return { type: 'observation', source: 'tool', message: event.data?.summary || 'Observation received', timestamp: ts };
      case EventTypes.EVALUATION_STARTED:
        return { type: 'evaluation', source: 'eval', message: 'MELO is checking whether the collected information satisfies the goal.', timestamp: ts };
      case EventTypes.EVALUATION_COMPLETED: {
        const evalStatus = event.data?.status;
        if (evalStatus === 'pass') return { type: 'evaluation', source: 'eval', message: 'Evaluation passed — all requirements met.', timestamp: ts };
        if (evalStatus === 'incomplete') return { type: 'evaluation', source: 'eval', message: `Evaluation incomplete: ${event.data?.reason || 'missing information'}`, timestamp: ts };
        return { type: 'evaluation', source: 'eval', message: `Evaluation failed: ${event.data?.reason || 'requirements not met'}`, timestamp: ts };
      }
      case EventTypes.REPLAN_STARTED:
        return { type: 'replan', source: 'melo', message: 'MELO is replanning to address missing information...', timestamp: ts };
      case EventTypes.PLAN_UPDATED:
        return { type: 'plan', source: 'melo', message: `Plan updated — ${event.data?.steps?.length || 0} steps in revised plan`, timestamp: ts };
      case EventTypes.TASK_COMPLETED:
        return { type: 'completed', source: 'system', message: 'Task completed successfully.', timestamp: ts };
      case EventTypes.TASK_FAILED:
        return { type: 'failed', source: 'system', message: `Task failed: ${event.data?.reason || 'Unknown error'}`, timestamp: ts };
      default:
        return { type: 'task', source: 'system', message: event.event || 'Unknown event', timestamp: ts };
    }
  }

  /**
   * Dispatch an incoming MELO event. This is the main state transition function.
   */
  function dispatch(event) {
    if (!event || !event.event) return;

    addTimelineEntry(event);

    switch (event.event) {
      case EventTypes.TASK_CREATED: {
        state.taskId = event.data?.task_id || state.taskId;
        state.goal = event.data?.goal || state.goal;
        state.status = TaskStatus.CREATED;
        state.startedAt = event.data?.created_at || new Date().toISOString();
        break;
      }

      case EventTypes.PLAN_CREATED: {
        state.status = TaskStatus.PLANNING;
        state.plan = {
          objective: event.data?.objective || state.goal,
          steps: (event.data?.steps || []).map((text) => ({
            text,
            status: 'pending',
          })),
          isReplan: false,
        };
        state.currentStepIndex = -1;
        // Immediately transition to executing
        state.status = TaskStatus.EXECUTING;
        break;
      }

      case EventTypes.ACTION_STARTED: {
        state.status = TaskStatus.EXECUTING;
        state.currentAction = {
          action_id: event.data?.action_id,
          action: event.data?.action,
          reason: event.data?.reason,
          parameters: event.data?.parameters,
          status: 'running',
        };
        // Advance plan step
        if (state.plan && state.currentStepIndex < state.plan.steps.length - 1) {
          // Complete previous step if any
          if (state.currentStepIndex >= 0) {
            state.plan.steps[state.currentStepIndex].status = 'completed';
          }
          state.currentStepIndex++;
          state.plan.steps[state.currentStepIndex].status = 'active';
        }
        break;
      }

      case EventTypes.ACTION_COMPLETED: {
        if (state.currentAction) {
          state.currentAction.status = event.data?.success ? 'completed' : 'failed';
          state.currentAction.result = event.data;
        }
        // Mark current plan step
        if (state.plan && state.currentStepIndex >= 0 && state.currentStepIndex < state.plan.steps.length) {
          state.plan.steps[state.currentStepIndex].status = event.data?.success ? 'completed' : 'failed';
        }
        break;
      }

      case EventTypes.OBSERVATION_RECEIVED: {
        state.status = TaskStatus.OBSERVING;
        state.observations = [...state.observations, event.data];
        break;
      }

      case EventTypes.EVALUATION_STARTED: {
        state.status = TaskStatus.EVALUATING;
        break;
      }

      case EventTypes.EVALUATION_COMPLETED: {
        state.evaluation = {
          status: event.data?.status,
          requirements_met: event.data?.requirements_met || [],
          requirements_missing: event.data?.requirements_missing || [],
          reason: event.data?.reason,
          recommended_action: event.data?.recommended_action,
        };
        break;
      }

      case EventTypes.REPLAN_STARTED: {
        state.status = TaskStatus.REPLANNING;
        state.replanned = true;
        state.iteration++;
        break;
      }

      case EventTypes.PLAN_UPDATED: {
        state.status = TaskStatus.EXECUTING;
        // Keep completed steps, add new ones
        const completedSteps = state.plan
          ? state.plan.steps.filter((s) => s.status === 'completed')
          : [];
        const newSteps = (event.data?.steps || []).map((text) => ({
          text,
          status: 'pending',
        }));
        state.plan = {
          objective: event.data?.objective || state.plan?.objective || state.goal,
          steps: [...completedSteps, ...newSteps],
          isReplan: true,
          replanIndex: completedSteps.length,
        };
        state.currentStepIndex = completedSteps.length - 1;
        // Clear old evaluation
        state.evaluation = null;
        break;
      }

      case EventTypes.TASK_COMPLETED: {
        state.status = TaskStatus.COMPLETED;
        state.result = event.data?.result || event.data?.summary || 'Task completed.';
        // Mark all remaining plan steps as completed
        if (state.plan) {
          state.plan.steps.forEach((s) => {
            if (s.status !== 'failed') s.status = 'completed';
          });
        }
        break;
      }

      case EventTypes.TASK_FAILED: {
        state.status = TaskStatus.FAILED;
        state.error = {
          message: event.data?.reason || 'An unexpected error occurred.',
          actionsAttempted: state.events.filter((e) => e.type === 'action').length,
          replans: state.iteration,
        };
        break;
      }
    }

    notify();
  }

  /**
   * Reset the store to initial state.
   */
  function reset() {
    state = getInitialState();
    notify();
  }

  return {
    getState,
    subscribe,
    dispatch,
    reset,
  };
}

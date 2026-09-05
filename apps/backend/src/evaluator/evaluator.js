const { askNemotron } = require('../melo-core/nemotron');
const { validateSchema } = require('../utils/schemas');

async function evaluateGoal(taskId, goal, plan, observations, previousEvaluations, options = {}) {
  const isMock = process.env.MOCK_MODE === 'true';

  if (isMock) {
    return {
      task_id: taskId,
      status: observations.length > 2 ? 'pass' : 'incomplete',
      requirements_met: ["Mock goal progressed"],
      requirements_missing: observations.length > 2 ? [] : ["Need more actions"],
      reason: "Mock evaluation determined status based on observation count",
      recommended_action: observations.length > 2 ? null : "Keep exploring"
    };
  }

  const systemPrompt = `You are the MELO Evaluator. Determine if the user's goal has been met.
CRITICAL RULE 1: If the agent has collected sufficient verified information to answer the user's question or fulfill the goal, return 'pass'. DO NOT return 'incomplete' just because the agent hasn't 'communicated' the result.
CRITICAL RULE 2: Evaluate based on actual verified outcomes in observations, NOT plan intentions.
- Do not confuse "the plan says we will calculate X" with "a tool actually calculated X".
- Do not mark PASS if the required result is not present in verified observations.
- Artifact creation is ONLY successful if a tool observation explicitly confirms it.

RESPOND WITH ONLY A JSON OBJECT. No explanations, no reasoning, no chain of thought.
START YOUR EXACT RESPONSE WITH { AND END WITH }.
Return JSON:
\`\`\`json
{
  "task_id": "the-task-id",
  "status": "pass" | "incomplete" | "fail",
  "requirements_met": ["Requirement 1"],
  "requirements_missing": ["Requirement 2"],
  "reason": "Summary of why goal is met or not.",
  "recommended_action": "Next action if incomplete, or null"
}
\`\`\``;

  // Compact: only last evaluation + all observations (observations are already compact from observer)
  const lastEval = previousEvaluations.length > 0 
    ? previousEvaluations[previousEvaluations.length - 1] 
    : null;

  const userPrompt = `Task ID: ${taskId}
Goal: ${goal}
Plan steps: ${JSON.stringify(plan.steps)}
Observations from execution:
${JSON.stringify(observations, null, 2)}
${lastEval ? `Previous evaluation: ${lastEval.status} - ${lastEval.reason}` : ''}
Has the goal been fully met?`;

  const response = await askNemotron(systemPrompt, userPrompt, true, 0.2, {
    maxTokens: 1024,
    remainingBudgetMs: options.remainingBudgetMs,
    schemaValidator: (obj) => {
      obj.task_id = taskId;
      if (!['pass', 'incomplete', 'fail'].includes(obj.status)) {
        obj.status = 'incomplete';
      }
      return validateSchema('evaluation', obj);
    }
  });
  
  response.task_id = taskId;
  
  return response;
}

module.exports = { evaluateGoal };

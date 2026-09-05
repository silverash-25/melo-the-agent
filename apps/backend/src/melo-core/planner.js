const { askNemotron } = require('./nemotron');
const { validateSchema, getToolRegistry } = require('../utils/schemas');
const { v4: uuidv4 } = require('uuid');

async function createPlan(taskId, goal, options = {}) {
  const isMock = process.env.MOCK_MODE === 'true';
  if (isMock) {
    return {
      task_id: taskId,
      objective: "Mocked plan for: " + goal,
      steps: ["Mock Step 1: Research", "Mock Step 2: Implement"],
      status: "pending"
    };
  }
  
  const tools = getToolRegistry();
  
  const systemPrompt = `You are the MELO Autonomous Brain.
Your job is to create a COMPLETE, actionable plan to achieve the user's goal.

Available tools:
${JSON.stringify(tools, null, 2)}

PLANNING RULES:
1. Include ALL foreseeable steps needed to complete the goal. Do NOT create a 1-2 step plan when you can predict 4-6 steps.
2. Each step should map to one tool invocation.
3. Order steps by dependency — earlier steps should produce outputs that later steps consume.
4. For multi-step tasks like "create data, analyze it, write a report", include every step: write script → execute script → analyze results → generate report.
5. Be specific about which tool each step will use.

Produce a JSON object:
{
  "task_id": "the-task-id",
  "objective": "The goal description",
  "steps": ["Step 1: do X using tool_name", "Step 2: do Y using tool_name", "..."],
  "status": "pending"
}`;

  const userPrompt = `Task ID: ${taskId}\nGoal: ${goal}\nCreate a complete plan.`;

  const response = await askNemotron(systemPrompt, userPrompt, true, 0.2, {
    maxTokens: 2048,
    remainingBudgetMs: options.remainingBudgetMs,
    schemaValidator: (obj) => {
      obj.task_id = taskId;
      if (!obj.status) obj.status = 'pending';
      return validateSchema('plan', obj);
    }
  });
  
  return response;
}

async function getNextAction(taskId, goal, plan, observations, previousActions, options = {}) {
  const isMock = process.env.MOCK_MODE === 'true';
  if (isMock) {
    return {
      task_id: taskId,
      action_id: uuidv4(),
      action: "document_generate",
      reason: "Mock action to generate a document",
      parameters: {
        title: "Mock Document",
        content: "This is a mock document.",
        filename: "mock.md"
      }
    };
  }
  
  const tools = getToolRegistry();
  
  const systemPrompt = `You are the MELO Autonomous Brain.
Your job is to decide the single NEXT action to take to advance the plan.
Available tools:
${JSON.stringify(tools, null, 2)}

You must respond with a valid JSON object matching this exact schema:
\`\`\`json
{
  "task_id": "the-task-id",
  "action_id": "a-new-uuid",
  "action": "tool_name",
  "reason": "Brief user-facing explanation",
  "parameters": { "param1": "value1" }
}
\`\`\`
CRITICAL JSON RULE: When providing code (like Python scripts) in the "parameters" object, you MUST properly escape all newlines as \\n and double quotes as \\" within the JSON string. Do not use raw newlines or unescaped quotes inside string values.`;

  // Compact history: only last 3 observations, summarized previous actions
  const recentObs = observations.slice(-3);
  const actionSummary = previousActions.map(a => 
    `${a.metadata?.tool || a.action}: ${a.success ? 'success' : 'failed'}`
  );

  const userPrompt = `Task ID: ${taskId}
Goal: ${goal}
Plan: ${JSON.stringify(plan.steps)}
Completed actions: [${actionSummary.join(', ')}]
Recent observations:
${JSON.stringify(recentObs, null, 2)}
What is the next action?
Respond only with the raw JSON object.`;

  const response = await askNemotron(systemPrompt, userPrompt, true, 0.2, {
    maxTokens: 2048,
    remainingBudgetMs: options.remainingBudgetMs,
    schemaValidator: (obj) => {
      obj.task_id = taskId;
      obj.action_id = uuidv4();
      return validateSchema('action-request', obj);
    }
  });
  
  return response;
}

module.exports = {
  createPlan,
  getNextAction
};

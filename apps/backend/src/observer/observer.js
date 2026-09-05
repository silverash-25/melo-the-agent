const { validateSchema } = require('../utils/schemas');

function normalizeObservation(actionResult) {
  let summary = '';
  let issues = [];
  let quality = 1.0;
  let relevant = true;
  let complete = true;

  if (actionResult.success) {
    summary = `Tool ${actionResult.metadata.tool} executed successfully.`;
    if (actionResult.data && actionResult.data.result_count === 0) {
      summary += ' However, no results were found.';
      complete = false;
      quality = 0.5;
      issues.push('Zero results returned from tool');
    } else if (actionResult.data) {
      // Just take a stringified slice to not blow up memory
      summary += ` Output: ${JSON.stringify(actionResult.data).substring(0, 500)}`;
    }
  } else {
    summary = `Tool ${actionResult.metadata.tool} failed: ${actionResult.error}`;
    relevant = true;
    complete = false;
    quality = 0.0;
    issues.push(actionResult.error || 'Unknown error');
  }

  const observation = {
    task_id: actionResult.task_id,
    action_id: actionResult.action_id,
    summary,
    relevant,
    complete,
    quality,
    issues
  };

  return validateSchema('observation', observation);
}

module.exports = { normalizeObservation };

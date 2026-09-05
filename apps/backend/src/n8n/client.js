

async function executeAction(actionRequest) {
  const isMock = process.env.MOCK_MODE === 'true';

  if (isMock) {
    // Return a mock successful ActionResult
    return {
      task_id: actionRequest.task_id,
      action_id: actionRequest.action_id,
      success: true,
      data: { mock_result: `Mock execution of ${actionRequest.action} completed.` },
      error: null,
      metadata: {
        tool: actionRequest.action,
        execution_time_ms: 150,
        mocked: true
      }
    };
  }

  const webhookUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook-test/19818de0-d19a-45e9-b2a7-d7acf9c24e03';
  const start = Date.now();

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(actionRequest)
    });

    if (!res.ok) {
      let errorMsg = `n8n webhook returned ${res.status}`;
      try {
        const errorData = await res.json();
        if (errorData.message) errorMsg = errorData.message;
      } catch (e) {
        errorMsg = await res.text();
      }

      return {
        task_id: actionRequest.task_id,
        action_id: actionRequest.action_id,
        success: false,
        data: null,
        error: errorMsg,
        metadata: {
          tool: actionRequest.action,
          execution_time_ms: Date.now() - start
        }
      };
    }

    const data = await res.json();

    return {
      task_id: actionRequest.task_id,
      action_id: actionRequest.action_id,
      success: true,
      data: data,
      error: null,
      metadata: {
        tool: actionRequest.action,
        execution_time_ms: Date.now() - start
      }
    };
  } catch (error) {
    return {
      task_id: actionRequest.task_id,
      action_id: actionRequest.action_id,
      success: false,
      data: null,
      error: error.message,
      metadata: {
        tool: actionRequest.action,
        execution_time_ms: Date.now() - start
      }
    };
  }
}

module.exports = { executeAction };

/**
 * MELO API Client
 * 
 * REST client for the MELO backend.
 * Used to create tasks and fetch state.
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Create a new task with the given goal.
 * POST /api/tasks
 */
export async function createTask(goal) {
  try {
    const res = await fetch(`${API_BASE}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal }),
    });

    if (!res.ok) {
      throw new Error(`Server responded with ${res.status}: ${res.statusText}`);
    }

    return await res.json();
  } catch (err) {
    console.error('[ApiClient] createTask failed:', err);
    throw err;
  }
}

/**
 * Fetch current task state.
 * GET /api/tasks/:id
 */
export async function fetchTaskState(taskId) {
  try {
    const res = await fetch(`${API_BASE}/api/tasks/${taskId}`);

    if (!res.ok) {
      throw new Error(`Server responded with ${res.status}: ${res.statusText}`);
    }

    return await res.json();
  } catch (err) {
    console.error('[ApiClient] fetchTaskState failed:', err);
    throw err;
  }
}

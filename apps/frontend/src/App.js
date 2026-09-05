/**
 * MELO App Controller
 * 
 * Manages view state (input vs execution), wires
 * store subscriptions to component updates.
 */
import { createTaskStore } from './state/TaskStore.js';
import { createEventSource } from './services/EventService.js';
import { createTask } from './services/ApiClient.js';
import { TaskStatus, EventTypes } from './state/EventTypes.js';

// Components
import { renderHeader } from './components/Header.js';
import { renderGoalInput } from './components/GoalInput.js';
import { renderTaskHeader, updateTaskHeader } from './components/TaskHeader.js';
import { renderStatusPipeline, updateStatusPipeline } from './components/StatusPipeline.js';
import { renderPlanViewer, updatePlanViewer } from './components/PlanViewer.js';
import { renderActivityTimeline, updateActivityTimeline, resetTimeline } from './components/ActivityTimeline.js';
import { renderToolActivity, updateToolActivity } from './components/ToolActivity.js';
import { renderEvaluationPanel, updateEvaluationPanel } from './components/EvaluationPanel.js';
import { renderResultPanel, updateResultPanel } from './components/ResultPanel.js';
import { renderErrorPanel, updateErrorPanel } from './components/ErrorPanel.js';

/**
 * Initialize the MELO app.
 * @param {HTMLElement} root - #app element
 */
export function initApp(root) {
  const store = createTaskStore();
  let eventSource = null;

  // Determine mode: use 'sse' unless ?mode=mock or ?mode=polling
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode') || 'sse';

  // API base URL from environment
  const apiBase = import.meta.env.VITE_API_URL || '';

  // ── Render Header (always visible) ──
  renderHeader(root, { mode });

  // ── Content area ──
  const content = document.createElement('div');
  content.id = 'app-content';
  content.style.flex = '1';
  content.style.display = 'flex';
  content.style.flexDirection = 'column';
  root.appendChild(content);

  // ── Show Goal Input Screen ──
  showGoalScreen(content, store, mode);

  /**
   * Handle goal submission.
   * In mock mode: creates a mock event stream immediately.
   * In sse/polling mode: calls POST /api/tasks first, then subscribes to events.
   */
  async function handleGoalSubmit(goal, contentEl, taskStore, eventMode) {
    // Clean up event source if any
    if (eventSource) {
      eventSource.stop();
    }
    taskStore.reset();
    resetTimeline();

    // Switch to execution view
    contentEl.innerHTML = '';
    renderExecutionView(contentEl, taskStore);

    // Subscribe store to UI updates
    taskStore.subscribe((state) => {
      updateTaskHeader(state);
      updateStatusPipeline(state);
      updatePlanViewer(state);
      updateActivityTimeline(state);
      updateToolActivity(state);
      updateEvaluationPanel(state);
      updateResultPanel(state);
      updateErrorPanel(state);
    });

    // Resolve taskId: in real modes, create the task via API first
    let taskId = null;

    if (eventMode === 'mock') {
      taskId = null; // Mock stream generates its own task_id
    } else {
      // Real backend: POST /api/tasks to create the task
      try {
        const result = await createTask(goal);
        taskId = result.task_id;
      } catch (err) {
        // Backend unavailable — show error state
        taskStore.dispatch({
          event: EventTypes.TASK_FAILED,
          data: {
            reason: `Backend unavailable: ${err.message}. Is the MELO backend running at ${apiBase || 'localhost:3000'}?`,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }
    }

    // Create event source and start
    eventSource = createEventSource(eventMode, (event) => {
      taskStore.dispatch(event);
    }, { goal, taskId, apiBase });

    eventSource.start();
  }

  function showGoalScreen(contentEl, taskStore, eventMode) {
    contentEl.innerHTML = '';
    renderGoalInput(contentEl, (goal) => {
      handleGoalSubmit(goal, contentEl, taskStore, eventMode);
    });
  }

  // Expose reset for retry
  function handleRetry() {
    if (eventSource) {
      eventSource.stop();
      eventSource = null;
    }
    store.reset();
    resetTimeline();
    showGoalScreen(content, store, mode);
  }

  /**
   * Render the execution dashboard layout.
   */
  function renderExecutionView(contentEl, taskStore) {
    const view = document.createElement('div');
    view.className = 'execution-view';

    // Task Header
    renderTaskHeader(view);

    // Status Pipeline
    renderStatusPipeline(view);

    // Two-column content
    const grid = document.createElement('div');
    grid.className = 'execution-content';

    // Left column: Plan + Tool + Evaluation
    const left = document.createElement('div');
    left.className = 'execution-left';
    renderPlanViewer(left);
    renderToolActivity(left);
    renderEvaluationPanel(left);
    grid.appendChild(left);

    // Right column: Activity Timeline
    const right = document.createElement('div');
    right.className = 'execution-right';
    renderActivityTimeline(right);
    grid.appendChild(right);

    view.appendChild(grid);

    // Result Panel (below grid, shown on completion)
    renderResultPanel(view);

    // Error Panel (below grid, shown on failure)
    renderErrorPanel(view, handleRetry);

    contentEl.appendChild(view);
  }
}

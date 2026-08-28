/**
 * MELO Task Header Component
 * 
 * Shows: goal, status badge, elapsed time, iteration count.
 */
import { TaskStatus } from '../state/EventTypes.js';

let timerInterval = null;

/**
 * @param {HTMLElement} container
 */
export function renderTaskHeader(container) {
  const el = document.createElement('div');
  el.className = 'task-header';
  el.id = 'task-header';
  el.innerHTML = `
    <div class="task-header__goal">
      <div class="task-header__label">Goal</div>
      <div class="task-header__goal-text" id="task-goal-text">—</div>
    </div>
    <div class="task-header__meta">
      <span class="task-header__badge task-header__badge--running" id="task-status-badge">
        INITIALIZING
      </span>
      <span class="task-header__timer" id="task-timer">00:00</span>
      <span class="task-header__iteration" id="task-iteration"></span>
    </div>
  `;
  container.appendChild(el);
  return el;
}

/**
 * Update the task header with new state.
 * @param {Object} state
 */
export function updateTaskHeader(state) {
  const goalText = document.getElementById('task-goal-text');
  const badge = document.getElementById('task-status-badge');
  const timer = document.getElementById('task-timer');
  const iteration = document.getElementById('task-iteration');

  if (!goalText) return;

  goalText.textContent = state.goal || '—';

  // Status badge
  const { label, className } = getStatusBadge(state.status);
  badge.textContent = label;
  badge.className = `task-header__badge ${className}`;

  // Iteration
  if (state.iteration > 0) {
    iteration.textContent = `Iteration ${state.iteration + 1}`;
  }

  // Timer
  if (state.startedAt && !timerInterval) {
    startTimer(state.startedAt, timer);
  }
  if (state.status === TaskStatus.COMPLETED || state.status === TaskStatus.FAILED) {
    stopTimer();
  }
}

function getStatusBadge(status) {
  switch (status) {
    case TaskStatus.CREATED:    return { label: '● CREATED', className: 'task-header__badge--running' };
    case TaskStatus.PLANNING:   return { label: '● PLANNING', className: 'task-header__badge--running' };
    case TaskStatus.EXECUTING:  return { label: '⚡ EXECUTING', className: 'task-header__badge--running' };
    case TaskStatus.OBSERVING:  return { label: '👁 OBSERVING', className: 'task-header__badge--running' };
    case TaskStatus.EVALUATING: return { label: '✓ EVALUATING', className: 'task-header__badge--running' };
    case TaskStatus.REPLANNING: return { label: '⟳ REPLANNING', className: 'task-header__badge--replanning' };
    case TaskStatus.COMPLETED:  return { label: '✓ COMPLETED', className: 'task-header__badge--completed' };
    case TaskStatus.FAILED:     return { label: '✗ FAILED', className: 'task-header__badge--failed' };
    default:                    return { label: '○ IDLE', className: 'task-header__badge--running' };
  }
}

function startTimer(startedAt, timerEl) {
  const start = new Date(startedAt).getTime();
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - start) / 1000);
    const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const secs = String(elapsed % 60).padStart(2, '0');
    timerEl.textContent = `${mins}:${secs}`;
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

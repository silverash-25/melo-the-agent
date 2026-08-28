/**
 * MELO Result Panel Component
 * 
 * Final result display with success animation and completion stats.
 */

/**
 * @param {HTMLElement} container
 */
export function renderResultPanel(container) {
  const el = document.createElement('div');
  el.id = 'result-panel-wrap';
  el.style.display = 'none';
  container.appendChild(el);
  return el;
}

/**
 * Show the result panel with the final output.
 */
export function updateResultPanel(state) {
  const wrap = document.getElementById('result-panel-wrap');
  if (!wrap) return;

  if (state.status !== 'completed' || !state.result) {
    wrap.style.display = 'none';
    return;
  }

  wrap.style.display = 'block';

  // Calculate stats
  const elapsed = state.startedAt
    ? formatElapsed(new Date(state.startedAt), new Date())
    : '--';
  const actions = state.events.filter((e) => e.type === 'action').length;
  const replans = state.iteration;

  wrap.innerHTML = `
    <div class="result-panel">
      <div class="result-panel__card">
        <div class="result-panel__header">
          <span class="result-panel__badge">✓ COMPLETED</span>
          <span class="result-panel__title">Final Result</span>
        </div>
        <div class="result-panel__body">${escapeHtml(state.result)}</div>
        <div class="result-panel__stats">
          <div class="result-stat">
            <div class="result-stat__value">${elapsed}</div>
            <div class="result-stat__label">Duration</div>
          </div>
          <div class="result-stat">
            <div class="result-stat__value">${actions}</div>
            <div class="result-stat__label">Actions</div>
          </div>
          <div class="result-stat">
            <div class="result-stat__value">${replans}</div>
            <div class="result-stat__label">Replans</div>
          </div>
          <div class="result-stat">
            <div class="result-stat__value">${state.iteration + 1}</div>
            <div class="result-stat__label">Iterations</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function formatElapsed(start, end) {
  const secs = Math.floor((end - start) / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const remainSecs = secs % 60;
  return `${mins}m ${remainSecs}s`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

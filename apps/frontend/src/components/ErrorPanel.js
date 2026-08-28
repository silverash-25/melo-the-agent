/**
 * MELO Error Panel Component
 * 
 * Displays error state with message, stats, and retry action.
 */

/**
 * @param {HTMLElement} container
 * @param {Function} onRetry - Called when retry button is clicked
 */
export function renderErrorPanel(container, onRetry) {
  const el = document.createElement('div');
  el.id = 'error-panel-wrap';
  el.style.display = 'none';
  el._onRetry = onRetry;
  container.appendChild(el);
  return el;
}

/**
 * Show/hide error panel based on state.
 */
export function updateErrorPanel(state) {
  const wrap = document.getElementById('error-panel-wrap');
  if (!wrap) return;

  if (state.status !== 'failed' || !state.error) {
    wrap.style.display = 'none';
    return;
  }

  wrap.style.display = 'block';

  const { message, actionsAttempted, replans } = state.error;

  wrap.innerHTML = `
    <div class="error-panel">
      <div class="error-panel__card">
        <div class="error-panel__icon">⚠️</div>
        <h2 class="error-panel__title">MELO couldn't complete the task</h2>
        <p class="error-panel__message">${escapeHtml(message)}</p>
        <div class="error-panel__stats">
          <div class="result-stat">
            <div class="result-stat__value" style="color: var(--crimson);">${actionsAttempted}</div>
            <div class="result-stat__label">Actions Attempted</div>
          </div>
          <div class="result-stat">
            <div class="result-stat__value" style="color: var(--crimson);">${replans}</div>
            <div class="result-stat__label">Replans</div>
          </div>
        </div>
        <button class="error-panel__retry" id="error-retry-btn">Try Again</button>
      </div>
    </div>
  `;

  const retryBtn = wrap.querySelector('#error-retry-btn');
  if (retryBtn && wrap._onRetry) {
    retryBtn.addEventListener('click', wrap._onRetry);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

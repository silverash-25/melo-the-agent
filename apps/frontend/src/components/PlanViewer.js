/**
 * MELO Plan Viewer Component
 * 
 * Vertical step list showing plan progress.
 * Distinguishes original plan from replan additions.
 */

/**
 * @param {HTMLElement} container
 */
export function renderPlanViewer(container) {
  const el = document.createElement('div');
  el.className = 'panel';
  el.id = 'plan-viewer';
  el.innerHTML = `
    <div class="panel__title">
      <span class="panel__title-icon">📋</span>
      CURRENT PLAN
    </div>
    <div id="plan-steps">
      <div class="empty-state">Waiting for plan...</div>
    </div>
  `;
  container.appendChild(el);
  return el;
}

/**
 * Update plan viewer with current state.
 */
export function updatePlanViewer(state) {
  const stepsContainer = document.getElementById('plan-steps');
  if (!stepsContainer || !state.plan) return;

  const { steps, replanIndex } = state.plan;

  let html = '';

  steps.forEach((step, i) => {
    // Insert replan divider if applicable
    if (state.plan.isReplan && replanIndex !== undefined && i === replanIndex) {
      html += `<div class="plan-replan-divider">⟳ Replanned</div>`;
    }

    const statusClass = `plan-step--${step.status}`;
    const icon = getStepIcon(step.status);

    html += `
      <div class="plan-step ${statusClass}">
        <span class="plan-step__indicator">${icon}</span>
        <span class="plan-step__text">${escapeHtml(step.text)}</span>
      </div>
    `;
  });

  stepsContainer.innerHTML = html;
}

function getStepIcon(status) {
  switch (status) {
    case 'completed': return '✓';
    case 'active':    return '→';
    case 'failed':    return '✗';
    case 'pending':
    default:          return '○';
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

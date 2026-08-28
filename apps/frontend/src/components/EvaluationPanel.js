/**
 * MELO Evaluation Panel Component
 * 
 * Shows evaluation checklist (met/missing), status badge,
 * reason, and replanning indicator.
 */

/**
 * @param {HTMLElement} container
 */
export function renderEvaluationPanel(container) {
  const el = document.createElement('div');
  el.className = 'panel';
  el.id = 'evaluation-panel';
  el.innerHTML = `
    <div class="panel__title">
      <span class="panel__title-icon">✓</span>
      EVALUATION
    </div>
    <div id="eval-content">
      <div class="empty-state">No evaluation yet</div>
    </div>
  `;
  container.appendChild(el);
  return el;
}

/**
 * Update evaluation panel with current state.
 */
export function updateEvaluationPanel(state) {
  const container = document.getElementById('eval-content');
  if (!container) return;

  // Show evaluating state
  if (state.status === 'evaluating' && !state.evaluation) {
    container.innerHTML = `
      <div style="display: flex; align-items: center; gap: var(--sp-3); color: var(--text-secondary);">
        <span class="tool-spinner"></span>
        MELO is checking whether the collected information satisfies the goal...
      </div>
    `;
    return;
  }

  if (!state.evaluation) return;

  const { status, requirements_met, requirements_missing, reason } = state.evaluation;

  let html = '';

  // Requirements checklist
  if (requirements_met.length > 0 || requirements_missing.length > 0) {
    html += '<div style="margin-bottom: var(--sp-3);">';

    requirements_met.forEach((req) => {
      html += `
        <div class="eval-requirement">
          <span class="eval-requirement__icon--met">✓</span>
          <span class="eval-requirement__text">${escapeHtml(req)}</span>
        </div>
      `;
    });

    requirements_missing.forEach((req) => {
      html += `
        <div class="eval-requirement">
          <span class="eval-requirement__icon--missing">✗</span>
          <span class="eval-requirement__text">${escapeHtml(req)}</span>
        </div>
      `;
    });

    html += '</div>';
  }

  // Status badge
  const badgeClass = `eval-status-badge--${status}`;
  const badgeLabel = status.toUpperCase();
  html += `<div class="eval-status-badge ${badgeClass}">${badgeLabel}</div>`;

  // Reason
  if (reason) {
    html += `<div class="eval-reason">${escapeHtml(reason)}</div>`;
  }

  // Replanning indicator
  if (state.status === 'replanning') {
    html += `
      <div class="eval-replanning">
        <span class="tool-spinner" style="border-top-color: var(--amber);"></span>
        MELO is replanning to address gaps...
      </div>
    `;
  }

  container.innerHTML = html;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * MELO Tool Activity Component
 * 
 * Shows current/last tool invocation with icon, name, status, and result.
 */

const TOOL_ICONS = {
  web_search: '🔎',
  read_pdf: '📄',
  analyze_requirements: '🧠',
  generate_code: '💻',
  file_operation: '📁',
  api_call: '🌐',
  default: '⚙️',
};

/**
 * @param {HTMLElement} container
 */
export function renderToolActivity(container) {
  const el = document.createElement('div');
  el.className = 'panel';
  el.id = 'tool-activity';
  el.innerHTML = `
    <div class="panel__title">
      <span class="panel__title-icon">⚙️</span>
      TOOL ACTIVITY
    </div>
    <div id="tool-card-container">
      <div class="empty-state">No tools active</div>
    </div>
  `;
  container.appendChild(el);
  return el;
}

/**
 * Update tool activity display.
 */
export function updateToolActivity(state) {
  const container = document.getElementById('tool-card-container');
  if (!container) return;

  const action = state.currentAction;
  if (!action) return;

  const icon = TOOL_ICONS[action.action] || TOOL_ICONS.default;
  const statusClass = `tool-card__status--${action.status}`;
  const statusText = getStatusText(action);
  const detail = getDetail(action);

  container.innerHTML = `
    <div class="tool-card">
      <div class="tool-card__icon">${icon}</div>
      <div class="tool-card__info">
        <div class="tool-card__name">${formatToolName(action.action)}</div>
        <div class="tool-card__status ${statusClass}">
          ${action.status === 'running' ? '<span class="tool-spinner"></span>' : ''}
          ${statusText}
        </div>
        ${detail ? `<div class="tool-card__detail">${detail}</div>` : ''}
      </div>
    </div>
  `;
}

function getStatusText(action) {
  switch (action.status) {
    case 'running':   return 'Running...';
    case 'completed': return 'Completed';
    case 'failed':    return 'Failed';
    default:          return action.status;
  }
}

function getDetail(action) {
  if (!action.result) {
    return action.reason || '';
  }
  const data = action.result;
  if (data.summary) return data.summary;
  if (data.data?.result_count) return `${data.data.result_count} results received`;
  if (data.data?.verified_count) return `${data.data.verified_count} prices verified`;
  if (data.error) return `Error: ${data.error}`;
  return '';
}

function formatToolName(action) {
  return (action || 'unknown')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

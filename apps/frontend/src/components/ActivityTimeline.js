/**
 * MELO Activity Timeline Component
 * 
 * Chronological event feed with color-coded borders,
 * timestamps, and source labels. New events slide in.
 */

/**
 * @param {HTMLElement} container
 */
export function renderActivityTimeline(container) {
  const el = document.createElement('div');
  el.className = 'panel';
  el.id = 'activity-timeline';
  el.style.flex = '1';
  el.style.overflowY = 'auto';
  el.innerHTML = `
    <div class="panel__title">
      <span class="panel__title-icon">📡</span>
      LIVE ACTIVITY
    </div>
    <div id="timeline-entries">
      <div class="empty-state">Waiting for events...</div>
    </div>
  `;
  container.appendChild(el);
  return el;
}

let lastEventCount = 0;

/**
 * Update timeline with new events from state.
 */
export function updateActivityTimeline(state) {
  const entriesContainer = document.getElementById('timeline-entries');
  if (!entriesContainer) return;

  const events = state.events || [];

  // Only render new events (append, don't re-render all)
  if (events.length === 0) return;

  if (events.length > lastEventCount || lastEventCount === 0) {
    // First render or new events
    if (lastEventCount === 0 && events.length > 0) {
      entriesContainer.innerHTML = '';
    }

    const newEvents = events.slice(lastEventCount);
    newEvents.forEach((evt) => {
      const entry = createTimelineEntry(evt);
      entriesContainer.appendChild(entry);
    });

    lastEventCount = events.length;

    // Auto-scroll to bottom
    const parent = entriesContainer.closest('#activity-timeline');
    if (parent) {
      parent.scrollTop = parent.scrollHeight;
    }
  }
}

/**
 * Reset the timeline for a new task.
 */
export function resetTimeline() {
  lastEventCount = 0;
  const entriesContainer = document.getElementById('timeline-entries');
  if (entriesContainer) {
    entriesContainer.innerHTML = '<div class="empty-state">Waiting for events...</div>';
  }
}

function createTimelineEntry(evt) {
  const el = document.createElement('div');
  el.className = `timeline-entry timeline-entry--${evt.type} anim-slide-in-top`;

  const time = formatTime(evt.timestamp);
  const sourceClass = getSourceClass(evt.source);
  const sourceLabel = getSourceLabel(evt.source);

  el.innerHTML = `
    <span class="timeline-entry__time">${time}</span>
    <div class="timeline-entry__content">
      <div class="timeline-entry__source ${sourceClass}">${sourceLabel}</div>
      <div class="timeline-entry__message">${escapeHtml(evt.message)}</div>
    </div>
  `;

  return el;
}

function formatTime(isoString) {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '--:--:--';
  }
}

function getSourceClass(source) {
  switch (source) {
    case 'melo':   return 'timeline-entry__source--melo';
    case 'tool':   return 'timeline-entry__source--tool';
    case 'eval':   return 'timeline-entry__source--eval';
    case 'system': return 'timeline-entry__source--system';
    default:       return '';
  }
}

function getSourceLabel(source) {
  switch (source) {
    case 'melo':   return 'MELO';
    case 'tool':   return 'TOOL';
    case 'eval':   return 'EVALUATOR';
    case 'system': return 'SYSTEM';
    default:       return source?.toUpperCase() || 'SYSTEM';
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

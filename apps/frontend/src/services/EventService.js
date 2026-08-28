/**
 * MELO Event Service
 * 
 * Abstraction over event sources (Mock, SSE, Polling).
 * All sources emit the same normalized event interface:
 *   { event: string, data: object, timestamp: string }
 */
import { createMockEventStream } from '../mock/MockEventStream.js';

/**
 * Factory: create the right event source.
 * 
 * @param {'mock' | 'sse' | 'polling'} mode
 * @param {Function} onEvent - Called with each event object
 * @param {Object} [options]
 * @param {string} [options.taskId]
 * @param {string} [options.goal]
 * @param {string} [options.apiBase]
 * @returns {{ start: Function, stop: Function }}
 */
export function createEventSource(mode, onEvent, options = {}) {
  switch (mode) {
    case 'sse':
      return createSSESource(onEvent, options);
    case 'polling':
      return createPollingSource(onEvent, options);
    case 'mock':
    default:
      return createMockEventStream(onEvent, options.goal);
  }
}

/**
 * SSE Event Source — connects to /api/tasks/:id/events
 */
function createSSESource(onEvent, { taskId, apiBase = '' }) {
  let eventSource = null;

  function start() {
    const url = `${apiBase}/api/tasks/${taskId}/events`;
    eventSource = new EventSource(url);

    eventSource.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data);
        onEvent(event);
      } catch (err) {
        console.error('[SSE] Failed to parse event:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('[SSE] Connection error:', err);
    };
  }

  function stop() {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  }

  return { start, stop };
}

/**
 * Polling Event Source — polls GET /api/tasks/:id every 2s
 */
function createPollingSource(onEvent, { taskId, apiBase = '' }) {
  let interval = null;
  let lastEventCount = 0;

  function start() {
    interval = setInterval(async () => {
      try {
        const res = await fetch(`${apiBase}/api/tasks/${taskId}`);
        if (!res.ok) return;
        const data = await res.json();

        // Emit any new events since last poll
        const events = data.events || [];
        const newEvents = events.slice(lastEventCount);
        lastEventCount = events.length;

        newEvents.forEach((evt) => onEvent(evt));
      } catch (err) {
        console.error('[Polling] Error:', err);
      }
    }, 2000);
  }

  function stop() {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
  }

  return { start, stop };
}

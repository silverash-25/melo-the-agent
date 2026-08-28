/**
 * MELO Mock Event Stream
 * 
 * Replays a realistic mock scenario with timed events.
 * Used for development and demos before the real backend is ready.
 */
import { createMockScenario } from './mockData.js';

/**
 * Creates a mock event stream that plays events with realistic timing.
 * @param {Function} onEvent - Callback called with each event object
 * @param {string} [goal] - Optional custom goal text
 * @returns {{ start: Function, stop: Function, isRunning: Function }}
 */
export function createMockEventStream(onEvent, goal) {
  const scenario = createMockScenario(goal);
  let timeouts = [];
  let running = false;

  function start() {
    if (running) return;
    running = true;

    let cumulativeDelay = 0;

    scenario.forEach((entry) => {
      cumulativeDelay += entry.delay;

      const timeout = setTimeout(() => {
        if (!running) return;
        onEvent({
          event: entry.event,
          data: entry.data,
          timestamp: new Date().toISOString(),
        });
      }, cumulativeDelay);

      timeouts.push(timeout);
    });
  }

  function stop() {
    running = false;
    timeouts.forEach(clearTimeout);
    timeouts = [];
  }

  function isRunning() {
    return running;
  }

  return { start, stop, isRunning };
}

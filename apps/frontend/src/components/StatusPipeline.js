/**
 * MELO Status Pipeline Component
 * 
 * THE CENTERPIECE. Horizontal pipeline showing the MELO autonomous loop:
 * Goal → Plan → Execute → Observe → Evaluate → [Done / Replan↩]
 * 
 * Each stage lights up based on current task status.
 * The replan transition is the dramatic demo moment.
 */
import { TaskStatus, PipelineStages } from '../state/EventTypes.js';

/**
 * @param {HTMLElement} container
 */
export function renderStatusPipeline(container) {
  const el = document.createElement('div');
  el.className = 'status-pipeline';
  el.id = 'status-pipeline';

  let html = '<div class="status-pipeline__track">';

  PipelineStages.forEach((stage, i) => {
    if (i > 0) {
      html += `<div class="pipeline-connector" id="pipeline-conn-${i}"></div>`;
    }
    html += `
      <div class="pipeline-node" id="pipeline-node-${stage.id}">
        <div class="pipeline-node__circle">${stage.icon}</div>
        <span class="pipeline-node__label">${stage.label}</span>
        <div class="pipeline-replan-arrow" id="pipeline-replan-arrow">⟳ REPLAN</div>
      </div>
    `;
  });

  html += '</div>';
  el.innerHTML = html;
  container.appendChild(el);
  return el;
}

/**
 * Update pipeline node states based on task status.
 */
export function updateStatusPipeline(state) {
  const stageStates = getStageStates(state);

  PipelineStages.forEach((stage, i) => {
    const node = document.getElementById(`pipeline-node-${stage.id}`);
    if (!node) return;

    // Remove all state classes
    node.classList.remove(
      'pipeline-node--completed',
      'pipeline-node--active',
      'pipeline-node--failed',
      'pipeline-node--replanning',
    );

    // Apply new state
    const nodeState = stageStates[stage.id];
    if (nodeState) {
      node.classList.add(`pipeline-node--${nodeState}`);
    }

    // Update connector
    if (i > 0) {
      const conn = document.getElementById(`pipeline-conn-${i}`);
      if (conn) {
        conn.classList.remove('pipeline-connector--active', 'pipeline-connector--completed');
        if (nodeState === 'completed') conn.classList.add('pipeline-connector--completed');
        else if (nodeState === 'active') conn.classList.add('pipeline-connector--active');
      }
    }
  });

  // Replan arrow
  const replanArrow = document.getElementById('pipeline-replan-arrow');
  if (replanArrow) {
    if (state.status === TaskStatus.REPLANNING) {
      replanArrow.classList.add('pipeline-replan-arrow--visible');
      // Trigger shake animation on the entire pipeline
      const pipeline = document.getElementById('status-pipeline');
      if (pipeline) {
        pipeline.classList.add('anim-replan-shake');
        setTimeout(() => pipeline.classList.remove('anim-replan-shake'), 700);
      }
    } else if (state.replanned && state.status !== TaskStatus.REPLANNING) {
      // Keep visible but stop animation after replanning is done
      replanArrow.classList.add('pipeline-replan-arrow--visible');
    }
  }
}

/**
 * Map task status to pipeline stage states.
 */
function getStageStates(state) {
  const status = state.status;
  const stages = {};

  switch (status) {
    case TaskStatus.IDLE:
      break;

    case TaskStatus.CREATED:
      stages.goal = 'active';
      break;

    case TaskStatus.PLANNING:
      stages.goal = 'completed';
      stages.plan = 'active';
      break;

    case TaskStatus.EXECUTING:
      stages.goal = 'completed';
      stages.plan = 'completed';
      stages.execute = 'active';
      break;

    case TaskStatus.OBSERVING:
      stages.goal = 'completed';
      stages.plan = 'completed';
      stages.execute = 'completed';
      stages.observe = 'active';
      break;

    case TaskStatus.EVALUATING:
      stages.goal = 'completed';
      stages.plan = 'completed';
      stages.execute = 'completed';
      stages.observe = 'completed';
      stages.evaluate = 'active';
      break;

    case TaskStatus.REPLANNING:
      stages.goal = 'completed';
      stages.plan = 'completed';
      stages.execute = 'completed';
      stages.observe = 'completed';
      stages.evaluate = 'replanning';
      break;

    case TaskStatus.COMPLETED:
      stages.goal = 'completed';
      stages.plan = 'completed';
      stages.execute = 'completed';
      stages.observe = 'completed';
      stages.evaluate = 'completed';
      stages.done = 'completed';
      break;

    case TaskStatus.FAILED:
      stages.goal = 'completed';
      stages.plan = 'completed';
      stages.execute = 'failed';
      break;
  }

  return stages;
}

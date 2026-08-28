/**
 * MELO Event Types
 * Mirrors shared/events/events.json as JS constants.
 */
export const EventTypes = Object.freeze({
  TASK_CREATED:         'task.created',
  PLAN_CREATED:         'plan.created',
  ACTION_STARTED:       'action.started',
  ACTION_COMPLETED:     'action.completed',
  OBSERVATION_RECEIVED: 'observation.received',
  EVALUATION_STARTED:   'evaluation.started',
  EVALUATION_COMPLETED: 'evaluation.completed',
  REPLAN_STARTED:       'replan.started',
  PLAN_UPDATED:         'plan.updated',
  TASK_COMPLETED:       'task.completed',
  TASK_FAILED:          'task.failed',
});

/**
 * Task status values
 */
export const TaskStatus = Object.freeze({
  IDLE:        'idle',
  CREATED:     'created',
  PLANNING:    'planning',
  EXECUTING:   'executing',
  OBSERVING:   'observing',
  EVALUATING:  'evaluating',
  REPLANNING:  'replanning',
  COMPLETED:   'completed',
  FAILED:      'failed',
});

/**
 * Pipeline stages for the StatusPipeline component
 */
export const PipelineStages = Object.freeze([
  { id: 'goal',     label: 'Goal',     icon: '🎯' },
  { id: 'plan',     label: 'Plan',     icon: '📋' },
  { id: 'execute',  label: 'Execute',  icon: '⚡' },
  { id: 'observe',  label: 'Observe',  icon: '👁' },
  { id: 'evaluate', label: 'Evaluate', icon: '✓' },
  { id: 'done',     label: 'Done',     icon: '✦' },
]);

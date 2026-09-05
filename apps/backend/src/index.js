require('dotenv').config({ path: '../../.env' });
const express = require('express');
const cors = require('cors');
const { orchestrator } = require('./melo-core/orchestrator');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.post('/api/tasks', async (req, res) => {
  try {
    const { goal } = req.body;
    if (!goal) {
      return res.status(400).json({ error: 'Goal is required' });
    }
    const taskId = await orchestrator.startTask(goal);
    res.json({ task_id: taskId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tasks/:task_id', (req, res) => {
  const task = orchestrator.getTaskState(req.params.task_id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  // Return frontend-expected task state
  res.json({
    task_id: task.taskId,
    goal: task.goal,
    status: task.status,
    events: task.events
  });
});

app.get('/api/tasks/:task_id/events', (req, res) => {
  const { task_id } = req.params;
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send past events immediately
  const task = orchestrator.getTaskState(task_id);
  if (task) {
    for (const event of task.events) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
  }

  // Listen for new events
  const listener = (payload) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  orchestrator.on(`task-${task_id}`, listener);

  req.on('close', () => {
    orchestrator.off(`task-${task_id}`, listener);
  });
});

app.listen(PORT, () => {
  console.log(`MELO Backend running on port ${PORT}`);
  console.log(`MOCK_MODE: ${process.env.MOCK_MODE === 'true'}`);
});

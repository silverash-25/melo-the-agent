# MELO Frontend — Autonomous Intelligence Command Center

> **Status: FROZEN / INTEGRATION READY**
>
> The UI is locked. Do not add features or redesign unless an integration
> requirement makes it strictly necessary.

---

## Quick Start

```bash
cd apps/frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) — the mock demo runs with no backend.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | *(empty — uses Vite proxy to localhost:3000)* | Backend API base URL |

Create a `.env` file in `apps/frontend/`:
```
VITE_API_URL=http://localhost:3000
```

---

## Modes

| URL | Mode | Backend Required |
|-----|------|-----------------|
| `http://localhost:5173` | Mock (default) | No |
| `http://localhost:5173?mode=sse` | Server-Sent Events | Yes |
| `http://localhost:5173?mode=polling` | REST polling (2s) | Yes |

Switching from mock to real backend requires **zero code changes** — just change the URL parameter and ensure the backend is running.

---

## Component Architecture

```
src/
├── main.js                  # Entry point (imports styles, boots App)
├── App.js                   # Controller (view transitions, event wiring)
├── styles/
│   ├── reset.css            # CSS reset
│   ├── tokens.css           # Design tokens (colors, typography, spacing)
│   ├── animations.css       # Keyframes (event-driven, not hardcoded)
│   └── main.css             # Component styles + responsive layout
├── state/
│   ├── EventTypes.js        # Event constants (mirrors shared/events/events.json)
│   └── TaskStore.js         # Reactive pub/sub store
├── services/
│   ├── EventService.js      # Event source factory (Mock / SSE / Polling)
│   └── ApiClient.js         # REST client (POST /api/tasks, GET /api/tasks/:id)
├── mock/
│   ├── MockEventStream.js   # Timed event replay (isolated from UI)
│   └── mockData.js          # Demo scenario payloads
└── components/
    ├── Header.js            # MELO branding bar + connection status
    ├── GoalInput.js         # Goal entry screen
    ├── TaskHeader.js        # Goal + status badge + elapsed timer
    ├── StatusPipeline.js    # Horizontal pipeline (Goal→Plan→Execute→Observe→Evaluate→Done)
    ├── PlanViewer.js        # Plan steps with replan divider
    ├── ActivityTimeline.js  # Live event feed
    ├── ToolActivity.js      # Current tool card
    ├── EvaluationPanel.js   # Requirements checklist + status badge
    ├── ResultPanel.js       # Final result with completion stats
    └── ErrorPanel.js        # Error state with retry
```

---

## Data Flow

```
EventSource (Mock / SSE / Polling)
       │
       ▼
   onEvent({ event, data, timestamp })
       │
       ▼
   TaskStore.dispatch(event)
       │
       ▼
   State updated → notify()
       │
       ▼
   All subscribed components re-render
```

**Key invariant:** UI components never import mock data. `EventService` is the sole abstraction layer. Components receive state from `TaskStore` and render it.

---

## Event Architecture

11 event types from `shared/events/events.json`:

| Event | UI Effect |
|-------|-----------|
| `task.created` | Goal shown, timer starts |
| `plan.created` | Plan steps appear, pipeline advances |
| `action.started` | Tool card shows running, plan step highlights |
| `action.completed` | Tool card shows result, step completes |
| `observation.received` | Timeline entry added |
| `evaluation.started` | Evaluation panel shows spinner |
| `evaluation.completed` | Requirements checklist rendered |
| `replan.started` | **Pipeline shakes**, amber glow |
| `plan.updated` | New steps with "⟳ Replanned" divider |
| `task.completed` | Result panel slides in |
| `task.failed` | Error panel with retry |

All events use the same wire format:
```json
{ "event": "task.created", "data": { ... }, "timestamp": "2026-08-28T18:15:30Z" }
```

---

## Task State Structure

```javascript
{
  taskId, goal, status,         // Core identity
  plan,                         // { objective, steps[], isReplan, replanIndex }
  currentStepIndex,             // Active plan step index
  events[],                     // Timeline entries (presentation)
  currentAction,                // { action_id, action, reason, status, result }
  observations[],               // Raw observation data
  evaluation,                   // { status, requirements_met[], requirements_missing[], reason }
  result,                       // Final output string
  error,                        // { message, actionsAttempted, replans }
  startedAt, iteration,         // Timing and iteration count
  replanned                     // Whether a replan occurred
}
```

**The frontend displays state. The backend decides state.**

---

## Mock Mode

The mock event stream (`MockEventStream.js`) replays a realistic "Find best laptop under ₹80,000" scenario:

```
TASK_CREATED → PLAN_CREATED (5 steps) → 2 actions →
OBSERVATION → EVALUATION (incomplete) → REPLAN →
PLAN_UPDATED → 2 more actions → OBSERVATION →
EVALUATION (pass) → TASK_COMPLETED
```

Total duration: ~35 seconds. The replan moment is the visual highlight.

Mock data is **isolated** — only `EventService.js` imports it. No UI component references mock data directly.

---

## Backend Integration

See the full contract: [`docs/api/frontend-contract.md`](../../docs/api/frontend-contract.md)

### Required API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tasks` | POST | Create task. Body: `{ goal }`. Returns: `{ task_id }` |
| `/api/tasks/:task_id/events` | GET (SSE) | Stream events to the frontend |
| `/api/tasks/:task_id` | GET | Full task state (polling fallback) |

### For the Brain Developer (Dev 1)

1. Implement the three endpoints above
2. Emit events in the documented format as the task progresses
3. Set `VITE_API_URL` in the frontend `.env`
4. Test with `?mode=sse`

### For the Evaluator Developer (Dev 4)

Emit these events through the Brain's event stream:
- `evaluation.started` — before evaluating
- `evaluation.completed` — with `requirements_met[]`, `requirements_missing[]`, `status`, `reason`
- `observation.received` — with `summary`, `relevant`, `complete`, `quality`, `issues[]`

### For the n8n Developer (Dev 2)

No direct frontend integration. Your tool results flow through the Brain/Observer as `action.started` / `action.completed` events.

---

## Error Handling

| Error | Frontend Behavior |
|-------|-------------------|
| Backend unreachable | ErrorPanel: "Backend unavailable..." + retry button |
| `task.failed` received | ErrorPanel: reason + stats + retry button |
| `action.completed` with `success: false` | Tool card shows failed, plan step marked ✗ |
| SSE connection error | Logged to console, UI continues with last state |
| Malformed event | Logged to console, event skipped |

---

## Safety

The UI never displays:
- Internal model reasoning or chain-of-thought
- Raw prompts or API keys
- Private system messages

Only safe, high-level status messages are shown.

---

## Build

```bash
npm run build    # Production build → dist/
npm run preview  # Preview production build
```

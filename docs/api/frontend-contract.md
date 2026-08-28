# MELO Frontend Integration Contract

> **Status: FROZEN — Integration Ready**
>
> This document is the canonical reference for all MELO backend developers
> (Brain, n8n, Evaluator) who need to connect to the frontend.
> The frontend code is locked. Do not request frontend changes unless
> an integration requirement makes it strictly necessary.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [API Endpoints Required](#2-api-endpoints-required)
3. [Event Contract](#3-event-contract)
4. [Task State Contract](#4-task-state-contract)
5. [Evaluation UI Contract](#5-evaluation-ui-contract)
6. [Replanning UI Contract](#6-replanning-ui-contract)
7. [Tool Activity Contract](#7-tool-activity-contract)
8. [Error States](#8-error-states)
9. [Transport Modes](#9-transport-modes)
10. [Integration Guide by Role](#10-integration-guide-by-role)
11. [Running the Frontend](#11-running-the-frontend)

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────┐
│                    FRONTEND                       │
│                                                   │
│  GoalInput ──submit──▶ App.js                    │
│                          │                        │
│              POST /api/tasks (real mode)          │
│              or MockEventStream (demo mode)       │
│                          │                        │
│                    EventService                   │
│                     (Mock / SSE / Polling)         │
│                          │                        │
│                      onEvent()                    │
│                          │                        │
│                      TaskStore                    │
│                    dispatch(event)                │
│                          │                        │
│                    state change                   │
│                          │                        │
│         ┌────┬────┬────┬┴───┬─────┬──────┐       │
│         │    │    │    │    │     │      │       │
│       Task Status Plan Time Tool  Eval Result    │
│       Hdr  Pipe  View line  Act   Panel  Panel   │
└──────────────────────────────────────────────────┘
```

**Key principle**: The frontend DISPLAYS state. The backend DECIDES state.

The frontend never:
- Creates plans
- Decides evaluations
- Triggers replanning
- Runs tools
- Exposes internal model reasoning

---

## 2. API Endpoints Required

The backend must expose these three endpoints:

### `POST /api/tasks`

Create a new task.

**Request:**
```json
{
  "goal": "Find the best laptop under ₹80,000"
}
```

**Response (200):**
```json
{
  "task_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
}
```

The frontend uses the returned `task_id` to subscribe to events.

---

### `GET /api/tasks/:task_id/events` (SSE)

Server-Sent Events stream for real-time updates.

**Response**: SSE stream. Each message `data` field contains a JSON event:

```
data: {"event":"task.created","data":{"task_id":"...","goal":"...","created_at":"..."},"timestamp":"..."}

data: {"event":"plan.created","data":{"task_id":"...","steps":["..."],"objective":"...","status":"in_progress"},"timestamp":"..."}
```

The frontend automatically reconnects on SSE connection errors.

---

### `GET /api/tasks/:task_id` (Polling fallback)

Full task state snapshot. Used when SSE is not available.

**Response (200):**
```json
{
  "task_id": "...",
  "goal": "...",
  "status": "executing",
  "events": [
    { "event": "task.created", "data": { ... }, "timestamp": "..." },
    { "event": "plan.created", "data": { ... }, "timestamp": "..." }
  ]
}
```

The frontend polls every 2 seconds and only processes events it hasn't seen yet.

---

## 3. Event Contract

Every event sent to the frontend must have this shape:

```json
{
  "event": "<event_type_string>",
  "data": { ... },
  "timestamp": "<ISO 8601 string>"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `event` | `string` | **Yes** | One of the 11 event types below |
| `data` | `object` | **Yes** | Event-specific payload |
| `timestamp` | `string` | **Yes** | ISO 8601 timestamp (e.g., `2026-08-28T18:15:30.000Z`) |

### 3.1 `task.created`

Dispatched when the backend acknowledges the user's goal.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `data.task_id` | `string (uuid)` | **Yes** | Unique task identifier |
| `data.goal` | `string` | **Yes** | The user's goal text |
| `data.created_at` | `string (ISO 8601)` | **Yes** | Task creation timestamp |

**Example:**
```json
{
  "event": "task.created",
  "data": {
    "task_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "goal": "Find the best laptop under ₹80,000",
    "created_at": "2026-08-28T18:15:30.000Z"
  },
  "timestamp": "2026-08-28T18:15:30.000Z"
}
```

**UI effect:** Goal text displayed, elapsed timer starts, pipeline "Goal" node lights up.
**State change:** `status → created`, `taskId`, `goal`, `startedAt` set.
**Consumed by:** TaskHeader, StatusPipeline, ActivityTimeline.

---

### 3.2 `plan.created`

Dispatched when the MELO Brain creates the initial plan.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `data.task_id` | `string (uuid)` | **Yes** | Task identifier |
| `data.objective` | `string` | **Yes** | Plan objective (usually equals the goal) |
| `data.steps` | `string[]` | **Yes** | Ordered list of human-readable step descriptions |
| `data.status` | `string` | Optional | Plan status (`pending`, `in_progress`, `completed`, `failed`) |

**Example:**
```json
{
  "event": "plan.created",
  "data": {
    "task_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "objective": "Find the best laptop under ₹80,000",
    "steps": [
      "Understand requirements and constraints",
      "Search for laptop candidates in the budget range",
      "Verify current pricing and availability",
      "Compare specifications and value",
      "Generate final recommendation"
    ],
    "status": "in_progress"
  },
  "timestamp": "2026-08-28T18:15:32.000Z"
}
```

**UI effect:** PlanViewer renders all steps as `○ pending`. Pipeline advances to "Plan" → "Execute".
**State change:** `status → executing`, `plan` populated with step objects.
**Consumed by:** PlanViewer, StatusPipeline, ActivityTimeline.

---

### 3.3 `action.started`

Dispatched when MELO begins executing a tool/action.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `data.task_id` | `string (uuid)` | **Yes** | Task identifier |
| `data.action_id` | `string (uuid)` | **Yes** | Unique identifier for this action |
| `data.action` | `string` | **Yes** | Tool name (e.g., `web_search`, `read_pdf`, `analyze_requirements`) |
| `data.reason` | `string` | **Yes** | Safe, high-level explanation of why this action is being taken |
| `data.parameters` | `object` | Optional | Tool parameters (only include safe, non-sensitive fields) |

**Example:**
```json
{
  "event": "action.started",
  "data": {
    "task_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "action_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "action": "web_search",
    "reason": "Searching for laptop candidates under ₹80,000",
    "parameters": {
      "query": "best laptops under 80000 INR 2026"
    }
  },
  "timestamp": "2026-08-28T18:15:34.000Z"
}
```

**UI effect:** ToolActivity shows tool card with spinner. Next plan step highlights as `→ active`.
**State change:** `status → executing`, `currentAction` updated, `currentStepIndex` advanced.
**Consumed by:** ToolActivity, PlanViewer, StatusPipeline, ActivityTimeline.

> [!IMPORTANT]
> **Never include private model reasoning in `reason`.** Use a safe, high-level description like "Searching for candidates" — not "My internal analysis suggests..."

---

### 3.4 `action.completed`

Dispatched when a tool/action finishes.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `data.task_id` | `string (uuid)` | **Yes** | Task identifier |
| `data.action_id` | `string (uuid)` | **Yes** | Must match the corresponding `action.started` |
| `data.success` | `boolean` | **Yes** | Whether the action succeeded |
| `data.data` | `object` | Optional | Result payload (safe to display) |
| `data.summary` | `string` | Optional | Human-readable summary of the result |
| `data.error` | `string \| null` | Optional | Error message if `success` is `false` |
| `data.metadata` | `object` | Optional | Non-sensitive metadata (e.g., `duration_ms`, `source`) |

**Example (success):**
```json
{
  "event": "action.completed",
  "data": {
    "task_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "action_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "success": true,
    "summary": "12 laptop candidates found",
    "data": {
      "result_count": 12
    },
    "metadata": {
      "duration_ms": 2800
    }
  },
  "timestamp": "2026-08-28T18:15:37.000Z"
}
```

**Example (failure):**
```json
{
  "event": "action.completed",
  "data": {
    "task_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "action_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "success": false,
    "error": "External API returned 503",
    "data": {},
    "metadata": {}
  },
  "timestamp": "2026-08-28T18:15:37.000Z"
}
```

**UI effect:** ToolActivity shows completed/failed. Current plan step marked `✓` or `✗`.
**State change:** `currentAction.status` updated, plan step status updated.
**Consumed by:** ToolActivity, PlanViewer, ActivityTimeline.

---

### 3.5 `observation.received`

Dispatched by the Observer after processing an action result.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `data.task_id` | `string (uuid)` | **Yes** | Task identifier |
| `data.action_id` | `string (uuid)` | **Yes** | Which action this observation is for |
| `data.summary` | `string` | **Yes** | Safe, human-readable summary |
| `data.relevant` | `boolean` | **Yes** | Whether the result is relevant to the goal |
| `data.complete` | `boolean` | **Yes** | Whether the result is complete |
| `data.quality` | `number (0-1)` | **Yes** | Quality score |
| `data.issues` | `string[]` | **Yes** | List of identified issues (empty array if none) |

**Example:**
```json
{
  "event": "observation.received",
  "data": {
    "task_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "action_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "summary": "Found 12 laptop models. Pricing data may be outdated.",
    "relevant": true,
    "complete": false,
    "quality": 0.65,
    "issues": ["Pricing data may be outdated"]
  },
  "timestamp": "2026-08-28T18:15:38.000Z"
}
```

**UI effect:** Timeline entry added. Pipeline advances to "Observe".
**State change:** `status → observing`, observation appended to `observations[]`.
**Consumed by:** ActivityTimeline.

---

### 3.6 `evaluation.started`

Dispatched when the Self-Evaluator begins evaluating.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `data.task_id` | `string (uuid)` | **Yes** | Task identifier |

**Example:**
```json
{
  "event": "evaluation.started",
  "data": {
    "task_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
  },
  "timestamp": "2026-08-28T18:15:39.000Z"
}
```

**UI effect:** EvaluationPanel shows spinner with "MELO is checking whether the collected information satisfies the goal." Pipeline "Evaluate" node lights up.
**State change:** `status → evaluating`.
**Consumed by:** EvaluationPanel, StatusPipeline, ActivityTimeline.

---

### 3.7 `evaluation.completed`

Dispatched when the Self-Evaluator finishes evaluation.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `data.task_id` | `string (uuid)` | **Yes** | Task identifier |
| `data.status` | `string` | **Yes** | `"pass"`, `"incomplete"`, or `"fail"` |
| `data.requirements_met` | `string[]` | **Yes** | List of satisfied requirements |
| `data.requirements_missing` | `string[]` | **Yes** | List of unsatisfied requirements (empty on `pass`) |
| `data.reason` | `string` | **Yes** | Safe, human-readable explanation |
| `data.recommended_action` | `string \| null` | Optional | Suggested next action if not pass |

**Example (incomplete — triggers replan):**
```json
{
  "event": "evaluation.completed",
  "data": {
    "task_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "status": "incomplete",
    "requirements_met": [
      "Found 12 candidate laptops",
      "Budget constraint identified"
    ],
    "requirements_missing": [
      "Current, verified pricing not confirmed",
      "No head-to-head comparison performed"
    ],
    "reason": "Price information may be outdated. Cannot confirm budget compliance.",
    "recommended_action": "Verify current prices from a reliable source"
  },
  "timestamp": "2026-08-28T18:15:42.000Z"
}
```

**Example (pass — task can complete):**
```json
{
  "event": "evaluation.completed",
  "data": {
    "task_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "status": "pass",
    "requirements_met": [
      "Multiple candidates identified",
      "Current pricing verified",
      "Budget compliance confirmed",
      "Recommendation generated"
    ],
    "requirements_missing": [],
    "reason": "All requirements satisfied."
  },
  "timestamp": "2026-08-28T18:15:55.000Z"
}
```

**UI effect:** EvaluationPanel renders requirements checklist with ✓/✗ icons, status badge (PASS/INCOMPLETE/FAIL).
**State change:** `evaluation` object updated.
**Consumed by:** EvaluationPanel, ActivityTimeline.

---

### 3.8 `replan.started`

Dispatched when the Brain decides to replan after an incomplete/failed evaluation.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `data.task_id` | `string (uuid)` | **Yes** | Task identifier |
| `data.reason` | `string` | Optional | Why replanning is needed |

**Example:**
```json
{
  "event": "replan.started",
  "data": {
    "task_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "reason": "Price information incomplete"
  },
  "timestamp": "2026-08-28T18:15:44.000Z"
}
```

**UI effect:** **Pipeline shakes** (amber glow animation). Status badge shows "⟳ REPLANNING". EvaluationPanel shows "MELO is replanning to address gaps..."
**State change:** `status → replanning`, `replanned → true`, `iteration` incremented.
**Consumed by:** StatusPipeline (shake animation), TaskHeader (replanning badge), EvaluationPanel, ActivityTimeline.

> [!IMPORTANT]
> The frontend NEVER triggers `replan.started` itself. Only the backend sends this.

---

### 3.9 `plan.updated`

Dispatched after replanning produces a new plan.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `data.task_id` | `string (uuid)` | **Yes** | Task identifier |
| `data.objective` | `string` | **Yes** | Updated objective |
| `data.steps` | `string[]` | **Yes** | **New** steps only (not previously completed steps) |
| `data.status` | `string` | Optional | Plan status |

**Example:**
```json
{
  "event": "plan.updated",
  "data": {
    "task_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "objective": "Find the best laptop under ₹80,000",
    "steps": [
      "Verify current pricing from official sources",
      "Filter models that exceed budget",
      "Perform detailed comparison",
      "Generate final recommendation"
    ],
    "status": "in_progress"
  },
  "timestamp": "2026-08-28T18:15:47.000Z"
}
```

**UI effect:** PlanViewer appends new steps below a "⟳ Replanned" divider. Previously completed steps remain visible above.
**State change:** `status → executing`, plan updated (completed steps preserved, new steps appended), `evaluation` cleared.
**Consumed by:** PlanViewer, StatusPipeline, ActivityTimeline.

> [!NOTE]
> `data.steps` should contain only the **new** steps. The frontend automatically preserves and displays already-completed steps above a divider.

---

### 3.10 `task.completed`

Dispatched when the task finishes successfully.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `data.task_id` | `string (uuid)` | **Yes** | Task identifier |
| `data.result` | `string` | **Yes** | The final generated answer/output |
| `data.summary` | `string` | Optional | Alternative to `result` if shorter |

**Example:**
```json
{
  "event": "task.completed",
  "data": {
    "task_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "result": "🏆 Best Laptop Under ₹80,000 for CS Students\n\n🥇 Top Pick: ASUS Vivobook Pro 15 — ₹74,990\n..."
  },
  "timestamp": "2026-08-28T18:16:00.000Z"
}
```

**UI effect:** ResultPanel slides in with success glow animation. All remaining plan steps marked completed. Pipeline "Done" node lights up green.
**State change:** `status → completed`, `result` set.
**Consumed by:** ResultPanel, PlanViewer, StatusPipeline, TaskHeader, ActivityTimeline.

---

### 3.11 `task.failed`

Dispatched when the task fails and cannot continue.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `data.task_id` | `string (uuid)` | Optional | Task identifier |
| `data.reason` | `string` | **Yes** | Safe, user-facing error message |

**Example:**
```json
{
  "event": "task.failed",
  "data": {
    "task_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "reason": "Maximum iterations reached (5). The required external data could not be retrieved."
  },
  "timestamp": "2026-08-28T18:16:30.000Z"
}
```

**UI effect:** ErrorPanel appears with error message, action/replan counts, and "Try Again" button.
**State change:** `status → failed`, `error` object set.
**Consumed by:** ErrorPanel, StatusPipeline, TaskHeader, ActivityTimeline.

---

## 4. Task State Contract

The frontend `TaskStore` maintains this canonical state shape:

```javascript
{
  taskId: string | null,           // From task.created
  goal: string,                    // From task.created
  status: string,                  // One of: idle, created, planning, executing,
                                   //         observing, evaluating, replanning,
                                   //         completed, failed
  plan: {                          // From plan.created / plan.updated
    objective: string,
    steps: [{ text: string, status: string }],  // status: pending, active, completed, failed
    isReplan: boolean,
    replanIndex: number | undefined
  } | null,
  currentStepIndex: number,        // Index of active plan step (-1 if none)
  events: [{                       // Timeline entries (presentation only)
    id: string,
    type: string,
    source: string,
    message: string,
    timestamp: string
  }],
  currentAction: {                 // From action.started / action.completed
    action_id: string,
    action: string,
    reason: string,
    parameters: object,
    status: string,                // running, completed, failed
    result: object | undefined
  } | null,
  observations: [object],         // Raw observation data
  evaluation: {                    // From evaluation.completed
    status: string,                // pass, incomplete, fail
    requirements_met: string[],
    requirements_missing: string[],
    reason: string,
    recommended_action: string | null
  } | null,
  result: string | null,          // From task.completed
  error: {                        // From task.failed
    message: string,
    actionsAttempted: number,
    replans: number
  } | null,
  startedAt: string | null,       // ISO timestamp
  iteration: number,              // Replan count (starts at 0)
  replanned: boolean              // Has any replan occurred?
}
```

**The frontend does NOT:**
- Decide when to replan
- Evaluate task completion
- Generate plans
- Execute tools
- Store chain-of-thought

---

## 5. Evaluation UI Contract

The EvaluationPanel displays structured evaluation data exactly as received from `evaluation.completed`.

**Frontend renders:**
- ✓ (green) for each item in `requirements_met`
- ✗ (red) for each item in `requirements_missing`
- Status badge: `PASS` (green), `INCOMPLETE` (amber), `FAIL` (red)
- Reason text (italicized)
- "MELO is replanning..." indicator when `status === 'replanning'`

**The Evaluator developer (Dev 4) must:**
1. Send `evaluation.started` before evaluating
2. Send `evaluation.completed` with structured data after evaluating
3. Use human-readable strings in `requirements_met` / `requirements_missing`
4. Never include chain-of-thought in `reason`

---

## 6. Replanning UI Contract

**Sequence the backend must emit:**
```
evaluation.completed  (status: "incomplete" or "fail")
    ↓
replan.started
    ↓
plan.updated  (with new steps only)
    ↓
action.started  (new action begins)
```

**Frontend behavior:**
1. `evaluation.completed` (incomplete) → checklist shows gaps
2. `replan.started` → pipeline **shakes**, amber glow, "REPLANNING" badge
3. `plan.updated` → new steps appear below "⟳ Replanned" divider, old evaluation cleared
4. `action.started` → execution resumes normally

**The frontend never initiates replanning.** It only reacts to these events.

---

## 7. Tool Activity Contract

The ToolActivity card displays safe information about the current tool.

**Display mapping:**

| `data.action` value | Icon | Display Name |
|---------------------|------|-------------|
| `web_search` | 🔎 | Web Search |
| `read_pdf` | 📄 | Read Pdf |
| `analyze_requirements` | 🧠 | Analyze Requirements |
| `generate_code` | 💻 | Generate Code |
| `file_operation` | 📁 | File Operation |
| `api_call` | 🌐 | Api Call |
| *(anything else)* | ⚙️ | *(auto-formatted from action name)* |

Tool names are auto-formatted from snake_case to Title Case.

> [!WARNING]
> Never include API keys, secrets, or raw prompts in `data.parameters` or `data.reason`.
> Only safe, user-facing information should be included.

---

## 8. Error States

The frontend handles these error conditions:

| Error | How It Occurs | UI Display |
|-------|--------------|------------|
| Backend unavailable | `POST /api/tasks` fails | ErrorPanel: "Backend unavailable: ... Is the MELO backend running?" |
| Task failed | `task.failed` event received | ErrorPanel: reason + action count + replan count + "Try Again" |
| Tool failed | `action.completed` with `success: false` | ToolActivity card shows "Failed". Plan step marked `✗`. |
| SSE connection error | EventSource `onerror` fires | Console error logged. Frontend continues with last known state. |
| Malformed event | JSON parse failure on SSE message | Console error logged. Event skipped. |
| Maximum iterations | `task.failed` with appropriate reason | ErrorPanel with reason text |

---

## 9. Transport Modes

The frontend supports three transport modes, controlled by the `?mode=` query parameter:

| URL | Mode | Description |
|-----|------|-------------|
| `http://localhost:5173` | `mock` | Plays demo scenario. No backend needed. |
| `http://localhost:5173?mode=sse` | `sse` | Connects via SSE to `GET /api/tasks/:id/events` |
| `http://localhost:5173?mode=polling` | `polling` | Polls `GET /api/tasks/:id` every 2s |

**All three modes produce the same normalized event format:**
```json
{ "event": "...", "data": { ... }, "timestamp": "..." }
```

**Switching from mock to real requires zero code changes.** Just start the backend and change the URL parameter.

---

## 10. Integration Guide by Role

### For Developer 1 — MELO Brain / Backend

You need to implement:

1. **`POST /api/tasks`** — Accept `{ goal }`, return `{ task_id }`.
2. **`GET /api/tasks/:task_id/events`** — SSE stream emitting events in the format above.
3. **`GET /api/tasks/:task_id`** — (Optional, for polling fallback) Return full task state with `events[]`.

**Event emission order:**
```
task.created → plan.created → [action.started → action.completed]* →
observation.received → evaluation.started → evaluation.completed →
[replan.started → plan.updated → [action.started → action.completed]*
→ observation.received → evaluation.started → evaluation.completed]* →
task.completed | task.failed
```

**Environment:** Set `VITE_API_URL` in the frontend `.env` to your backend URL.

### For Developer 2 — n8n / Orchestration

No direct frontend integration required. Your tool execution results flow through the Brain/Observer, which emit `action.started` / `action.completed` events.

Ensure your `ActionResult` payloads match `shared/schemas/action-result.json`:
- `success: boolean`
- `data: object`
- `error: string | null`
- `metadata: object`

### For Developer 4 — Observer / Evaluator

Your events are consumed directly by the frontend:

1. **Observation:** Emit `observation.received` matching `shared/schemas/observation.json`.
2. **Evaluation:** Emit `evaluation.started` then `evaluation.completed` matching `shared/schemas/evaluation.json`.

Key fields the frontend renders:
- `requirements_met[]` — shown as ✓ green items
- `requirements_missing[]` — shown as ✗ red items
- `status` — determines badge color (`pass`/`incomplete`/`fail`)
- `reason` — shown as italic explanation text

---

## 11. Running the Frontend

```bash
# Install
cd apps/frontend
npm install

# Development (mock mode)
npm run dev
# → http://localhost:5173

# Development (real backend)
# 1. Set VITE_API_URL in .env
# 2. Start the backend
npm run dev
# → http://localhost:5173?mode=sse

# Production build
npm run build
# → Output in dist/
```

**Environment variable:**
```
VITE_API_URL=http://localhost:3000
```

If unset, defaults to the Vite dev server's proxy (which forwards `/api/*` to `localhost:3000`).

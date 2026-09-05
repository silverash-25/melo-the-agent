# MELO Tool Registry

This document describes the available tools in the n8n tool server and their input/output contracts.

**Webhook URL**: `POST http://<n8n-host>:5678/webhook/melo-tool-action`  
*(Or `/webhook-test/melo-tool-action` if running locally in test mode)*

## 1. read_file
**Description**: Read a file's content from the MELO sandbox.
**Endpoint**: `/read_file` (Internal to n8n router)
**Permissions**: Read access to `SANDBOX_DIR`. Path traversal is blocked.
**Status**: Active

**Input**:
```json
{
  "task_id": "string",
  "action_id": "string",
  "action": "read_file",
  "parameters": {
    "filename": "string"
  }
}
```

## 2. write_file
**Description**: Write content to a file in the MELO sandbox. Creates directories if they do not exist.
**Endpoint**: `/write_file` (Internal to n8n router)
**Permissions**: Write access to `SANDBOX_DIR`. Path traversal is blocked.
**Status**: Active

**Input**:
```json
{
  "task_id": "string",
  "action_id": "string",
  "action": "write_file",
  "parameters": {
    "filename": "string",
    "content": "string"
  }
}
```

## 3. code_execute
**Description**: Execute arbitrary Node.js code securely in a restricted process.
**Endpoint**: `/code_execute` (Internal to n8n router)
**Permissions**: Executes `node -e <script>`. Uses `execFileSync` to prevent shell injection. No network/disk restrictions enforced by default, so do NOT expose this to the public internet.
**Status**: Active

**Input**:
```json
{
  "task_id": "string",
  "action_id": "string",
  "action": "code_execute",
  "parameters": {
    "script": "string"
  }
}
```

## 4. data_analyze
**Description**: Execute a predefined Python script to describe a CSV file using Pandas.
**Endpoint**: `/data_analyze` (Internal to n8n router)
**Permissions**: Read access to `SANDBOX_DIR`.
**Status**: Active

**Input**:
```json
{
  "task_id": "string",
  "action_id": "string",
  "action": "data_analyze",
  "parameters": {
    "filename": "string"
  }
}
```

## Global Result Format (ActionResult)
All successful tools return:
```json
{
  "task_id": "task-123",
  "action_id": "action-456",
  "success": true,
  "data": { ... tool specific data ... },
  "error": null,
  "metadata": {
    "tool": "read_file"
  }
}
```

All failed executions (including validation errors) return:
```json
{
  "task_id": "task-123",
  "action_id": "action-456",
  "success": false,
  "data": null,
  "error": {
    "code": "TOOL_ERROR",
    "message": "Error details..."
  },
  "metadata": {
    "tool": "read_file"
  }
}
```

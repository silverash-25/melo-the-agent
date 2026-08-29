# n8n Integration Guide for MELO Brain (Developer 1)

This document tells you everything you need to call n8n tools from the Brain.

---

## 1. Endpoint

```
POST http://localhost:5678/webhook/<webhook-id>
Content-Type: application/json
```

> The exact webhook URL will be shared via Discord/WhatsApp. It changes if the Webhook node is recreated.

---

## 2. ActionRequest Format

Send this JSON body to the webhook:

```json
{
  "task_id": "uuid",
  "action_id": "uuid",
  "action": "web_search",
  "reason": "Find candidate laptops under 80000",
  "parameters": {
    "query": "best laptops under 80000 programming India"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| task_id | string | Yes | UUID of the current task |
| action_id | string | Yes | UUID of this specific action |
| action | string | Yes | Tool name from the registry |
| reason | string | Yes | Why the Brain chose this action |
| parameters | object | Yes | Tool-specific input (see Available Tools) |

---

## 3. ActionResult Format

n8n will synchronously return:

### Success
```json
{
  "task_id": "uuid",
  "action_id": "uuid",
  "success": true,
  "data": { ... },
  "error": null,
  "metadata": { "tool": "web_search", "execution_time_ms": 0 }
}
```

### Failure
```json
{
  "task_id": "uuid",
  "action_id": "uuid",
  "success": false,
  "data": null,
  "error": { "code": "TOOL_ERROR", "message": "Detailed error message" },
  "metadata": {}
}
```

---

## 4. Available Tools

### web_search
Searches Wikipedia. Parameters: `{ "query": "search term" }`. Returns: `data.results`.

### pdf_extract
Extracts text from a PDF URL. Parameters: `{ "file_url": "https://..." }`. Returns: `data.text`.

### http_request
Generic HTTP request. Parameters: `{ "url": "...", "method": "GET" }`. Returns: `data` (raw response).

### file_read
Reads a file from sandbox. Parameters: `{ "filename": "report.txt" }`. Returns: `data.content`.

### file_write
Writes a file to sandbox. Parameters: `{ "filename": "out.txt", "content": "..." }`. Returns: `data.message`.

---

## 5. Error Codes

| Code | Meaning |
|------|---------|
| VALIDATION_ERROR | Missing required fields in ActionRequest |
| UNKNOWN_TOOL | action value does not match any registered tool |
| TOOL_ERROR | Tool crashed during execution |
| TIMEOUT | Tool exceeded timeout |
| FILE_NOT_FOUND | file_read requested file does not exist |

---

## 6. How to Start n8n
```bash
n8n
```
Opens at http://localhost:5678. Workflow must be Published for production calls.

## 7. Important Notes
- n8n returns ActionResult synchronously. No polling needed.
- Never send API keys in parameters or reason.
- reason field is for observability only.

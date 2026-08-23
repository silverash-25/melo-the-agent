# n8n Orchestration
Contains workflows, tools, and schemas for tool execution.

**Rule:** MELO decides WHAT to do. n8n decides HOW to execute the requested tool. Do NOT create a giant fixed workflow that performs every action automatically. The workflow must accept an ActionRequest, route it to the appropriate tool, execute it, normalize the result, and return an ActionResult.

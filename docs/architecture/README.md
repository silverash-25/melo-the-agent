# MELO Architecture

\\\	ext
                         USER
                           |
                           v
                    +-------------+
                    |  MELO CORE  |
                    |  Nemotron   |
                    +------+------+
                           |
                           v
                    +-------------+
                    |   DECISION  |
                    |    ENGINE   |
                    +------+------+
                           |
                     ActionRequest
                           |
                           v
                    +-------------+
                    |     n8n     |
                    | ORCHESTRATOR|
                    +------+------+
                           |
                +----------+----------+
                v          v          v
             Search      APIs     Files/Apps
                +----------+----------+
                           |
                     ActionResult
                           |
                           v
                    +-------------+
                    |  OBSERVER   |
                    +------+------+
                           |
                           v
                    +-------------+
                    |SELF-EVALUATOR|
                    +------+------+
                           |
                     +-----+-----+
                     |           |
                    PASS        FAIL
                     |           |
                     v           v
                    DONE       REPLAN
                                  |
                                  +----> MELO CORE
\\\
"@

# Docker Compose
Set-Content -Path "C:\Users\Maria\.gemini\antigravity-ide\scratch\melo/docker-compose.yml" -Value @"
version: '3.8'

services:
  n8n:
    image: docker.n8n.io/n8nio/n8n
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=${N8N_HOST}
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - NODE_ENV=production
    volumes:
      - n8n_data:/home/node/.n8n

  # Add other services here (melo-core, observer, evaluator, frontend) as they are built.

volumes:
  n8n_data:

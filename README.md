# MELO - Autonomous Generative AI System

MELO is a 4-person hackathon project building an autonomous generative AI system using **NVIDIA Nemotron** and **n8n**.

## Core Loop
USER GOAL -> MELO CORE -> DECISION ENGINE -> n8n -> TOOLS -> OBSERVER -> SELF-EVALUATOR -> DONE / REPLAN

## Developer Ownership
- **Developer 1 (MELO Core):** services/melo-core/ and backend. Responsible for Nemotron integration, goal understanding, planning, decision engine, task state, action generation, replanning interface.
- **Developer 2 (n8n / Orchestration):** 
8n/. Responsible for n8n workflows, tool registry, tool execution, API integrations, web search, file/tool operations.
- **Developer 3 (Frontend):** pps/frontend/. Responsible for MELO UI, goal input, task/plan visualization, activity timeline, evaluation/replanning status, final result.
- **Developer 4 (Observer / Evaluator):** services/observer/ and services/evaluator/. Responsible for observing tool results, normalizing results, evaluating task completion, detecting missing info, triggering replanning, loop protection, security/validation.

## Shared Contracts
The central source of truth for communication between these components is located in shared/.
**DO NOT** modify schemas in shared/schemas/ or shared/events/ without team consensus.

## Getting Started
1. Clone the repository.
2. Copy .env.example to .env and fill in the secrets (do not commit!).
3. Use docker-compose or individual start scripts (to be defined) to start your service.

## Git Workflow
Please work in your respective feature branches:
- eature/melo-core
- eature/n8n
- eature/frontend
- eature/evaluator

Open a PR to merge into main. Do not push to main directly.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**SkillDNA** is an AI-powered workforce mobility intelligence platform for Michigan workers. It analyzes worker resumes to identify transferable skills, score career transition opportunities, and generate personalized learning plans — all grounded in Michigan labor market context.

This is a hackathon MVP. Working demo over perfect code.

**Team roles:**
- AI Engineer (you): agent pipeline, Orchestrate integration, FastAPI backend
- Data Engineer: Cloudant and data loading
- Frontend Developer: React frontend (not your concern)

---

## Tech Stack

| Component | Technology |
|---|---|
| LLM | IBM watsonx.ai — `ibm/granite-3-3-8b-instruct` |
| Agent Framework | LangGraph (Python) |
| Orchestration | IBM watsonx Orchestrate (imports LangGraph agents via ADK) |
| Database | IBM Cloudant |
| Backend API | FastAPI + Uvicorn |
| Deployment | IBM Code Engine |
| Resume Parsing | pdfplumber |

---

## Agent Architecture

Five LangGraph agents imported into watsonx Orchestrate as collaborator agents. A top-level Orchestrate agent routes between them sequentially.

```
[Agent 1] Resume Intelligence Agent    → WorkerProfile JSON
[Agent 2] Skill Translation Agent      → SkillMap JSON
[Agent 3] Labor Market Intelligence    → ScoredIntelligence JSON (uses Cloudant)
[Agent 4] Upskilling Intelligence      → LearningPlan JSON
[Agent 5] Orchestration Agent          → skilldna_payload JSON → frontend
```

---

## Project Structure

```
skilldna/
├── agents/
│   ├── shared/
│   │   ├── state.py              # SkillDNAState — master data contract
│   │   ├── llm.py                # watsonx.ai ChatWatsonx init
│   │   └── cloudant_client.py   # get_skill_data / get_career_data / save_session
│   ├── resume_intelligence/
│   │   ├── agent.py              # create_agent(config) factory
│   │   ├── agent.yaml            # Orchestrate import config
│   │   └── requirements.txt
│   ├── skill_translation/        # same 3-file structure
│   ├── labor_market/             # same 3-file structure
│   └── upskilling/               # same 3-file structure
├── api/
│   ├── main.py                   # FastAPI app
│   ├── routes/analyze.py         # POST /analyze endpoint
│   └── models/schemas.py         # Pydantic models (SkillDNAPayload)
├── data/
│   └── workforce_pulse.json      # Static homepage data
├── tests/
│   ├── test_agents.py
│   └── sample_resume.txt
├── .env                          # never commit
└── requirements.txt
```

---

## Development Commands

```bash
# Python 3.11 required (Orchestrate ADK requirement)
python3.11 -m venv .venv && source .venv/bin/activate

# Install dependencies
pip install langgraph langchain-core langchain-ibm ibm-watsonx-ai ibm-watsonx-orchestrate \
  fastapi uvicorn python-multipart pdfplumber python-dotenv ibmcloudant httpx pydantic

# Start local Orchestrate server (requires Docker with 8GB RAM / 4 CPUs)
orchestrate server start        # spins up at http://localhost:4321
orchestrate server stop

# Connect to your Orchestrate cloud instance
orchestrate env activate --api-key $ORCHESTRATE_API_KEY

# Import an agent into Orchestrate
orchestrate agents import -k langgraph -f ./agents/resume_intelligence/
orchestrate agents list

# Start FastAPI dev server
uvicorn api.main:app --reload --port 8000

# Test the analyze endpoint
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"resume_text": "Assembly line worker at Ford, 8 years..."}'
```

### Testing Individual Agents

Always test agents in isolation before wiring them together:

```bash
python -c "
from agents.resume_intelligence.agent import create_agent
from agents.shared.state import SkillDNAState
from langchain_core.runnables.config import RunnableConfig

graph = create_agent(RunnableConfig()).compile()
result = graph.invoke({
    'resume_text': 'Assembly line worker at Ford, 8 years. Forklift certified. Quality control.',
    'session_id': 'test-001'
})
print(result)
"
```

### Verify watsonx.ai Connection

```bash
python -c "
from ibm_watsonx_ai import APIClient, Credentials
import os; from dotenv import load_dotenv; load_dotenv()
client = APIClient(Credentials(url=os.getenv('WATSONX_URL'), api_key=os.getenv('WATSONX_API_KEY')))
client.set.default_project(os.getenv('WATSONX_PROJECT_ID'))
print('Connected')
"
```

---

## Critical Patterns

### LangGraph Agent Pattern (all 5 agents follow this exactly)

```python
# agents/<name>/agent.py
from langchain_core.runnables.config import RunnableConfig
from langgraph.graph import StateGraph, START, END
from agents.shared.state import SkillDNAState
from agents.shared.llm import get_llm

def my_node(state: SkillDNAState) -> SkillDNAState:
    llm = get_llm()
    # ... node logic
    return state

def create_agent(config: RunnableConfig) -> StateGraph:
    """Factory MUST return UNCOMPILED StateGraph. Orchestrate compiles it."""
    workflow = StateGraph(SkillDNAState)
    workflow.add_node("my_node", my_node)
    workflow.add_edge(START, "my_node")
    workflow.add_edge("my_node", END)
    return workflow  # NO .compile() here — this will break Orchestrate import
```

### agent.yaml Template (required for Orchestrate import)

```yaml
spec_version: v1
kind: agent
name: resume_intelligence_agent
title: Resume Intelligence Agent
description: <concise description of what the agent does and outputs>
framework: langgraph
deployment:
  code_bundle:
    entrypoint: agent:create_agent
```

### LLM Initialization

```python
# agents/shared/llm.py
from langchain_ibm import ChatWatsonx
from ibm_watsonx_ai import Credentials
import os; from dotenv import load_dotenv; load_dotenv()

def get_llm():
    return ChatWatsonx(
        model_id="ibm/granite-3-3-8b-instruct",
        url=os.getenv("WATSONX_URL"),
        project_id=os.getenv("WATSONX_PROJECT_ID"),
        params={"max_new_tokens": 2000, "temperature": 0.2}
    )
```

### Prompting Rules

- Always include Michigan workforce context in system prompts
- Always instruct: `"Return ONLY valid JSON. No preamble, no explanation, no markdown."`
- Scoring is LLM-reasoned from context — never hardcode formulas
- Keep temperature at 0.2 for deterministic structured output

System prompt pattern:
```
You are a Michigan workforce intelligence analyst.
Michigan context: The state is undergoing EV transition, automation adoption, and manufacturing modernization.
Focus on practical, achievable career transitions for working-class Michigan residents.
Return ONLY valid JSON matching the schema provided. No explanation, no markdown.
```

### Cloudant Interface

Until data engineer delivers real implementations, mock `agents/shared/cloudant_client.py` with static data:

```python
def get_skill_data(skill_name: str) -> dict:
    # {skill_name, demand_score, michigan_opportunity_score, salary_range, growth_indicator, industry_relevance}
    pass

def get_career_data(job_title: str) -> dict:
    # {job_title, required_skills, avg_salary, stability_score, hiring_trend}
    pass

def save_session(session_id: str, payload: dict) -> None: pass
def get_session(session_id: str) -> dict: pass
```

---

## Data Contract

`SkillDNAState` in `agents/shared/state.py` is the master contract passed between all agents. Key types: `SkillNode`, `CareerTransition`, `LearningResource`.

The `/analyze` API endpoint returns `SkillDNAPayload` (from `api/models/schemas.py`). The frontend graph is built entirely from `skill_nodes`. The `narrative` field surfaces the signature demo insight (e.g., "You qualify for 68% of Supply Chain skills…").

`SkillNode.type` is always one of: `"existing"` | `"adjacent"` | `"bridge"`

`CareerTransition.transition_confidence_score` is a float 0.0–1.0 — make it prominent in the demo.

---

## Build Order

1. `agents/shared/state.py`
2. `agents/shared/llm.py`
3. `agents/shared/cloudant_client.py` (mock first)
4. `agents/resume_intelligence/` → test → import to Orchestrate
5. `agents/skill_translation/` → test → import
6. `agents/labor_market/` → test (needs Cloudant)
7. `agents/upskilling/` → test → import
8. Wire all agents in Orchestrate as collaborator agents under Agent 5
9. `api/main.py` + `api/routes/analyze.py`
10. End-to-end test with sample resume
11. Deploy to IBM Code Engine

---

## Environment Variables

```
WATSONX_API_KEY
WATSONX_PROJECT_ID
WATSONX_URL                   # e.g. https://us-south.ml.cloud.ibm.com
ORCHESTRATE_API_KEY
CLOUDANT_URL
CLOUDANT_APIKEY
CLOUDANT_USERNAME
BLS_API_KEY
ONET_USERNAME
ONET_PASSWORD
```

---

## Hackathon Constraints

- **DO NOT** build a job board, train ML models, build an LMS, or set up real-time scraping
- **DO** prioritize the skill graph view — it's the signature demo moment
- **DO** surface `transition_confidence_score` prominently
- **DO** reference IBM SkillsBuild in learning resources (judges notice this)
- **DO** keep Michigan context in every agent prompt

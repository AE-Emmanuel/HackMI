# SkillDNA: AI-Powered Workforce Mobility Intelligence Platform

> An intelligent platform that helps Michigan workers discover transferable skills, explore career transition opportunities, and create personalized learning plans—all grounded in real labor market data.

![Status: Hackathon MVP](https://img.shields.io/badge/status-Hackathon%20MVP-yellow)
![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue)
![License: MIT](https://img.shields.io/badge/license-MIT-green)

---

## 🎯 Overview

**SkillDNA** empowers Michigan workers to navigate career transitions by:

- **Analyzing Resumes**: Extracts work experience, certifications, and existing skills
- **Mapping Transferable Skills**: Identifies adjacent and bridge skills for career transitions
- **Scoring Opportunities**: Scores potential career paths based on market demand, salary, and growth
- **Personalized Learning**: Generates targeted learning plans to close skill gaps
- **Michigan Context**: All recommendations are grounded in Michigan's evolving labor market (EV transition, automation, manufacturing modernization)

This is a **working demo** prioritizing the skill graph visualization and transition confidence scoring over perfect code—ideal for demonstrating the core value proposition at a hackathon.

---

## 🏗️ Architecture

SkillDNA uses an **agent-based architecture** with five specialized LangGraph agents orchestrated by IBM watsonx Orchestrate:

```
┌─────────────────────────────────────────────────────────────┐
│  Resume Intelligence Agent  → Extract work profile & skills │
└──────────────────┬──────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────┐
│  Skill Translation Agent    → Map transferable skills       │
└──────────────────┬──────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────┐
│  Labor Market Intelligence  → Score opportunities, salary,  │
│  Agent (with Cloudant DB)     growth trends, hiring demand  │
└──────────────────┬──────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────┐
│  Upskilling Intelligence    → Create personalized learning  │
│  Agent                        plans with IBM SkillsBuild     │
└──────────────────┬──────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────┐
│  Orchestration Agent        → Route & coordinate all agents,│
│  (watsonx Orchestrate)        return final JSON payload     │
└─────────────────────────────────────────────────────────────┘
                   ↓
         [Frontend: React]
```

Each agent:
- Is a **standalone LangGraph state machine** (Python)
- Returns **structured JSON** output
- Is imported into watsonx Orchestrate via the Agent Development Kit
- Contributes to a shared `SkillDNAState` data contract

---

## 🛠️ Tech Stack

| Component | Technology | Purpose |
|---|---|---|
| **LLM** | IBM watsonx.ai / Granite 3.3 8B | Structured reasoning & skill analysis |
| **Agent Framework** | LangGraph (Python) | State machine orchestration |
| **Orchestration** | IBM watsonx Orchestrate | Agent routing & coordination |
| **Database** | IBM Cloudant | Skill demand data, career data, session storage |
| **Backend API** | FastAPI + Uvicorn | REST endpoint for frontend |
| **Resume Parsing** | pdfplumber | Extract text from PDF resumes |
| **Deployment** | IBM Code Engine | Serverless container deployment |
| **Frontend** | React + TypeScript | Interactive skill graph visualization |

---

## 📁 Project Structure

```
HackMI/
├── agents/
│   ├── shared/
│   │   ├── state.py              # Master SkillDNAState contract
│   │   ├── llm.py                # watsonx.ai ChatWatsonx initialization
│   │   └── cloudant_client.py    # Database client (skill/career/session data)
│   ├── resume_intelligence/      # Agent 1: Profile extraction
│   │   ├── agent.py
│   │   ├── agent.yaml            # Orchestrate import config
│   │   └── requirements.txt
│   ├── skill_translation/        # Agent 2: Skill mapping
│   │   ├── agent.py
│   │   ├── agent.yaml
│   │   └── requirements.txt
│   ├── labor_market/             # Agent 3: Market intelligence
│   │   ├── agent.py
│   │   ├── agent.yaml
│   │   └── requirements.txt
│   ├── upskilling/               # Agent 4: Learning plans
│   │   ├── agent.py
│   │   ├── agent.yaml
│   │   └── requirements.txt
│   └── orchestration/            # Agent 5: Master coordinator
│       ├── agent.py
│       ├── agent.yaml
│       └── requirements.txt
│
├── skilldna/
│   ├── __init__.py
│   ├── pipeline.py               # End-to-end pipeline orchestration
│   └── tracker.py                # Session & state tracking
│
├── api/
│   ├── main.py                   # FastAPI application
│   ├── routes/
│   │   └── analyze.py            # POST /analyze endpoint
│   └── models/
│       └── schemas.py            # Pydantic data models
│
├── frontend/                     # React application (separate context)
│   ├── package.json
│   └── ...
│
├── data/
│   └── workforce_pulse.json      # Static labor market insights
│
├── tests/
│   ├── test_agents.py
│   └── sample_resume.txt
│
├── CLAUDE.md                     # Technical guidance for AI engineers
├── pyproject.toml                # Python project metadata
├── pytest.ini                    # Test configuration
└── README.md                     # You are here
```

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.11** (required for IBM Orchestrate ADK compatibility)
- **Docker** (for local Orchestrate server: 8GB RAM, 4 CPUs)
- **IBM Account** with:
  - watsonx.ai project
  - watsonx Orchestrate instance (cloud or local)
  - Cloudant database
  - Code Engine project (for deployment)

### Setup

#### 1. Clone & Install

```bash
git clone https://github.com/AE-Emmanuel/HackMI.git
cd HackMI

# Create virtual environment
python3.11 -m venv .venv
source .venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -e ".[dev]"
```

#### 2. Environment Configuration

Create a `.env` file (never commit this):

```env
# IBM watsonx.ai
WATSONX_API_KEY=your_api_key
WATSONX_PROJECT_ID=your_project_id
WATSONX_URL=https://us-south.ml.cloud.ibm.com

# IBM watsonx Orchestrate
ORCHESTRATE_API_KEY=your_api_key

# IBM Cloudant
CLOUDANT_URL=https://your-instance.cloudant.com
CLOUDANT_APIKEY=your_api_key
CLOUDANT_USERNAME=your_username

# External APIs (optional for MVP)
BLS_API_KEY=your_bls_api_key
ONET_USERNAME=your_onet_username
ONET_PASSWORD=your_onet_password
```

#### 3. Verify Connection

```bash
# Test watsonx.ai connection
python -c "
from agents.shared.llm import get_llm
llm = get_llm()
print('✓ watsonx.ai connected')
"
```

---

## 🧠 Development Workflow

### Local Development

#### Start Orchestrate Server (Local)

```bash
orchestrate server start   # Runs at http://localhost:4321
# In another terminal:
orchestrate env activate  # Connect to local instance
```

#### Connect to Cloud Orchestrate

```bash
orchestrate env activate --api-key $ORCHESTRATE_API_KEY
orchestrate env list
```

#### Test Individual Agents

Always test agents in isolation before integration:

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

#### Import Agent to Orchestrate

```bash
orchestrate agents import -k langgraph -f ./agents/resume_intelligence/
orchestrate agents list
```

#### Run FastAPI Backend

```bash
# Development server with hot reload
uvicorn api.main:app --reload --port 8000

# Test analyze endpoint
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "resume_text": "Assembly line worker at Ford, 8 years. Forklift certified. Quality control.",
    "session_id": "test-001"
  }'
```

#### Run Tests

```bash
pytest tests/ -v
pytest tests/test_agents.py::test_resume_intelligence -v
```

---

## 📊 Key Concepts

### SkillDNAState (Master Data Contract)

All agents read and write to a shared `SkillDNAState` object. Key fields:

```python
SkillDNAState:
  resume_text: str                      # Raw resume text
  session_id: str                       # Unique session identifier
  worker_profile: WorkerProfile         # Extracted work history & skills
  skill_map: SkillMap                   # Transferable skills analysis
  scored_intelligence: ScoredIntelligence  # Market opportunity scores
  learning_plan: LearningPlan           # Upskilling recommendations
  skill_nodes: List[SkillNode]          # Visualization nodes for frontend
  narrative: str                        # Demo insight (e.g., "68% Supply Chain match")
  transition_confidence_score: float    # Overall career transition feasibility (0.0–1.0)
```

### Skill Node Types

Each skill is classified as one of:

- **`"existing"`**: Already in worker's profile
- **`"adjacent"`**: Closely related, short skill gap
- **`"bridge"`**: Requires training but enables high-value transitions

### API Response

The `/analyze` endpoint returns `SkillDNAPayload`:

```json
{
  "session_id": "abc-123",
  "skill_nodes": [
    {
      "id": "forklift_operation",
      "label": "Forklift Operation",
      "type": "existing",
      "michigan_demand": 0.85,
      "salary_impact": 15000
    },
    ...
  ],
  "career_transitions": [
    {
      "target_role": "Supply Chain Coordinator",
      "transition_confidence_score": 0.78,
      "required_skills": ["...", "..."],
      "salary_range": [45000, 65000],
      "growth_indicator": "high"
    },
    ...
  ],
  "learning_plan": {
    "priority_skills": ["..."],
    "resources": [
      {
        "title": "Supply Chain Basics",
        "provider": "IBM SkillsBuild",
        "duration": "4 weeks"
      },
      ...
    ]
  },
  "narrative": "Your forklift and quality control background qualifies you for 78% of Supply Chain Coordinator skills. We recommend 4 weeks of supply chain fundamentals via IBM SkillsBuild.",
  "transition_confidence_score": 0.78
}
```

---

## 🎮 Demo Highlights

The MVP focuses on demonstrating:

✅ **Skill Graph Visualization**: Interactive node-link diagram showing skill relationships  
✅ **Transition Confidence Score**: Prominent scoring (0.0–1.0) for each career path  
✅ **Michigan Labor Market Context**: All recommendations reference Michigan's economy  
✅ **IBM SkillsBuild Integration**: Learning resources from IBM's platform  
✅ **End-to-End Pipeline**: From resume upload → analysis → personalized recommendations  

🚫 **Out of Scope** (Hackathon MVP):

- Job board or job application integration
- ML model training
- Real-time job scraping
- Full LMS integration
- Multi-step workflow scenarios

---

## 🚀 Deployment

### Deploy to IBM Code Engine

```bash
# Build Docker image
docker build -t skilldna:latest .

# Push to container registry
docker tag skilldna:latest [YOUR_REGISTRY]/skilldna:latest
docker push [YOUR_REGISTRY]/skilldna:latest

# Deploy to Code Engine
ibmcloud ce app create \
  --name skilldna-api \
  --image [YOUR_REGISTRY]/skilldna:latest \
  --env-from-secret=skillsdna-env \
  --port 8000
```

### Deploy Agents to Orchestrate

```bash
# Import all agents
for agent_dir in agents/resume_intelligence agents/skill_translation agents/labor_market agents/upskilling agents/orchestration; do
  orchestrate agents import -k langgraph -f ./$agent_dir/
done

orchestrate agents list
```

---

## 📚 Documentation

- **[CLAUDE.md](./CLAUDE.md)**: Comprehensive technical guide for AI engineers
  - Detailed agent patterns
  - LLM prompt engineering rules
  - Data contract specifications
  - Build order & development workflow
  - Critical patterns & best practices

---

## 👥 Team & Roles

- **AI Engineer**: Agent pipeline, Orchestrate integration, FastAPI backend
- **Data Engineer**: Cloudant setup, data loading, skill/career dataset management
- **Frontend Developer**: React skill graph, UX/UI, API integration

---

## 🤝 Contributing

This is a hackathon project. Contributions follow these principles:

1. **Working demo > Perfect code** — prioritize features that demonstrate value
2. **Test agents in isolation** — each agent should be tested before wiring
3. **Maintain the SkillDNAState contract** — all agents must respect the shared state schema
4. **Michigan context always** — every prompt & recommendation should reference Michigan labor market
5. **Follow LangGraph patterns** — use the standard agent template from CLAUDE.md

---

## 📄 License

MIT License — see [LICENSE](./LICENSE) for details

---

## 🎯 Next Steps

1. **Implement SkillDNAState** (`agents/shared/state.py`)
2. **Setup LLM** (`agents/shared/llm.py`)
3. **Mock Cloudant** (`agents/shared/cloudant_client.py`)
4. **Build Resume Intelligence Agent** (test in isolation)
5. **Wire agents sequentially** in Orchestrate
6. **Deploy FastAPI backend**
7. **Connect React frontend**
8. **End-to-end testing**
9. **Demo & iterate**

For detailed build order, see [CLAUDE.md](./CLAUDE.md#build-order).

---

## 📞 Support

- Review [CLAUDE.md](./CLAUDE.md) for technical architecture & patterns
- Check `tests/` for example agent invocations
- Verify watsonx.ai connection with provided diagnostic scripts
- Ensure Python 3.11 is active in your environment

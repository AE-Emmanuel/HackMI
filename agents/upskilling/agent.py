"""Agent 4 — Upskilling Intelligence."""

from __future__ import annotations

import json

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables.config import RunnableConfig
from langgraph.graph import END, START, StateGraph

from agents.shared.json_utils import parse_json_response
from agents.shared.llm import get_json_llm
from agents.shared.state import SkillDNAState
from agents.upskilling.prompts import SYSTEM_PROMPT, USER_PROMPT_TEMPLATE


_INPUT_FIELDS = (
    # Agent 1
    "hard_skills",
    "soft_skills",
    "inferred_skills",
    "experience_context",
    "industry_background",
    "seniority_level",
    # Agent 2
    "transition_pathways",
    "bridge_skills",
    "career_matches",
    # Agent 3
    "scored_skills",
    "top_opportunities_ranked",
    "salary_intelligence",
    "michigan_opportunity_summary",
)

_OUTPUT_FIELDS = (
    "target_role",
    "overall_readiness_pct",
    "skills_to_acquire",
    "learning_roadmap_phases",
    "total_estimated_weeks",
    "total_estimated_months",
    "learning_resources",
    "michigan_specific_programs",
    "motivational_insight",
)


def upskilling_node(state: SkillDNAState) -> dict:
    combined = {k: state.get(k) for k in _INPUT_FIELDS if state.get(k) is not None}
    if not combined.get("top_opportunities_ranked") and not combined.get(
        "transition_pathways"
    ):
        raise ValueError(
            "Agent 4 requires Agent 3's top_opportunities_ranked OR Agent 2's "
            "transition_pathways in state."
        )

    llm = get_json_llm()
    response = llm.invoke(
        [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(
                content=USER_PROMPT_TEMPLATE.format(
                    combined_json=json.dumps(combined, indent=2, default=str)
                )
            ),
        ]
    )
    parsed = parse_json_response(response.content)
    return {k: parsed[k] for k in _OUTPUT_FIELDS if k in parsed}


def create_agent(config: RunnableConfig) -> StateGraph:
    workflow = StateGraph(SkillDNAState)
    workflow.add_node("upskilling", upskilling_node)
    workflow.add_edge(START, "upskilling")
    workflow.add_edge("upskilling", END)
    return workflow

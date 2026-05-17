"""Agent 2 — Skill Translation.

Consumes Agent 1's WorkerProfile fields and emits the SkillMap (adjacent
skills, bridge skills, transition pathways, career matches).
"""

from __future__ import annotations

import json

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables.config import RunnableConfig
from langgraph.graph import END, START, StateGraph

from agents.shared.json_utils import parse_json_response
from agents.shared.llm import get_json_llm
from agents.shared.state import SkillDNAState
from agents.skill_translation.prompts import SYSTEM_PROMPT, USER_PROMPT_TEMPLATE


_INPUT_FIELDS = (
    "hard_skills",
    "soft_skills",
    "certifications",
    "tools_and_technologies",
    "inferred_skills",
    "experience_context",
    "industry_background",
    "seniority_level",
    "work_history_summary",
    "education",
)

_OUTPUT_FIELDS = (
    "skill_adjacency_map",
    "bridge_skills",
    "transition_pathways",
    "career_matches",
    "hidden_career_matches",
)


def skill_translation_node(state: SkillDNAState) -> dict:
    profile = {k: state.get(k) for k in _INPUT_FIELDS if state.get(k) is not None}
    if not profile.get("hard_skills") and not profile.get("inferred_skills"):
        raise ValueError(
            "Agent 2 requires Agent 1's output in state (hard_skills/inferred_skills)."
        )

    llm = get_json_llm()
    response = llm.invoke(
        [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(
                content=USER_PROMPT_TEMPLATE.format(
                    worker_profile_json=json.dumps(profile, indent=2, default=str)
                )
            ),
        ]
    )
    parsed = parse_json_response(response.content)
    return {k: parsed[k] for k in _OUTPUT_FIELDS if k in parsed}


def create_agent(config: RunnableConfig) -> StateGraph:
    """Factory — returns UNCOMPILED StateGraph."""

    workflow = StateGraph(SkillDNAState)
    workflow.add_node("skill_translation", skill_translation_node)
    workflow.add_edge(START, "skill_translation")
    workflow.add_edge("skill_translation", END)
    return workflow

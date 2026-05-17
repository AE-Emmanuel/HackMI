"""Agent 1 — Resume Intelligence.

Parses raw resume text into a structured WorkerProfile (Agent 1's portion of
``SkillDNAState``). Returns an *uncompiled* StateGraph so the same factory
works for both local execution and a future watsonx Orchestrate import.
"""

from __future__ import annotations

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables.config import RunnableConfig
from langgraph.graph import END, START, StateGraph

from agents.resume_intelligence.prompts import SYSTEM_PROMPT, USER_PROMPT_TEMPLATE
from agents.shared.json_utils import parse_json_response
from agents.shared.llm import get_json_llm
from agents.shared.state import SkillDNAState


_AGENT_FIELDS = (
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


def resume_intelligence_node(state: SkillDNAState) -> dict:
    resume_text = state.get("resume_text", "")
    if not resume_text.strip():
        raise ValueError(
            "Agent 1 requires non-empty `resume_text` in state."
        )

    llm = get_json_llm()
    response = llm.invoke(
        [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=USER_PROMPT_TEMPLATE.format(resume_text=resume_text)),
        ]
    )
    parsed = parse_json_response(response.content)

    # Only write the fields this agent owns; ignore extras the LLM hallucinated.
    return {k: parsed[k] for k in _AGENT_FIELDS if k in parsed}


def create_agent(config: RunnableConfig) -> StateGraph:
    """Factory — returns an UNCOMPILED StateGraph (Orchestrate-compatible)."""

    workflow = StateGraph(SkillDNAState)
    workflow.add_node("resume_intelligence", resume_intelligence_node)
    workflow.add_edge(START, "resume_intelligence")
    workflow.add_edge("resume_intelligence", END)
    return workflow

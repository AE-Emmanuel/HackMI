"""Agent 3 — Labor Market Intelligence.

Pulls Michigan LMI data via ``agents.shared.lmi_client`` for every skill the
worker has or could acquire, injects matched rows into the prompt, and
emits a fully scored ScoredIntelligence JSON.
"""

from __future__ import annotations

import json
from typing import Iterable

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables.config import RunnableConfig
from langgraph.graph import END, START, StateGraph

from agents.labor_market.prompts import SYSTEM_PROMPT, USER_PROMPT_TEMPLATE
from agents.shared import lmi_client
from agents.shared.json_utils import parse_json_response
from agents.shared.llm import get_json_llm
from agents.shared.state import SkillDNAState


_AGENT1_FIELDS = (
    "hard_skills",
    "soft_skills",
    "inferred_skills",
    "experience_context",
    "industry_background",
    "seniority_level",
)

_AGENT2_FIELDS = (
    "bridge_skills",
    "skill_adjacency_map",
    "transition_pathways",
    "career_matches",
)

_OUTPUT_FIELDS = (
    "scored_skills",
    "skill_decay_warnings",
    "michigan_opportunity_summary",
    "top_opportunities_ranked",
    "salary_intelligence",
)


_MAX_SCORED_SKILLS = 15
"""Hard cap on the number of skills passed to Agent 3.

Granite-4-h-small caps output around ~4K tokens; scoring more than ~15 skills
overflows the response budget and truncates the JSON mid-array. Selection
order: bridge skills first (highest leverage), then existing top skills,
then adjacent skills.
"""


def _collect_skill_names(state: SkillDNAState) -> list[str]:
    """Gather skill names in priority order, capped to ``_MAX_SCORED_SKILLS``.

    Priority: bridge skills > top existing hard_skills > inferred skills >
    adjacent skills. This keeps the highest-leverage skills in the cut.
    """

    bucket_bridge: list[str] = []
    bucket_existing: list[str] = []
    bucket_inferred: list[str] = []
    bucket_adjacent: list[str] = []

    for entry in state.get("bridge_skills") or []:
        if isinstance(entry, dict) and entry.get("skill"):
            bucket_bridge.append(entry["skill"])

    bucket_existing.extend(state.get("hard_skills") or [])
    # Take only the first few soft skills — they rarely move scoring.
    bucket_existing.extend((state.get("soft_skills") or [])[:2])

    for entry in state.get("inferred_skills") or []:
        if isinstance(entry, dict) and entry.get("skill"):
            bucket_inferred.append(entry["skill"])
        elif isinstance(entry, str):
            bucket_inferred.append(entry)

    for entry in state.get("skill_adjacency_map") or []:
        if not isinstance(entry, dict):
            continue
        for adj in entry.get("adjacent_skills", []):
            if isinstance(adj, dict) and adj.get("skill"):
                bucket_adjacent.append(adj["skill"])

    seen: set[str] = set()
    out: list[str] = []
    for bucket in (bucket_bridge, bucket_existing, bucket_inferred, bucket_adjacent):
        for name in bucket:
            if not isinstance(name, str):
                continue
            key = name.casefold().strip()
            if not key or key in seen:
                continue
            seen.add(key)
            out.append(name)
            if len(out) >= _MAX_SCORED_SKILLS:
                return out
    return out


def _format_lmi_block(rows: Iterable[dict]) -> str:
    rows_list = list(rows)
    if not rows_list:
        return (
            "(No matching rows in the Michigan LMI CSV. Score skills from "
            "Michigan labor market reasoning alone and mark "
            '"demand_source": "LLM-reasoned (no LMI match)".)'
        )
    return json.dumps(rows_list, indent=2, default=str)


def labor_market_node(state: SkillDNAState) -> dict:
    skill_names = _collect_skill_names(state)
    lmi_rows = lmi_client.get_skills_bulk(skill_names) if skill_names else []

    combined = {
        "worker_profile": {k: state.get(k) for k in _AGENT1_FIELDS if state.get(k)},
        "skill_map": {k: state.get(k) for k in _AGENT2_FIELDS if state.get(k)},
        "skills_to_score": skill_names,
    }

    llm = get_json_llm()
    response = llm.invoke(
        [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(
                content=USER_PROMPT_TEMPLATE.format(
                    combined_json=json.dumps(combined, indent=2, default=str),
                    lmi_block=_format_lmi_block(lmi_rows),
                )
            ),
        ]
    )
    parsed = parse_json_response(response.content)
    return {k: parsed[k] for k in _OUTPUT_FIELDS if k in parsed}


def create_agent(config: RunnableConfig) -> StateGraph:
    """Factory — returns UNCOMPILED StateGraph."""

    workflow = StateGraph(SkillDNAState)
    workflow.add_node("labor_market", labor_market_node)
    workflow.add_edge(START, "labor_market")
    workflow.add_edge("labor_market", END)
    return workflow

"""Agent 5 — Orchestration & Final Payload Synthesis.

Most of the work here is deterministic Python re-shaping (joining Agent 3's
``scored_skills`` with Agent 4's ``skills_to_acquire`` into the frontend's
``skill_nodes``, deriving ``graph_edges``, flattening structures). A single
LLM call generates the personalized ``narrative`` and the locked-format
``signature_insight`` sentence.
"""

from __future__ import annotations

import json
import re
from typing import Optional

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables.config import RunnableConfig
from langgraph.graph import END, START, StateGraph

from agents.orchestration.prompts import (
    NARRATIVE_SYSTEM_PROMPT,
    NARRATIVE_USER_PROMPT_TEMPLATE,
)
from agents.shared.json_utils import parse_json_response
from agents.shared.llm import get_json_llm
from agents.shared.state import SkillDNAState


# ---------------------------------------------------------------------------
# Deterministic re-shaping helpers
# ---------------------------------------------------------------------------


def _index_skills_to_acquire(skills_to_acquire: list[dict]) -> dict[str, dict]:
    """Lookup by normalized skill name for join with scored_skills."""

    return {s["skill"].casefold(): s for s in skills_to_acquire if s.get("skill")}


def _build_skill_nodes(
    scored_skills: list[dict],
    skills_to_acquire: list[dict],
    target_role: Optional[str],
    salary_intelligence: dict,
) -> list[dict]:
    """Join Agent 3's scored_skills with Agent 4's skills_to_acquire."""

    sta_lookup = _index_skills_to_acquire(skills_to_acquire or [])
    uplift = salary_intelligence.get("highest_uplift_pct") if salary_intelligence else None
    uplift_str = f"+{int(uplift)}%" if uplift else None

    nodes: list[dict] = []
    for idx, scored in enumerate(scored_skills or [], start=1):
        sta = sta_lookup.get((scored.get("skill_name") or "").casefold(), {})
        opps = (
            [target_role] + (scored.get("top_hiring_industries_michigan") or [])
            if target_role
            else (scored.get("top_hiring_industries_michigan") or [])
        )
        nodes.append(
            {
                "id": f"node_{idx:03d}",
                "name": scored.get("skill_name"),
                "type": scored.get("skill_type"),
                "transferability_score": scored.get("transferability_score"),
                "michigan_opportunity_score": scored.get("michigan_opportunity_score"),
                "demand_score": scored.get("demand_score"),
                "career_stability_score": scored.get("career_stability_score"),
                "skill_leverage_score": scored.get("skill_leverage_score"),
                "learning_difficulty": sta.get("current_level")
                and ("low" if sta.get("target_level") == "basic" else "medium"),
                "salary_uplift_potential": uplift_str if scored.get("skill_type") == "bridge" else None,
                "learning_timeline": (
                    f"{sta['learning_timeline_weeks']} weeks"
                    if sta.get("learning_timeline_weeks")
                    else None
                ),
                "opportunities_unlocked": opps[:5],
                "growth_indicator": scored.get("growth_indicator"),
                "automation_risk": scored.get("automation_risk"),
            }
        )
    return nodes


def _build_graph_edges(skill_nodes: list[dict]) -> list[dict]:
    """Generate edges that wire the skill graph.

    Strategy (lightweight, deterministic):
    - Every "bridge" node fans OUT to every "adjacent" node with edge_type "unlocks".
    - Every "existing" node connects to every "bridge" node with edge_type "bridge".
    - Any node with growth_indicator == "declining" or automation_risk in
      {"high"} gets one "at_risk" self-edge (rendered as a warning halo).
    - Existing-to-existing pairs in the same first-hiring-industry get one
      "related" edge (limit to first few to keep graph readable).
    """

    by_type: dict[str, list[dict]] = {"existing": [], "adjacent": [], "bridge": []}
    for n in skill_nodes:
        t = n.get("type")
        if t in by_type:
            by_type[t].append(n)

    # Fallback: if Agent 3 didn't tag any skill as "bridge", promote the
    # top-leverage adjacent skills into the bridge bucket so the graph
    # still gets both "bridge" (existing -> bridge) and "unlocks" (bridge
    # -> adjacent) edges. We promote at most floor(N/2) (and never the last
    # adjacent) so at least one node remains in the adjacent bucket to
    # serve as a target for "unlocks" edges.
    if not by_type["bridge"] and len(by_type["adjacent"]) >= 2:
        adjacent_sorted = sorted(
            by_type["adjacent"],
            key=lambda n: (n.get("skill_leverage_score") or 0),
            reverse=True,
        )
        n_to_promote = max(1, len(adjacent_sorted) // 2)
        # Always leave at least one adjacent behind.
        n_to_promote = min(n_to_promote, len(adjacent_sorted) - 1)
        for promoted in adjacent_sorted[:n_to_promote]:
            by_type["bridge"].append(promoted)
            by_type["adjacent"].remove(promoted)

    edges: list[dict] = []

    for bridge in by_type["bridge"]:
        for adj in by_type["adjacent"]:
            edges.append(
                {
                    "source_id": bridge["id"],
                    "target_id": adj["id"],
                    "edge_type": "unlocks",
                    "label": "unlocks",
                }
            )

    for existing in by_type["existing"]:
        for bridge in by_type["bridge"]:
            edges.append(
                {
                    "source_id": existing["id"],
                    "target_id": bridge["id"],
                    "edge_type": "bridge",
                    "label": f"learn {bridge['name']} to bridge",
                }
            )

    for n in skill_nodes:
        if n.get("growth_indicator") == "declining" or n.get("automation_risk") == "high":
            edges.append(
                {
                    "source_id": n["id"],
                    "target_id": n["id"],
                    "edge_type": "at_risk",
                    "label": "at risk",
                }
            )

    # "related" edges between existing skills sharing a hiring industry (limited).
    related_added = 0
    for i, a in enumerate(by_type["existing"]):
        for b in by_type["existing"][i + 1 :]:
            ai = (a.get("opportunities_unlocked") or [])[:1]
            bi = (b.get("opportunities_unlocked") or [])[:1]
            if ai and bi and ai[0] == bi[0]:
                edges.append(
                    {
                        "source_id": a["id"],
                        "target_id": b["id"],
                        "edge_type": "related",
                        "label": "related",
                    }
                )
                related_added += 1
                if related_added >= 4:
                    break
        if related_added >= 4:
            break

    return edges


def _reshape_transitions(transitions: list[dict]) -> list[dict]:
    out: list[dict] = []
    for t in transitions or []:
        out.append(
            {
                "target_role": t.get("target_role"),
                "transition_confidence_score": t.get("transition_confidence_score"),
                "bridge_skills": t.get("bridge_skills_needed") or [],
                "salary_range": t.get("salary_range_michigan"),
                "demand_level": t.get("demand_level"),
                "estimated_transition_months": t.get("estimated_transition_months"),
                "why_reachable": t.get("why_reachable"),
            }
        )
    return out


def _reshape_decay(warnings: list[dict]) -> list[dict]:
    return [
        {
            "skill": w.get("skill"),
            "warning": w.get("warning"),
            "urgency": w.get("urgency"),
        }
        for w in (warnings or [])
    ]


def _reshape_michigan_programs(programs: list[dict]) -> list[dict]:
    return [
        {"program": p.get("program"), "url": p.get("url")}
        for p in (programs or [])
    ]


def _flatten_roadmap(phases: list[dict]) -> list[str]:
    out: list[str] = []
    week_cursor = 1
    for p in phases or []:
        dur = int(p.get("duration_weeks") or 0)
        end = week_cursor + dur - 1 if dur else week_cursor
        focus = p.get("focus") or p.get("phase_name") or "(unspecified)"
        out.append(f"Phase {p.get('phase')} (Weeks {week_cursor}–{end}): {focus}")
        week_cursor = end + 1
    return out


# ---------------------------------------------------------------------------
# LLM-driven narrative
# ---------------------------------------------------------------------------


_SIGNATURE_RE = re.compile(
    r"^You already qualify for \d+(?:\.\d+)?% of the skills required for .+?\. "
    r"Learning .+? could unlock a \d+(?:\.\d+)?% salary increase within \d+(?:\.\d+)? months\.$"
)


def _generate_narrative(state: SkillDNAState) -> dict:
    target_role = state.get("target_role") or "your top target role"
    readiness = state.get("overall_readiness_pct") or 0
    salary_intel = state.get("salary_intelligence") or {}
    uplift_pct = salary_intel.get("highest_uplift_pct") or salary_intel.get(
        "median_transition_uplift_pct"
    ) or 0
    months = state.get("total_estimated_months") or 4

    # Pick the #1 priority skill to acquire as the headline skill.
    sta = state.get("skills_to_acquire") or []
    headline_skill = next(
        (s.get("skill") for s in sta if s.get("priority") == 1),
        sta[0].get("skill") if sta else "the right next skill",
    )

    context = {
        "target_role": target_role,
        "overall_readiness_pct": readiness,
        "highest_uplift_pct": uplift_pct,
        "total_estimated_months": months,
        "headline_skill": headline_skill,
        "industry_background": state.get("industry_background"),
        "seniority_level": state.get("seniority_level"),
        "michigan_opportunity_summary": state.get("michigan_opportunity_summary"),
        "motivational_insight": state.get("motivational_insight"),
    }

    llm = get_json_llm()
    response = llm.invoke(
        [
            SystemMessage(content=NARRATIVE_SYSTEM_PROMPT),
            HumanMessage(
                content=NARRATIVE_USER_PROMPT_TEMPLATE.format(
                    context_json=json.dumps(context, indent=2, default=str)
                )
            ),
        ]
    )
    parsed = parse_json_response(response.content)

    # Fallback to a deterministic signature_insight if the LLM drifts from the
    # required format. The demo absolutely cannot ship without this sentence.
    sig = parsed.get("signature_insight", "").strip()
    if not _SIGNATURE_RE.match(sig):
        sig = (
            f"You already qualify for {int(readiness)}% of the skills required for "
            f"{target_role}. Learning {headline_skill} could unlock a "
            f"{int(uplift_pct)}% salary increase within {int(months)} months."
        )
        parsed["signature_insight"] = sig

    return {
        "narrative": parsed.get("narrative", "").strip(),
        "signature_insight": sig,
    }


# ---------------------------------------------------------------------------
# Node + factory
# ---------------------------------------------------------------------------


def orchestration_node(state: SkillDNAState) -> dict:
    scored_skills = state.get("scored_skills") or []
    skills_to_acquire = state.get("skills_to_acquire") or []
    target_role = state.get("target_role")
    salary_intelligence = state.get("salary_intelligence") or {}

    if not scored_skills:
        raise ValueError("Agent 5 requires Agent 3's `scored_skills` in state.")

    skill_nodes = _build_skill_nodes(
        scored_skills, skills_to_acquire, target_role, salary_intelligence
    )
    graph_edges = _build_graph_edges(skill_nodes)
    frontend_transitions = _reshape_transitions(state.get("transition_pathways") or [])
    decay_warnings = _reshape_decay(state.get("skill_decay_warnings") or [])
    michigan_programs = _reshape_michigan_programs(
        state.get("michigan_specific_programs") or []
    )
    learning_roadmap = _flatten_roadmap(state.get("learning_roadmap_phases") or [])

    top_opps = [
        opp.get("role")
        for opp in (state.get("top_opportunities_ranked") or [])
        if opp.get("role")
    ]

    estimated_current = salary_intelligence.get("estimated_current_salary_range", "")
    # Build a salary_context phrase from numbers we already have.
    salary_lines = []
    if estimated_current:
        salary_lines.append(f"Estimated current range: {estimated_current}.")
    if target_role:
        # Pull this target's salary range from the transition pathways.
        for t in frontend_transitions:
            if t.get("target_role") == target_role and t.get("salary_range"):
                salary_lines.append(
                    f"Transitioning to {target_role} could mean {t['salary_range']}."
                )
                break
    if salary_intelligence.get("highest_uplift_pct"):
        salary_lines.append(
            f"Highest projected uplift: +{int(salary_intelligence['highest_uplift_pct'])}%."
        )
    salary_context = " ".join(salary_lines).strip()

    months = state.get("total_estimated_months")
    estimated_timeline = (
        f"{months:g} months to job-ready" if months is not None else None
    )

    # Generate the narrative pair via LLM (with deterministic fallback).
    narrative_pair = _generate_narrative(
        {
            **state,
            # Pass the already-derived fields too so the LLM sees a coherent
            # context. (state is a TypedDict so this dict update is fine.)
        }
    )

    return {
        "narrative": narrative_pair["narrative"],
        "signature_insight": narrative_pair["signature_insight"],
        "skill_nodes": skill_nodes,
        "graph_edges": graph_edges,
        "frontend_transition_pathways": frontend_transitions,
        "top_opportunities": top_opps,
        "salary_context": salary_context,
        "decay_warnings": decay_warnings,
        "learning_roadmap": learning_roadmap,
        "frontend_learning_resources": state.get("learning_resources") or [],
        "michigan_programs": michigan_programs,
        "estimated_timeline": estimated_timeline,
    }


def create_agent(config: RunnableConfig) -> StateGraph:
    workflow = StateGraph(SkillDNAState)
    workflow.add_node("orchestration", orchestration_node)
    workflow.add_edge(START, "orchestration")
    workflow.add_edge("orchestration", END)
    return workflow

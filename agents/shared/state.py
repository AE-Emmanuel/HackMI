"""SkillDNA master state contract.

This is the single source of truth for the LangGraph state that flows through
all 5 agents. Every field maps directly to an output field in
``Contextfiles/AGENT_SCHEMAS.md``.

All inner TypedDicts use ``total=False`` so partial state is legal at every
stage of the pipeline (Agent 1 only fills Agent 1's fields, etc.).
"""

from __future__ import annotations

from typing import Annotated, List, Optional, TypedDict

from langchain_core.messages import BaseMessage


# ---------------------------------------------------------------------------
# Agent 1 — Resume Intelligence (WorkerProfile)
# ---------------------------------------------------------------------------


class InferredSkill(TypedDict, total=False):
    skill: str
    inferred_from: str
    confidence: str  # "high" | "medium" | "low"


class WorkHistoryItem(TypedDict, total=False):
    job_title: str
    company_type: str
    duration_years: float
    key_responsibilities: List[str]


class EducationItem(TypedDict, total=False):
    level: str
    field: str
    institution_type: str


# ---------------------------------------------------------------------------
# Agent 2 — Skill Translation (SkillMap)
# ---------------------------------------------------------------------------


class AdjacentSkill(TypedDict, total=False):
    skill: str
    adjacency_reason: str
    learning_difficulty: str  # "low" | "medium" | "high"
    learning_timeline_weeks: int


class SkillAdjacencyEntry(TypedDict, total=False):
    existing_skill: str
    adjacent_skills: List[AdjacentSkill]


class BridgeSkill(TypedDict, total=False):
    skill: str
    bridges_from: List[str]
    bridges_to: List[str]
    why_this_bridge: str
    learning_difficulty: str
    learning_timeline_weeks: int


class CareerTransition(TypedDict, total=False):
    target_role: str
    transition_type: str  # "adjacent" | "upward" | "lateral" | "pivot"
    transition_confidence_score: float
    matched_skills: List[str]
    gap_skills: List[str]
    bridge_skills_needed: List[str]
    salary_range_michigan: str
    demand_level: str
    why_reachable: str
    estimated_transition_months: int


class HiddenCareerMatch(TypedDict, total=False):
    role: str
    why_hidden: str
    michigan_relevance: str


# ---------------------------------------------------------------------------
# Agent 3 — Labor Market Intelligence (ScoredIntelligence)
# ---------------------------------------------------------------------------


class ScoredSkill(TypedDict, total=False):
    skill_name: str
    skill_type: str  # "existing" | "adjacent" | "bridge"
    transferability_score: float
    michigan_opportunity_score: float
    demand_score: float
    career_stability_score: float
    skill_leverage_score: float
    salary_range_michigan: str
    top_hiring_industries_michigan: List[str]
    growth_indicator: str  # "growing" | "stable" | "declining"
    automation_risk: str  # "very_low" | "low" | "medium" | "high"
    demand_source: str


class SkillDecayWarning(TypedDict, total=False):
    skill: str
    warning: str
    urgency: str  # "low" | "medium" | "high"
    projected_decline_pct: float


class MichiganOpportunitySummary(TypedDict, total=False):
    strongest_opportunity_region: str
    top_growth_sectors: List[str]
    worker_opportunity_tier: str
    narrative_hook: str


class RankedOpportunity(TypedDict, total=False):
    role: str
    opportunity_score: float
    why_now: str
    open_roles_estimate: str
    salary_uplift_from_current: str


class SalaryIntelligence(TypedDict, total=False):
    estimated_current_salary_range: str
    median_transition_uplift_pct: float
    highest_uplift_role: str
    highest_uplift_pct: float
    salary_data_source: str


# ---------------------------------------------------------------------------
# Agent 4 — Upskilling Intelligence (LearningPlan)
# ---------------------------------------------------------------------------


class SkillToAcquire(TypedDict, total=False):
    skill: str
    priority: int
    why_priority: str
    current_level: str
    target_level: str
    learning_timeline_weeks: int
    effort_hours_per_week: int


class LearningRoadmapPhase(TypedDict, total=False):
    phase: int
    phase_name: str
    duration_weeks: int
    focus: str
    milestone: str
    skills_covered: List[str]


class LearningResource(TypedDict, total=False):
    skill_target: str
    title: str
    provider: str
    url: str
    format: str
    duration: str
    cost: str
    priority: int


class MichiganProgram(TypedDict, total=False):
    program: str
    description: str
    url: str
    relevance: str


# ---------------------------------------------------------------------------
# Agent 5 — Orchestration (final frontend payload pieces)
# ---------------------------------------------------------------------------


class SkillNode(TypedDict, total=False):
    """Frontend-shaped skill node (used for the graph view)."""

    id: str
    name: str
    type: str  # "existing" | "adjacent" | "bridge"
    transferability_score: float
    michigan_opportunity_score: float
    demand_score: float
    career_stability_score: float
    skill_leverage_score: float
    learning_difficulty: Optional[str]
    salary_uplift_potential: Optional[str]
    learning_timeline: Optional[str]
    opportunities_unlocked: List[str]
    growth_indicator: Optional[str]
    automation_risk: Optional[str]


class GraphEdge(TypedDict, total=False):
    source_id: str
    target_id: str
    edge_type: str  # "bridge" | "unlocks" | "related" | "at_risk"
    label: str


class FrontendTransition(TypedDict, total=False):
    target_role: str
    transition_confidence_score: float
    bridge_skills: List[str]
    salary_range: str
    demand_level: str
    estimated_transition_months: int
    why_reachable: str


class FrontendDecayWarning(TypedDict, total=False):
    skill: str
    warning: str
    urgency: str


class FrontendMichiganProgram(TypedDict, total=False):
    program: str
    url: str


# ---------------------------------------------------------------------------
# Master state
# ---------------------------------------------------------------------------


class SkillDNAState(TypedDict, total=False):
    # --- Input ---
    resume_text: str
    session_id: str

    # --- Agent 1 output (WorkerProfile) ---
    hard_skills: List[str]
    soft_skills: List[str]
    certifications: List[str]
    tools_and_technologies: List[str]
    inferred_skills: List[InferredSkill]
    experience_context: str
    industry_background: str
    seniority_level: str
    work_history_summary: List[WorkHistoryItem]
    education: List[EducationItem]

    # --- Agent 2 output (SkillMap) ---
    skill_adjacency_map: List[SkillAdjacencyEntry]
    bridge_skills: List[BridgeSkill]
    transition_pathways: List[CareerTransition]
    career_matches: List[str]
    hidden_career_matches: List[HiddenCareerMatch]

    # --- Agent 3 output (ScoredIntelligence) ---
    scored_skills: List[ScoredSkill]
    skill_decay_warnings: List[SkillDecayWarning]
    michigan_opportunity_summary: MichiganOpportunitySummary
    top_opportunities_ranked: List[RankedOpportunity]
    salary_intelligence: SalaryIntelligence

    # --- Agent 4 output (LearningPlan) ---
    target_role: str
    overall_readiness_pct: float
    skills_to_acquire: List[SkillToAcquire]
    learning_roadmap_phases: List[LearningRoadmapPhase]
    total_estimated_weeks: int
    total_estimated_months: float
    learning_resources: List[LearningResource]
    michigan_specific_programs: List[MichiganProgram]
    motivational_insight: str

    # --- Agent 5 output (final skilldna_payload pieces) ---
    narrative: str
    signature_insight: str
    skill_nodes: List[SkillNode]
    graph_edges: List[GraphEdge]
    frontend_transition_pathways: List[FrontendTransition]
    top_opportunities: List[str]
    salary_context: str
    decay_warnings: List[FrontendDecayWarning]
    learning_roadmap: List[str]
    frontend_learning_resources: List[LearningResource]
    michigan_programs: List[FrontendMichiganProgram]
    estimated_timeline: str

    # --- LangGraph plumbing ---
    messages: Annotated[List[BaseMessage], "conversation history"]

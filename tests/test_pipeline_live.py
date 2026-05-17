"""Live end-to-end integration test for the SkillDNA pipeline.

This test calls watsonx.ai for every agent — it is slow (~2-5 minutes) and
will fail if ``.env`` is not populated. Run explicitly with::

    pytest tests/test_pipeline_live.py -m live -s

Skipped by default unless you opt in via the ``live`` marker.
"""

from __future__ import annotations

from typing import Any

import pytest

from skilldna.pipeline import run, to_payload


pytestmark = pytest.mark.live


@pytest.fixture(scope="module")
def pipeline_output(sample_resume_text: str) -> dict[str, Any]:
    return run(sample_resume_text, session_id="pytest-live")


@pytest.fixture(scope="module")
def payload(pipeline_output: dict[str, Any]) -> dict[str, Any]:
    return to_payload(pipeline_output)


class TestAgent1Outputs:
    def test_basic_profile(self, pipeline_output):
        assert pipeline_output["hard_skills"], "Agent 1 must produce hard_skills"
        assert pipeline_output["industry_background"]
        assert pipeline_output["seniority_level"] in {
            "entry",
            "mid-career",
            "senior",
            "experienced-trades",
        }


class TestAgent2Outputs:
    def test_transition_pathways(self, pipeline_output):
        paths = pipeline_output.get("transition_pathways") or []
        assert len(paths) >= 3, "Agent 2 must produce >=3 transition_pathways"
        for p in paths:
            score = p.get("transition_confidence_score")
            assert score is not None and 0.0 <= score <= 1.0
            # Realistic range from the schema doc note #3.
            assert 0.4 <= score <= 0.95, f"unrealistic confidence: {score}"


class TestAgent3Outputs:
    def test_scored_skills_in_range(self, pipeline_output):
        scored = pipeline_output.get("scored_skills") or []
        assert scored, "Agent 3 must produce scored_skills"
        for s in scored:
            for key in (
                "transferability_score",
                "michigan_opportunity_score",
                "demand_score",
                "career_stability_score",
                "skill_leverage_score",
            ):
                val = s.get(key)
                assert val is not None, f"{s['skill_name']} missing {key}"
                assert 0.0 <= val <= 1.0, f"{s['skill_name']}.{key}={val} out of [0,1]"

    def test_demand_source_present(self, pipeline_output):
        scored = pipeline_output.get("scored_skills") or []
        with_source = [s for s in scored if s.get("demand_source")]
        assert with_source, "at least one scored_skill must cite demand_source"


class TestAgent4Outputs:
    def test_skillsbuild_present(self, pipeline_output):
        resources = pipeline_output.get("learning_resources") or []
        providers = {r.get("provider") for r in resources}
        assert "IBM SkillsBuild" in providers, "IBM SkillsBuild is a judge signal"

    def test_michigan_programs_present(self, pipeline_output):
        programs = pipeline_output.get("michigan_specific_programs") or []
        names = {p.get("program") for p in programs}
        assert "Going PRO Talent Fund" in names

    def test_phase_durations_sum(self, pipeline_output):
        phases = pipeline_output.get("learning_roadmap_phases") or []
        total = pipeline_output.get("total_estimated_weeks")
        if phases and total:
            phase_sum = sum(p.get("duration_weeks", 0) for p in phases)
            assert phase_sum == total, (
                f"phase durations sum to {phase_sum}, total_estimated_weeks={total}"
            )


class TestAgent5Outputs:
    def test_signature_insight_pattern(self, payload):
        from agents.orchestration.agent import _SIGNATURE_RE

        assert _SIGNATURE_RE.match(
            payload["signature_insight"]
        ), f"signature drift: {payload['signature_insight']!r}"

    def test_graph_edges_populated(self, payload):
        edges = payload["graph_edges"]
        node_ids = {n["id"] for n in payload["skill_nodes"]}
        assert edges, "graph_edges must not be empty"
        for e in edges:
            assert e["source_id"] in node_ids
            assert e["target_id"] in node_ids
            assert e["edge_type"] in {"bridge", "unlocks", "related", "at_risk"}

    def test_payload_essentials(self, payload):
        for key in (
            "session_id",
            "narrative",
            "signature_insight",
            "skill_nodes",
            "graph_edges",
            "transition_pathways",
            "learning_roadmap",
            "estimated_timeline",
        ):
            assert payload.get(key), f"payload missing essential field: {key}"

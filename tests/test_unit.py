"""Unit tests that do NOT call watsonx.

Run with: ``pytest tests/test_unit.py``
"""

from __future__ import annotations

import pytest

from agents.orchestration.agent import (
    _build_graph_edges,
    _build_skill_nodes,
    _flatten_roadmap,
    _reshape_decay,
    _reshape_michigan_programs,
    _reshape_transitions,
    _SIGNATURE_RE,
)
from agents.shared import lmi_client
from agents.shared.json_utils import LLMJSONError, parse_json_response


# ---------------------------------------------------------------------------
# json_utils
# ---------------------------------------------------------------------------


class TestParseJsonResponse:
    def test_plain_json(self):
        assert parse_json_response('{"a": 1}') == {"a": 1}

    def test_fenced_with_json_lang(self):
        text = 'Sure! ```json\n{"a": 1}\n``` done'
        assert parse_json_response(text) == {"a": 1}

    def test_fenced_no_lang(self):
        text = "```\n{\"a\": 1}\n```"
        assert parse_json_response(text) == {"a": 1}

    def test_preamble_and_trailing_text(self):
        text = 'Here you go: {"a": 1, "b": [2, 3]} hope that helps!'
        assert parse_json_response(text) == {"a": 1, "b": [2, 3]}

    def test_empty_raises(self):
        with pytest.raises(LLMJSONError):
            parse_json_response("")

    def test_no_json_raises(self):
        with pytest.raises(LLMJSONError):
            parse_json_response("Nothing JSON here at all.")

    def test_non_object_raises(self):
        with pytest.raises(LLMJSONError):
            parse_json_response("[1, 2, 3]")


# ---------------------------------------------------------------------------
# lmi_client
# ---------------------------------------------------------------------------


class TestLMIClient:
    def test_available(self):
        # The CSV should be in data/ by now.
        assert lmi_client.is_available(), "data/michigan_lmi.csv missing"

    def test_known_skill_lookup(self):
        data = lmi_client.get_skill_data("MATLAB")
        assert data is not None
        assert data["match_count"] > 0
        assert 0 <= data["market_demand_share_pct"] <= 100
        assert data["top_industries"]

    def test_unknown_skill_returns_none(self):
        assert lmi_client.get_skill_data("ZZZNotARealSkillZZZ") is None

    def test_bulk_dedups(self):
        rows = lmi_client.get_skills_bulk(["SQL", "sql", "MATLAB"])
        names = [r["skill_name"].casefold() for r in rows]
        assert len(names) == len(set(names)), "bulk should de-dupe"

    def test_all_skills_nonempty(self):
        assert len(lmi_client.get_all_skills()) > 10


# ---------------------------------------------------------------------------
# orchestration helpers
# ---------------------------------------------------------------------------


class TestOrchestrationHelpers:
    def test_signature_regex_matches_documented_format(self):
        good = (
            "You already qualify for 71% of the skills required for "
            "Supply Chain Analyst. Learning SQL could unlock a "
            "27% salary increase within 5 months."
        )
        assert _SIGNATURE_RE.match(good)

    def test_signature_regex_rejects_drift(self):
        bad_examples = [
            "You qualify for 71% ...",
            "You already qualify for X% of the skills required for Foo. ...",
            "Random sentence with 71% and 27% but wrong structure.",
        ]
        for bad in bad_examples:
            assert not _SIGNATURE_RE.match(bad), f"should reject: {bad!r}"

    def test_build_skill_nodes_assigns_unique_ids(self):
        scored = [
            {
                "skill_name": "SQL",
                "skill_type": "bridge",
                "transferability_score": 0.9,
                "demand_score": 0.8,
            },
            {
                "skill_name": "Python",
                "skill_type": "existing",
                "transferability_score": 0.85,
                "demand_score": 0.8,
            },
        ]
        nodes = _build_skill_nodes(scored, [], target_role="Supply Chain Analyst", salary_intelligence={"highest_uplift_pct": 27})
        assert len(nodes) == 2
        assert nodes[0]["id"] != nodes[1]["id"]
        assert nodes[0]["id"].startswith("node_")

    def test_build_graph_edges_fallback_promotes_adjacent_when_no_bridge(self):
        nodes = [
            {"id": "n1", "name": "Existing A", "type": "existing", "skill_leverage_score": 0.5},
            {"id": "n2", "name": "Existing B", "type": "existing", "skill_leverage_score": 0.4},
            {"id": "n3", "name": "Adj A", "type": "adjacent", "skill_leverage_score": 0.9},
            {"id": "n4", "name": "Adj B", "type": "adjacent", "skill_leverage_score": 0.3},
        ]
        edges = _build_graph_edges(nodes)
        # The fallback should produce both "bridge" and "unlocks" edges.
        types = {e["edge_type"] for e in edges}
        assert "bridge" in types, "fallback must produce bridge edges"
        assert "unlocks" in types, "fallback must produce unlocks edges"

    def test_build_graph_edges_emits_at_risk_for_declining(self):
        nodes = [
            {"id": "n1", "name": "Declining", "type": "existing", "growth_indicator": "declining"},
            {"id": "n2", "name": "High Auto Risk", "type": "existing", "automation_risk": "high"},
        ]
        edges = _build_graph_edges(nodes)
        at_risk = [e for e in edges if e["edge_type"] == "at_risk"]
        assert len(at_risk) == 2

    def test_reshape_transitions(self):
        out = _reshape_transitions(
            [
                {
                    "target_role": "Foo",
                    "transition_confidence_score": 0.7,
                    "bridge_skills_needed": ["SQL"],
                    "salary_range_michigan": "$50k-$60k",
                    "demand_level": "high",
                    "estimated_transition_months": 5,
                    "why_reachable": "...",
                }
            ]
        )
        assert out[0]["bridge_skills"] == ["SQL"]
        assert out[0]["salary_range"] == "$50k-$60k"

    def test_reshape_decay_and_programs(self):
        assert _reshape_decay([{"skill": "CNC", "warning": "x", "urgency": "high"}])
        assert _reshape_michigan_programs(
            [{"program": "Going PRO", "url": "https://x", "description": "y", "relevance": "high"}]
        )[0] == {"program": "Going PRO", "url": "https://x"}

    def test_flatten_roadmap_ranges(self):
        phases = [
            {"phase": 1, "phase_name": "Found", "duration_weeks": 6, "focus": "SQL"},
            {"phase": 2, "phase_name": "App", "duration_weeks": 8, "focus": "Analytics"},
        ]
        out = _flatten_roadmap(phases)
        assert "Weeks 1–6" in out[0]
        assert "Weeks 7–14" in out[1]

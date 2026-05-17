"""End-to-end SkillDNA pipeline runner.

Wires Agents 1 -> 2 -> 3 -> 4 -> 5 into a single LangGraph ``StateGraph``
and exposes a CLI:

    python -m skilldna.pipeline tests/sample_resume.txt
    python -m skilldna.pipeline tests/Sam_CV.docx --out out.json
    python -m skilldna.pipeline tests/resume.pdf --verbose --trace events.jsonl

Supported resume formats: .txt, .md, .docx, .pdf, .rtf
(handled by :mod:`agents.shared.resume_loader`).

When watsonx Orchestrate is wired up later, each agent's ``create_agent``
factory will be imported by the Orchestrate ADK directly; this pipeline is
purely for local development and demos.
"""

from __future__ import annotations

import argparse
import json
import sys
import uuid
from pathlib import Path
from typing import Any

from langchain_core.runnables.config import RunnableConfig
from langgraph.graph import END, START, StateGraph

from agents.labor_market.agent import labor_market_node
from agents.orchestration.agent import orchestration_node
from agents.resume_intelligence.agent import resume_intelligence_node
from agents.shared.resume_loader import (
    ResumeExtractionError,
    load_resume,
    supported_extensions,
)
from agents.shared.state import SkillDNAState
from agents.skill_translation.agent import skill_translation_node
from agents.upskilling.agent import upskilling_node


def build_pipeline() -> StateGraph:
    """Construct (uncompiled) the full 5-agent StateGraph."""

    workflow = StateGraph(SkillDNAState)
    workflow.add_node("resume_intelligence", resume_intelligence_node)
    workflow.add_node("skill_translation", skill_translation_node)
    workflow.add_node("labor_market", labor_market_node)
    workflow.add_node("upskilling", upskilling_node)
    workflow.add_node("orchestration", orchestration_node)

    workflow.add_edge(START, "resume_intelligence")
    workflow.add_edge("resume_intelligence", "skill_translation")
    workflow.add_edge("skill_translation", "labor_market")
    workflow.add_edge("labor_market", "upskilling")
    workflow.add_edge("upskilling", "orchestration")
    workflow.add_edge("orchestration", END)
    return workflow


def run(resume_text: str, session_id: str | None = None) -> dict[str, Any]:
    """Run the pipeline end-to-end and return the final state dict."""

    session_id = session_id or f"local-{uuid.uuid4().hex[:8]}"
    graph = build_pipeline().compile()
    return graph.invoke(
        {"resume_text": resume_text, "session_id": session_id},
        config=RunnableConfig(recursion_limit=25),
    )


# ---------------------------------------------------------------------------
# Payload extraction — the final frontend shape.
# ---------------------------------------------------------------------------


_PAYLOAD_FIELDS = (
    "session_id",
    "industry_background",
    "seniority_level",
    "narrative",
    "signature_insight",
    "skill_nodes",
    "graph_edges",
    "frontend_transition_pathways",
    "top_opportunities",
    "salary_context",
    "decay_warnings",
    "learning_roadmap",
    "frontend_learning_resources",
    "michigan_programs",
    "estimated_timeline",
    "overall_readiness_pct",
)


def to_payload(state: dict) -> dict:
    """Project the rich pipeline state down to the frontend payload shape."""

    payload = {k: state.get(k) for k in _PAYLOAD_FIELDS}
    # Re-key the two fields that have an internal "frontend_" prefix.
    payload["transition_pathways"] = payload.pop("frontend_transition_pathways")
    payload["learning_resources"] = payload.pop("frontend_learning_resources")
    return payload


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def _parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run the SkillDNA agent pipeline.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "resume",
        type=Path,
        help=(
            "Path to a resume file. Supported: "
            + ", ".join(supported_extensions())
        ),
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=None,
        help="Optional output path. Defaults to stdout.",
    )
    parser.add_argument(
        "--session-id",
        default=None,
        help="Optional session id. Auto-generated if omitted.",
    )
    parser.add_argument(
        "--raw",
        action="store_true",
        help="Emit the full pipeline state instead of the frontend payload.",
    )
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Stream agent + LLM events to stderr while the pipeline runs.",
    )
    parser.add_argument(
        "--trace",
        type=Path,
        default=None,
        help="Write the full event log as JSONL to this path (UI-consumable).",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> None:
    args = _parse_args(argv or sys.argv[1:])

    try:
        resume_text = load_resume(args.resume)
    except ResumeExtractionError as exc:
        sys.exit(f"[ERROR] {exc}")

    print(
        f"[INFO ] loaded resume: {args.resume.name} ({len(resume_text)} chars)",
        file=sys.stderr,
        flush=True,
    )

    # Pick the runner. With --verbose or --trace we use the tracker version
    # so events stream out; otherwise we use the lean ``run`` path.
    if args.verbose or args.trace:
        # Local import keeps the tracker optional for cold imports.
        from skilldna.tracker import console_listener, run_with_trace

        listener = console_listener if args.verbose else None
        final_state, tracker = run_with_trace(
            resume_text,
            session_id=args.session_id,
            on_event=listener,
            trace_path=args.trace,
        )
        if args.trace:
            print(
                f"[INFO ] wrote trace: {args.trace} ({len(tracker.events)} events)",
                file=sys.stderr,
                flush=True,
            )
    else:
        final_state = run(resume_text, session_id=args.session_id)

    body = final_state if args.raw else to_payload(final_state)
    serialized = json.dumps(body, indent=2, default=str)
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(serialized)
        print(
            f"[INFO ] wrote payload: {args.out} ({len(serialized)} bytes)",
            file=sys.stderr,
            flush=True,
        )
    else:
        print(serialized)


if __name__ == "__main__":
    main()

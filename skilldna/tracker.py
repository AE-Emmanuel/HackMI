"""Pipeline tracker — surfaces what each agent is doing in real time.

Two consumers:
1. **CLI**: pretty-prints progress as the pipeline runs (one line per event).
2. **UI**: each event is JSON-serializable, so the whole event stream can be
   written to a JSONL file and tailed/replayed by the frontend.

Design:
- :class:`Event` is a frozen dataclass with everything a UI would need.
- :class:`PipelineTracker` exposes ``emit()`` and an ``events`` list. The
  pipeline runner pushes events into it; the CLI prints them; the UI reads
  the JSONL file we write at the end (or tails it live).
- :class:`LLMTracerCallback` plugs into LangChain to capture every LLM call
  with timing and (when available) token counts. It writes those into the
  tracker without any agent code having to know about it.
- :func:`run_with_trace` is the main entry point — same shape as
  :func:`skilldna.pipeline.run` but streams events as it goes.

Event kinds (stable strings — the UI keys off these):

    pipeline_start    : run kicked off (resume length, session id)
    pipeline_end      : run finished (total elapsed seconds, total events)
    node_start        : an agent node is about to execute
    node_end          : an agent node finished, includes a human summary
                        and elapsed_seconds
    llm_start         : an LLM call is about to be issued
    llm_end           : an LLM call returned (elapsed_seconds, tokens if known)
    metric            : a numeric measurement (e.g. "agent3.lmi_matches=12")
    info              : ad-hoc human-readable note
    error             : something blew up (includes traceback string)

Human-readable agent summaries live in :func:`summarize_node_output`. They
are the lines you actually want to show a user ("Agent 1 extracted 14 hard
skills, 5 inferred skills from AI Research background").
"""

from __future__ import annotations

import json
import time
import traceback
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Optional
from uuid import uuid4

from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.outputs import LLMResult
from langchain_core.runnables.config import RunnableConfig

from agents.shared.state import SkillDNAState
from skilldna.pipeline import build_pipeline, to_payload


# ---------------------------------------------------------------------------
# Event model
# ---------------------------------------------------------------------------


@dataclass
class Event:
    """One thing that happened during a pipeline run.

    ``payload`` is intentionally unstructured — different event kinds carry
    different shapes, but everything must be JSON-serializable.
    """

    kind: str
    node: Optional[str]
    summary: str
    payload: dict[str, Any] = field(default_factory=dict)
    elapsed_seconds: Optional[float] = None
    ts: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    def to_jsonl(self) -> str:
        return json.dumps(self.to_dict(), default=str)


# ---------------------------------------------------------------------------
# Human-readable summaries (the lines a UI / CLI shows)
# ---------------------------------------------------------------------------


# Friendly display names — the frontend can use these as agent labels too.
NODE_LABELS = {
    "resume_intelligence": "Agent 1 — Resume Intelligence",
    "skill_translation": "Agent 2 — Skill Translation",
    "labor_market": "Agent 3 — Labor Market Intelligence",
    "upskilling": "Agent 4 — Upskilling Intelligence",
    "orchestration": "Agent 5 — Orchestration",
}


def _count(seq: Any) -> int:
    return len(seq) if isinstance(seq, (list, tuple, dict)) else 0


def summarize_node_output(node: str, update: dict[str, Any]) -> str:
    """Return a one-line human summary of what an agent just produced."""

    if node == "resume_intelligence":
        return (
            f"extracted {_count(update.get('hard_skills'))} hard skills, "
            f"{_count(update.get('soft_skills'))} soft skills, "
            f"{_count(update.get('inferred_skills'))} inferred skills "
            f"| industry={update.get('industry_background')!r} "
            f"| seniority={update.get('seniority_level')!r}"
        )
    if node == "skill_translation":
        return (
            f"mapped {_count(update.get('skill_adjacency_map'))} skill-adjacency clusters, "
            f"{_count(update.get('bridge_skills'))} bridge skills, "
            f"{_count(update.get('transition_pathways'))} transition pathways"
        )
    if node == "labor_market":
        scored = update.get("scored_skills") or []
        sources = {s.get("demand_source", "")[:20] for s in scored}
        return (
            f"scored {len(scored)} skills "
            f"| {_count(update.get('skill_decay_warnings'))} decay warning(s) "
            f"| {_count(update.get('top_opportunities_ranked'))} ranked opportunities "
            f"| {len(sources)} distinct LMI sources"
        )
    if node == "upskilling":
        return (
            f"target={update.get('target_role')!r} "
            f"| readiness={update.get('overall_readiness_pct')}% "
            f"| {_count(update.get('skills_to_acquire'))} skills to acquire "
            f"| {_count(update.get('learning_resources'))} learning resources "
            f"| {_count(update.get('learning_roadmap_phases'))} roadmap phases"
        )
    if node == "orchestration":
        return (
            f"built {_count(update.get('skill_nodes'))} skill nodes, "
            f"{_count(update.get('graph_edges'))} graph edges "
            f"| narrative={len(update.get('narrative') or '')} chars"
        )
    return f"updated keys: {list(update.keys())}"


# ---------------------------------------------------------------------------
# Tracker
# ---------------------------------------------------------------------------


EventListener = Callable[[Event], None]


class PipelineTracker:
    """Collects events from a pipeline run.

    Use either the standalone :meth:`emit` API or hand the tracker as a
    callback to :class:`LLMTracerCallback` for automatic LLM event capture.

    ``listeners`` are called synchronously the moment an event is emitted —
    use this for live CLI output or to push to a WebSocket.
    """

    def __init__(self, listeners: list[EventListener] | None = None) -> None:
        self.events: list[Event] = []
        self.listeners: list[EventListener] = list(listeners or [])
        # Per-event-key start times for elapsed calculation.
        self._timers: dict[str, float] = {}
        self.run_id = uuid4().hex[:12]

    # -- core ----------------------------------------------------------------

    def emit(
        self,
        kind: str,
        summary: str,
        *,
        node: Optional[str] = None,
        payload: Optional[dict[str, Any]] = None,
        elapsed_seconds: Optional[float] = None,
    ) -> Event:
        event = Event(
            kind=kind,
            node=node,
            summary=summary,
            payload=payload or {},
            elapsed_seconds=elapsed_seconds,
        )
        self.events.append(event)
        for listener in self.listeners:
            try:
                listener(event)
            except Exception:  # pragma: no cover — listeners must not break the run
                pass
        return event

    # -- timing helpers ------------------------------------------------------

    def start_timer(self, key: str) -> None:
        self._timers[key] = time.perf_counter()

    def stop_timer(self, key: str) -> Optional[float]:
        start = self._timers.pop(key, None)
        if start is None:
            return None
        return round(time.perf_counter() - start, 3)

    # -- persistence --------------------------------------------------------

    def write_jsonl(self, path: str | Path) -> Path:
        """Persist every event as one JSON-per-line file (UI-consumable)."""

        out = Path(path)
        out.parent.mkdir(parents=True, exist_ok=True)
        with out.open("w", encoding="utf-8") as f:
            for event in self.events:
                f.write(event.to_jsonl() + "\n")
        return out


# ---------------------------------------------------------------------------
# LangChain callback — captures every LLM call
# ---------------------------------------------------------------------------


class LLMTracerCallback(BaseCallbackHandler):
    """Bridge from LangChain's callback system into our tracker.

    Captures ``on_llm_start`` / ``on_llm_end`` so the tracker can record one
    ``llm_start`` and one ``llm_end`` event per LLM call, with timing.
    """

    def __init__(self, tracker: PipelineTracker) -> None:
        super().__init__()
        self.tracker = tracker
        # run_id -> perf_counter when llm started
        self._starts: dict[str, float] = {}
        # Tracks the last node start time so we can attribute LLM calls to a node.
        self.current_node: Optional[str] = None

    def on_llm_start(  # type: ignore[override]
        self,
        serialized: dict[str, Any],
        prompts: list[str],
        *,
        run_id,
        **kwargs: Any,
    ) -> None:
        self._starts[str(run_id)] = time.perf_counter()
        # First ~120 chars of the user message — handy in CLI traces.
        preview = (prompts[-1] if prompts else "")[:120].replace("\n", " ")
        self.tracker.emit(
            kind="llm_start",
            summary=f"LLM call ({preview}...)" if preview else "LLM call",
            node=self.current_node,
            payload={
                "prompt_count": len(prompts),
                "prompt_preview": preview,
                "run_id": str(run_id),
            },
        )

    def on_llm_end(  # type: ignore[override]
        self,
        response: LLMResult,
        *,
        run_id,
        **kwargs: Any,
    ) -> None:
        start = self._starts.pop(str(run_id), None)
        elapsed = round(time.perf_counter() - start, 3) if start is not None else None

        usage = {}
        try:
            # ChatWatsonx surfaces token usage in llm_output["token_usage"] when available.
            tu = (response.llm_output or {}).get("token_usage") or {}
            if tu:
                usage = {k: v for k, v in tu.items() if isinstance(v, (int, float))}
        except Exception:  # pragma: no cover
            usage = {}

        first_text = ""
        try:
            first_text = response.generations[0][0].text[:80].replace("\n", " ")
        except Exception:  # pragma: no cover
            pass

        self.tracker.emit(
            kind="llm_end",
            summary=(
                f"LLM returned in {elapsed:.2f}s"
                if elapsed is not None
                else "LLM returned"
            ) + (f" | usage={usage}" if usage else ""),
            node=self.current_node,
            payload={
                "usage": usage,
                "response_preview": first_text,
                "run_id": str(run_id),
            },
            elapsed_seconds=elapsed,
        )

    def on_llm_error(  # type: ignore[override]
        self, error: BaseException, *, run_id, **kwargs: Any
    ) -> None:
        self.tracker.emit(
            kind="error",
            summary=f"LLM error: {error}",
            node=self.current_node,
            payload={
                "exception_type": type(error).__name__,
                "run_id": str(run_id),
            },
        )


# ---------------------------------------------------------------------------
# Pretty console listener
# ---------------------------------------------------------------------------


_KIND_PREFIX = {
    "pipeline_start": "[START]",
    "pipeline_end": "[ DONE]",
    "node_start": "[ NODE]",
    "node_end": "[ OK  ]",
    "llm_start": "[ LLM ]",
    "llm_end": "[ LLM ]",
    "metric": "[ STAT]",
    "info": "[INFO ]",
    "error": "[ERROR]",
}


def console_listener(event: Event) -> None:
    """Default listener: print one tidy line per event to stdout."""

    prefix = _KIND_PREFIX.get(event.kind, "[ ??? ]")
    elapsed = f" ({event.elapsed_seconds:.2f}s)" if event.elapsed_seconds else ""
    node_label = NODE_LABELS.get(event.node, event.node) if event.node else None
    node_str = f" {node_label}" if node_label else ""
    print(f"{prefix}{node_str} {event.summary}{elapsed}", flush=True)


# ---------------------------------------------------------------------------
# Top-level run-with-trace
# ---------------------------------------------------------------------------


def run_with_trace(
    resume_text: str,
    *,
    session_id: Optional[str] = None,
    on_event: Optional[EventListener] = None,
    trace_path: Optional[str | Path] = None,
) -> tuple[dict[str, Any], PipelineTracker]:
    """Run the pipeline end-to-end while emitting events.

    Args:
        resume_text: The full resume text (use ``resume_loader.load_resume``).
        session_id: Optional session id; auto-generated if omitted.
        on_event: Optional callback fired the instant any event lands.
            For CLI use, pass :func:`console_listener`.
        trace_path: Optional JSONL output path; written after the run.

    Returns:
        ``(final_state, tracker)`` — final pipeline state + the tracker with
        the full event log. Call ``to_payload(final_state)`` to get the
        frontend-shaped payload.
    """

    listeners: list[EventListener] = []
    if on_event is not None:
        listeners.append(on_event)
    tracker = PipelineTracker(listeners=listeners)

    callbacks = [LLMTracerCallback(tracker)]
    config = RunnableConfig(callbacks=callbacks, recursion_limit=25)

    session_id = session_id or f"trace-{tracker.run_id}"
    initial_state: SkillDNAState = {  # type: ignore[typeddict-item]
        "resume_text": resume_text,
        "session_id": session_id,
    }

    tracker.emit(
        kind="pipeline_start",
        summary=f"resume={len(resume_text)} chars, session={session_id}",
        payload={
            "session_id": session_id,
            "resume_length": len(resume_text),
            "run_id": tracker.run_id,
        },
    )

    graph = build_pipeline().compile()

    final_state: dict[str, Any] = dict(initial_state)
    pipeline_started = time.perf_counter()

    try:
        # stream_mode="updates" yields {node_name: <delta>} after each node.
        for chunk in graph.stream(initial_state, config=config, stream_mode="updates"):
            for node, update in chunk.items():
                if node in NODE_LABELS:
                    # We can't know exactly when the node started (LangGraph
                    # yields only after completion), so node_start is emitted
                    # right before we issue the node_end. The LLM callback
                    # captures real timing for the LLM portion of the work.
                    callbacks[0].current_node = node
                    tracker.emit(
                        kind="node_start",
                        summary="starting",
                        node=node,
                        payload={"node": node},
                    )
                    summary = summarize_node_output(node, update or {})
                    tracker.emit(
                        kind="node_end",
                        summary=summary,
                        node=node,
                        payload={
                            "node": node,
                            "updated_keys": list((update or {}).keys()),
                        },
                    )
                    if update:
                        final_state.update(update)
        elapsed = round(time.perf_counter() - pipeline_started, 3)
        tracker.emit(
            kind="pipeline_end",
            summary=f"{elapsed:.2f}s, {len(tracker.events)} events",
            payload={"event_count": len(tracker.events)},
            elapsed_seconds=elapsed,
        )
    except Exception as exc:
        tracker.emit(
            kind="error",
            summary=f"{type(exc).__name__}: {exc}",
            payload={
                "exception_type": type(exc).__name__,
                "traceback": traceback.format_exc(),
            },
        )
        if trace_path:
            tracker.write_jsonl(trace_path)
        raise
    finally:
        if trace_path:
            tracker.write_jsonl(trace_path)

    return final_state, tracker


__all__ = [
    "Event",
    "EventListener",
    "LLMTracerCallback",
    "NODE_LABELS",
    "PipelineTracker",
    "console_listener",
    "run_with_trace",
    "summarize_node_output",
    "to_payload",
]

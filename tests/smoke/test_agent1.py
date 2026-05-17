"""Smoke test for Agent 1 — Resume Intelligence.

Run from project root:
    python tests/smoke/test_agent1.py
"""

import json
import sys
from pathlib import Path

# Make sure the project root is on sys.path when run as a script.
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from langchain_core.runnables.config import RunnableConfig  # noqa: E402

from agents.resume_intelligence.agent import create_agent  # noqa: E402


def main() -> None:
    resume_path = ROOT / "tests" / "sample_resume.txt"
    resume_text = resume_path.read_text()

    graph = create_agent(RunnableConfig()).compile()
    result = graph.invoke({"resume_text": resume_text, "session_id": "smoke-agent1"})

    # Only print the fields Agent 1 owns.
    fields = (
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
    printable = {k: result.get(k) for k in fields}
    print(json.dumps(printable, indent=2, default=str))

    # Minimal assertions.
    assert result.get("hard_skills"), "hard_skills must be non-empty"
    assert result.get("industry_background"), "industry_background required"
    assert result.get("seniority_level") in {
        "entry",
        "mid-career",
        "senior",
        "experienced-trades",
    }, f"unexpected seniority_level: {result.get('seniority_level')!r}"
    print("\n[OK] Agent 1 smoke test passed.")


if __name__ == "__main__":
    main()

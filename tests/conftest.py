"""Shared pytest fixtures for SkillDNA agent tests.

Most tests in this suite are **live integration tests** that call watsonx.ai.
They are slow (minutes per pipeline run) and require ``.env`` to be populated.

The marker ``@pytest.mark.live`` lets you skip them with::

    pytest -m "not live"
"""

from __future__ import annotations

from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
RESUME_PATH = ROOT / "tests" / "sample_resume.txt"


@pytest.fixture(scope="session")
def sample_resume_text() -> str:
    if not RESUME_PATH.exists():
        pytest.skip(f"Sample resume not found at {RESUME_PATH}")
    return RESUME_PATH.read_text()


@pytest.fixture(scope="session")
def project_root() -> Path:
    return ROOT

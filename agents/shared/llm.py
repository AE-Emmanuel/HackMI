"""watsonx.ai ChatWatsonx initialization.

Two flavors:
- ``get_llm()`` — general-purpose, temperature 0.2 (per CLAUDE.md).
- ``get_json_llm()`` — tuned for strict JSON output, temperature 0.1.

Both read credentials from environment (``.env``) and use the
``ibm/granite-3-3-8b-instruct`` model as mandated by CLAUDE.md.
"""

from __future__ import annotations

import os

from dotenv import load_dotenv
from langchain_ibm import ChatWatsonx

load_dotenv()

_MODEL_ID = os.getenv("SKILLDNA_MODEL_ID", "ibm/granite-4-h-small")


def _build(temperature: float, max_tokens: int = 2000) -> ChatWatsonx:
    """Build a ChatWatsonx client.

    Note: chat-style watsonx models (e.g. ``ibm/granite-4-h-small``) use the
    OpenAI-style ``max_tokens`` param, NOT the older ``max_new_tokens``. The
    SDK silently ignores the wrong key and applies a 1024-token default,
    which causes JSON truncation on long resumes.
    """

    return ChatWatsonx(
        model_id=_MODEL_ID,
        url=os.getenv("WATSONX_URL"),
        project_id=os.getenv("WATSONX_PROJECT_ID"),
        params={
            "max_tokens": max_tokens,
            "temperature": temperature,
        },
    )


def get_llm() -> ChatWatsonx:
    """General-purpose Granite LLM (temperature 0.2)."""

    return _build(temperature=0.2)


def get_json_llm() -> ChatWatsonx:
    """Granite tuned for strict JSON output (temperature 0.1, generous output cap).

    The 8000-token ceiling keeps the deeply nested Agent 3/4 schemas safe
    from truncation on long resumes.
    """

    return _build(temperature=0.1, max_tokens=8000)

"""Robust JSON extraction from LLM responses.

Granite (and most instruction-tuned models) occasionally wraps JSON in
markdown fences, adds preamble like "Here is the JSON:", or trails with
explanatory text. This module centralizes the parsing so every agent gets
the same forgiving behavior.
"""

from __future__ import annotations

import json
import re
from typing import Any


_FENCE_RE = re.compile(r"```(?:json)?\s*(.*?)\s*```", re.DOTALL | re.IGNORECASE)


class LLMJSONError(ValueError):
    """Raised when an LLM response cannot be coerced into JSON."""

    def __init__(self, message: str, raw: str) -> None:
        super().__init__(f"{message}\n--- RAW LLM OUTPUT ---\n{raw}")
        self.raw = raw


def _find_json_blob(text: str) -> str:
    """Return the substring most likely to be the JSON object.

    Strategy:
    1. If the text contains a ```json ... ``` fence, return its inner body.
    2. Otherwise, return the substring spanning the first ``{`` to the last ``}``.
    """

    fence = _FENCE_RE.search(text)
    if fence:
        return fence.group(1).strip()

    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise LLMJSONError("No JSON object found in LLM response.", raw=text)
    return text[start : end + 1]


def parse_json_response(text: str) -> dict[str, Any]:
    """Coerce an LLM response into a Python dict.

    Raises :class:`LLMJSONError` with the raw text on failure so callers can
    log and retry intelligently.
    """

    if not text or not text.strip():
        raise LLMJSONError("LLM response is empty.", raw=text)

    blob = _find_json_blob(text)
    try:
        parsed = json.loads(blob)
    except json.JSONDecodeError as exc:
        raise LLMJSONError(f"json.loads failed: {exc}", raw=text) from exc

    if not isinstance(parsed, dict):
        raise LLMJSONError(
            f"Expected JSON object at top level, got {type(parsed).__name__}.",
            raw=text,
        )
    return parsed

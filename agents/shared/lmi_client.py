"""Michigan Labor Market Intelligence (LMI) client — CSV-backed.

The CSV is **job-row indexed**. Each row describes a job title in Michigan
with associated demand, growth, region, industry, and a list of skill
tokens. Skills are not first-class rows — they are tokens inside two
text columns:

- ``Derived_Skill_DNA_Tokens`` — uppercase, comma-separated.
- ``Top_In_Demand_Technologies_MI (80% Share)`` — title-case,
  comma-separated.

The public API hides this shape so agents can ask
``get_skill_data("SQL")`` and receive aggregated demand/growth/industry
stats computed across every row where the skill appears.

CSV location: ``<project_root>/data/michigan_lmi.csv``
Override via env: ``SKILLDNA_LMI_CSV=/path/to/other.csv``

The eventual Cloudant client will expose the same function signatures
so swapping the backend means rewriting bodies only.
"""

from __future__ import annotations

import os
import re
from functools import lru_cache
from pathlib import Path
from typing import Optional

import pandas as pd

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

_PROJECT_ROOT = Path(__file__).resolve().parents[2]
_DEFAULT_CSV = _PROJECT_ROOT / "data" / "michigan_lmi.csv"
_CSV_PATH = Path(os.getenv("SKILLDNA_LMI_CSV", _DEFAULT_CSV))

# Column names in the CSV. Centralized so a column rename is a one-line fix.
COL_JOB_TITLE = "Job_Title"
COL_INDUSTRY = "Industry_Sector"
COL_REGION = "Region"
COL_TOP_TECH = "Top_In_Demand_Technologies_MI (80% Share)"
COL_SKILL_TOKENS = "Derived_Skill_DNA_Tokens"
COL_DEMAND_PCT = "Market_Demand_Share_Pct"
COL_GROWTH_PCT = "Projected_Growth_Rate_2026_Pct"

_TOKEN_SPLIT_RE = re.compile(r"\s*,\s*")


# ---------------------------------------------------------------------------
# Internals
# ---------------------------------------------------------------------------


def _normalize(token: str) -> str:
    """Canonical form for skill matching: case-folded, whitespace-collapsed."""

    return re.sub(r"\s+", " ", token).strip().casefold()


def _split_tokens(cell: object) -> list[str]:
    if not isinstance(cell, str) or not cell.strip():
        return []
    return [t.strip() for t in _TOKEN_SPLIT_RE.split(cell) if t.strip()]


@lru_cache(maxsize=1)
def _df() -> Optional[pd.DataFrame]:
    """Load the CSV once, plus a normalized-tokens helper column. None if missing."""

    if not _CSV_PATH.exists():
        return None
    df = pd.read_csv(_CSV_PATH)

    def all_tokens(row: pd.Series) -> set[str]:
        tokens = _split_tokens(row.get(COL_SKILL_TOKENS, "")) + _split_tokens(
            row.get(COL_TOP_TECH, "")
        )
        return {_normalize(t) for t in tokens}

    df["_skill_tokens_norm"] = df.apply(all_tokens, axis=1)
    return df


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def is_available() -> bool:
    """True if the CSV is present and loadable."""

    return _df() is not None


def get_career_data(job_title: str) -> Optional[dict]:
    """Return the LMI row for ``job_title`` (case-insensitive exact match).

    Result keys mirror the CSV columns plus a ``skill_tokens`` list of
    canonicalized skill strings for that job.
    """

    df = _df()
    if df is None:
        return None
    mask = df[COL_JOB_TITLE].astype(str).str.casefold() == job_title.casefold()
    matches = df[mask]
    if matches.empty:
        return None
    row = matches.iloc[0]
    return {
        "job_title": row[COL_JOB_TITLE],
        "industry_sector": row.get(COL_INDUSTRY),
        "region": row.get(COL_REGION),
        "market_demand_share_pct": float(row[COL_DEMAND_PCT])
        if pd.notna(row.get(COL_DEMAND_PCT))
        else None,
        "projected_growth_rate_2026_pct": float(row[COL_GROWTH_PCT])
        if pd.notna(row.get(COL_GROWTH_PCT))
        else None,
        "top_in_demand_technologies": _split_tokens(row.get(COL_TOP_TECH, "")),
        "derived_skill_dna_tokens": _split_tokens(row.get(COL_SKILL_TOKENS, "")),
    }


def get_skill_data(skill_name: str) -> Optional[dict]:
    """Aggregate LMI stats for a skill across every job row it appears in.

    Returns ``None`` if the CSV isn't loaded or the skill never appears.

    Result shape::

        {
          "skill_name": "SQL",
          "match_count": 87,
          "market_demand_share_pct": 18.3,   # mean across matching rows
          "projected_growth_rate_2026_pct": 12.4,
          "top_industries": ["EV...", "Healthcare...", ...],   # top 5 by frequency
          "top_regions": ["Southeast Michigan", ...],
          "top_jobs": ["Supply Chain Analyst", ...],           # top 10 by frequency
          "appears_in_top_technologies": True,                  # True if skill is in the
                                                                # "Top_In_Demand_Technologies"
                                                                # column anywhere
          "source_columns": ["Derived_Skill_DNA_Tokens", "Top_In_Demand_Technologies_MI"],
        }
    """

    df = _df()
    if df is None:
        return None

    needle = _normalize(skill_name)
    mask = df["_skill_tokens_norm"].apply(lambda tokens: needle in tokens)
    matches = df[mask]
    if matches.empty:
        return None

    appears_in_top_tech = bool(
        matches[COL_TOP_TECH]
        .fillna("")
        .apply(lambda s: needle in {_normalize(t) for t in _split_tokens(s)})
        .any()
    )

    source_columns: list[str] = []
    if (
        matches[COL_SKILL_TOKENS]
        .fillna("")
        .apply(lambda s: needle in {_normalize(t) for t in _split_tokens(s)})
        .any()
    ):
        source_columns.append(COL_SKILL_TOKENS)
    if appears_in_top_tech:
        source_columns.append(COL_TOP_TECH)

    return {
        "skill_name": skill_name,
        "match_count": int(len(matches)),
        "market_demand_share_pct": round(float(matches[COL_DEMAND_PCT].mean()), 1),
        "projected_growth_rate_2026_pct": round(
            float(matches[COL_GROWTH_PCT].mean()), 1
        ),
        "top_industries": matches[COL_INDUSTRY]
        .value_counts()
        .head(3)
        .index.tolist(),
        "top_jobs": matches[COL_JOB_TITLE].value_counts().head(3).index.tolist(),
        "appears_in_top_technologies": appears_in_top_tech,
    }


def get_skills_bulk(skill_names: list[str]) -> list[dict]:
    """Return aggregated LMI stats for each skill (skipping misses).

    Used by Agent 3 to build the ``Michigan LMI Data:`` block in its prompt.
    Preserves input order and de-duplicates case-insensitively.
    """

    seen: set[str] = set()
    out: list[dict] = []
    for name in skill_names:
        key = _normalize(name)
        if not key or key in seen:
            continue
        seen.add(key)
        data = get_skill_data(name)
        if data is not None:
            out.append(data)
    return out


@lru_cache(maxsize=1)
def get_all_skills() -> list[str]:
    """Every unique skill token across both token columns, sorted by frequency.

    Useful for fuzzy matching when Agent 1's extracted skills don't exactly
    align with the CSV's vocabulary.
    """

    df = _df()
    if df is None:
        return []

    counter: dict[str, tuple[int, str]] = {}
    for col in (COL_SKILL_TOKENS, COL_TOP_TECH):
        for cell in df[col].fillna(""):
            for tok in _split_tokens(cell):
                key = _normalize(tok)
                if not key:
                    continue
                count, display = counter.get(key, (0, tok))
                counter[key] = (count + 1, display)
    ordered = sorted(counter.values(), key=lambda x: -x[0])
    return [display for _count, display in ordered]


def get_all_job_titles() -> list[str]:
    """Every distinct job title in the CSV."""

    df = _df()
    if df is None:
        return []
    return df[COL_JOB_TITLE].dropna().astype(str).unique().tolist()


# ---------------------------------------------------------------------------
# Cloudant-compatible session helpers — no-ops for now.
# ---------------------------------------------------------------------------


def save_session(session_id: str, payload: dict) -> None:
    """No-op stub. Real impl writes to Cloudant ``sessions_db``."""

    return None


def get_session(session_id: str) -> Optional[dict]:
    """No-op stub. Real impl reads from Cloudant ``sessions_db``."""

    return None

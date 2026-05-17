"""Shared prompt fragments used across every agent.

The Michigan context block is mandatory in every system prompt
(per CLAUDE.md and the schema doc). Define it once here, import it
into each agent's ``prompts.py``.
"""

MICHIGAN_CONTEXT = """\
Michigan workforce context you MUST keep in mind:
- Michigan is undergoing an EV / battery manufacturing transition. Traditional ICE
  automotive roles are contracting while EV supply chain, battery manufacturing,
  and operations-tech roles are growing rapidly.
- Manufacturing modernization (automation, robotics, MES systems) is increasing
  demand for workers who can bridge floor operations with data and analytics.
- Healthcare operations and logistics tech are large secondary growth sectors.
- Target audience: working-class Michigan residents (HS / Associate degree
  common, skilled trades, mid-career manufacturing workers). Recommendations
  must be practical and achievable, not aspirational.
- Regional centers: Southeast Michigan (Metro Detroit) for automotive/EV,
  Grand Rapids for office furniture & supply chain, Lansing for state ops.
"""


JSON_DIRECTIVE = (
    "Return ONLY valid JSON matching the schema below. "
    "No preamble, no explanation, no markdown code blocks. "
    "Your entire response must be parseable by json.loads()."
)

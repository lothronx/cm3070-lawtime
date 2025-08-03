"""Quality gate for specialist extraction validation."""

from typing import Literal

from ..utils.state import AgentState


def check_extraction_success(
    state: AgentState,
) -> Literal["aggregate_and_format", "extract_general_task"]:
    """Act as quality gate and implement self-correcting loop.

    If validation passed, proceed to final formatting.
    If validation failed, re-route to general task extraction.
    """
    validation_passed = state.get("validation_passed", False)

    if validation_passed:
        return "aggregate_and_format"
    else:
        return "extract_general_task"
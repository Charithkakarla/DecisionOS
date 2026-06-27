# Contains: validator.py — Strategy Package validation for the Strategy Intelligence Agent.
import logging
from app.schemas.state import StrategyPackage

logger = logging.getLogger("decision_os.strategy.validator")

VALID_PRIORITIES = {"Critical", "High", "Medium", "Low"}
VALID_COMPLEXITIES = {"Low", "Medium", "High"}
VALID_SCENARIOS = {"optimistic", "realistic", "conservative"}


class StrategyValidationError(ValueError):
    """Raised when a StrategyPackage fails validation checks."""
    pass


def validate_strategy_package(pkg: StrategyPackage) -> None:
    """
    Enforce bounds and structural integrity on a StrategyPackage.

    Raises:
        StrategyValidationError: on the first validation failure encountered.
    """
    logger.info("Validating compiled StrategyPackage...")

    # 1. Success Probability
    if not (0.0 <= pkg.estimated_success_probability <= 1.0):
        raise StrategyValidationError(
            f"estimated_success_probability ({pkg.estimated_success_probability}) "
            "must be in range [0.0, 1.0]."
        )

    # 2. ROI
    if pkg.estimated_roi < 0.0:
        raise StrategyValidationError(
            f"estimated_roi ({pkg.estimated_roi}) cannot be negative."
        )

    # 3. Confidence
    if not (0.0 <= pkg.confidence <= 1.0):
        raise StrategyValidationError(
            f"confidence ({pkg.confidence}) must be in range [0.0, 1.0]."
        )

    # 4. Priority
    if pkg.priority not in VALID_PRIORITIES:
        raise StrategyValidationError(
            f"priority '{pkg.priority}' is not valid. Must be one of {VALID_PRIORITIES}."
        )

    # 5. Complexity
    if pkg.implementation_complexity not in VALID_COMPLEXITIES:
        raise StrategyValidationError(
            f"implementation_complexity '{pkg.implementation_complexity}' is not valid. "
            f"Must be one of {VALID_COMPLEXITIES}."
        )

    # 6. Execution Plan must have at least one phase
    if not pkg.execution_plan:
        raise StrategyValidationError(
            "execution_plan must contain at least one ExecutionPhase."
        )

    # 7. Each execution phase must have a positive duration
    for idx, phase in enumerate(pkg.execution_plan):
        if phase.duration_days < 1:
            raise StrategyValidationError(
                f"ExecutionPhase at index {idx} ('{phase.name}') has duration_days < 1."
            )

    # 8. Scenarios must cover all three types
    if pkg.scenarios:
        scenario_types = {s.scenario_type for s in pkg.scenarios}
        missing = VALID_SCENARIOS - scenario_types
        if missing:
            raise StrategyValidationError(
                f"StrategyPackage is missing scenario types: {missing}."
            )

    # 9. Selected scenario must be valid
    if pkg.selected_scenario not in VALID_SCENARIOS:
        raise StrategyValidationError(
            f"selected_scenario '{pkg.selected_scenario}' must be one of {VALID_SCENARIOS}."
        )

    # 10. Cost must be non-negative
    if pkg.estimated_cost < 0.0:
        raise StrategyValidationError(
            f"estimated_cost ({pkg.estimated_cost}) cannot be negative."
        )

    logger.info("StrategyPackage successfully validated.")

"""
Risk scoring for road segments.

Phase 0/1 decision point: once data recon is done, this will be either
(a) a rule-based weighted score (if we don't have labeled disruption
    data to train against), or
(b) a trained classifier (logistic regression / random forest / etc.)
    if Phase 0 confirms we have historical incident labels.

Start with (a) — it's honest, fast to build, and still produces a
real, explainable number that plugs straight into the routing cost
function. Upgrade to (b) only if time and data allow.
"""
from dataclasses import dataclass


@dataclass
class SegmentFeatures:
    rainfall_mm_24h: float
    slope_degrees: float
    historical_incident_count: int
    elevation_m: float
    river_proximity_m: float
    road_condition_score: float  # 0 (poor) - 1 (good)


# Placeholder weights — replace with either domain-expert judgement
# (cite a source) or fitted weights once Phase 0 data is in.
WEIGHTS = {
    "rainfall": 0.31,
    "slope": 0.24,
    "historical_incidents": 0.18,
    "elevation": 0.12,
    "river_proximity": 0.09,
    "road_condition": 0.06,
}


def compute_risk_score(f: SegmentFeatures) -> float:
    """
    Returns a risk score in [0, 1]. Higher = more likely to become
    disrupted/inaccessible. This is a simple weighted-normalized-feature
    model — swap in a trained model here later without changing the
    routing code that consumes this function's output.
    """
    # NOTE: normalization ranges below are placeholders. Set real ranges
    # once we know the actual distribution of the data we collect.
    rainfall_norm = min(f.rainfall_mm_24h / 150.0, 1.0)
    slope_norm = min(f.slope_degrees / 45.0, 1.0)
    incidents_norm = min(f.historical_incident_count / 10.0, 1.0)
    elevation_norm = min(f.elevation_m / 3000.0, 1.0)
    river_norm = max(0.0, 1.0 - f.river_proximity_m / 500.0)
    condition_norm = 1.0 - f.road_condition_score

    score = (
        WEIGHTS["rainfall"] * rainfall_norm
        + WEIGHTS["slope"] * slope_norm
        + WEIGHTS["historical_incidents"] * incidents_norm
        + WEIGHTS["elevation"] * elevation_norm
        + WEIGHTS["river_proximity"] * river_norm
        + WEIGHTS["road_condition"] * condition_norm
    )
    return round(min(max(score, 0.0), 1.0), 4)

"""
Risk scoring for road segments.

compute_risk_score() returns the single number used by the router.
explain_risk_score() returns the per-factor breakdown behind that number —
used by the "why is this risky" panel on the dashboard. Both share the
same normalization logic (_normalized_contributions) so they can never
drift out of sync with each other.
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


WEIGHTS = {
    "rainfall": 0.31,
    "slope": 0.24,
    "historical_incidents": 0.18,
    "elevation": 0.12,
    "river_proximity": 0.09,
    "road_condition": 0.06,
}

FACTOR_LABELS = {
    "rainfall": "Rainfall",
    "slope": "Slope",
    "historical_incidents": "Historical incidents",
    "elevation": "Elevation",
    "river_proximity": "River proximity",
    "road_condition": "Road condition",
}


def _normalized_contributions(f: SegmentFeatures) -> dict:
    """Each factor's weighted, normalized contribution to the risk score (0-1 scale each)."""
    rainfall_norm = min(f.rainfall_mm_24h / 150.0, 1.0)
    slope_norm = min(f.slope_degrees / 45.0, 1.0)
    incidents_norm = min(f.historical_incident_count / 10.0, 1.0)
    elevation_norm = min(f.elevation_m / 3000.0, 1.0)
    river_norm = max(0.0, 1.0 - f.river_proximity_m / 500.0)
    condition_norm = 1.0 - f.road_condition_score

    return {
        "rainfall": WEIGHTS["rainfall"] * rainfall_norm,
        "slope": WEIGHTS["slope"] * slope_norm,
        "historical_incidents": WEIGHTS["historical_incidents"] * incidents_norm,
        "elevation": WEIGHTS["elevation"] * elevation_norm,
        "river_proximity": WEIGHTS["river_proximity"] * river_norm,
        "road_condition": WEIGHTS["road_condition"] * condition_norm,
    }


def compute_risk_score(f: SegmentFeatures) -> float:
    """Returns a risk score in [0, 1]. Higher = more likely to become disrupted/inaccessible."""
    contributions = _normalized_contributions(f)
    score = sum(contributions.values())
    return round(min(max(score, 0.0), 1.0), 4)


def explain_risk_score(f: SegmentFeatures) -> list[dict]:
    """
    Returns each factor's contribution and share of the total score, sorted
    highest-first — ready to render directly as a "why is this risky" list.
    """
    contributions = _normalized_contributions(f)
    total = sum(contributions.values()) or 1e-9  # avoid div-by-zero on an all-zero segment

    breakdown = [
        {
            "factor": key,
            "label": FACTOR_LABELS[key],
            "contribution": round(value, 4),
            "percent": round(100 * value / total, 1),
        }
        for key, value in contributions.items()
    ]
    return sorted(breakdown, key=lambda x: x["percent"], reverse=True)

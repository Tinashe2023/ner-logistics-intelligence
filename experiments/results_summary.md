# Experiment Results

## Method and interpretation

These results use the static corridor graph and the route-cost weights in
`backend/app/routing/risk_aware_router.py` (`travel time + 0.3 × distance + 5 ×
risk score`). “Baseline shortest” minimizes distance; “fastest time” minimizes
the stored travel-time estimate; “risk-aware” minimizes the weighted cost.
Risk exposure is the sum of segment risk scores along a path. It is an index for
comparing these routes, not a probability of disruption. Distances, times, and
risk values are graph-derived estimates, not live traffic, closure, or safety
information.

## Report-ready examples

| Origin → destination | Strategy | Distance (km) | Time (min) | Summed risk exposure |
|---|---|---:|---:|---:|
| Guwahati → Tawang | Shortest distance | 409.70 | 665.3 | 54.417 |
| Guwahati → Tawang | Risk-aware | 423.31 | 644.3 | 46.658 |
| Tezpur → Tawang | Shortest distance | 325.02 | 494.4 | 31.535 |
| Tezpur → Tawang | Risk-aware | 328.99 | 477.3 | 28.704 |
| Guwahati → Bomdila | Shortest distance | 245.91 | 441.2 | 37.441 |
| Guwahati → Bomdila | Risk-aware | 255.73 | 435.2 | 32.406 |

For Guwahati → Tawang, the risk-aware path differs from the shortest-distance
path. In this graph it adds 13.61 km, reduces estimated travel time by 21.0
minutes, and lowers summed risk exposure by 7.759 (14.3%). The route objective
trades off time, distance, and heuristic segment risk; it does not establish
that the selected path is safer in real conditions.

The experiment script reads the checked-in edge and coordinate JSON files and
can be rerun with `python backend/scripts/run_experiments.py`.

## Experiment 1: Strategy comparison

| Route | Strategy | Distance (km) | Time (min) | Risk Exposure |
|---|---|---|---|---|
| guwahati -> tawang | baseline_shortest | 409.7 | 665.3 | 54.417 |
| guwahati -> tawang | fastest_time | 425.08 | 613.4 | 55.325 |
| guwahati -> tawang | risk_aware | 423.31 | 644.3 | 46.658 |
| tezpur -> tawang | baseline_shortest | 325.02 | 494.4 | 31.535 |
| tezpur -> tawang | fastest_time | 329.31 | 474.1 | 30.128 |
| tezpur -> tawang | risk_aware | 328.99 | 477.3 | 28.704 |
| dirang -> tawang | baseline_shortest | 126.38 | 168.7 | 11.754 |
| dirang -> tawang | fastest_time | 129.13 | 164.7 | 13.132 |
| dirang -> tawang | risk_aware | 128.82 | 167.8 | 11.707 |
| guwahati -> bomdila | baseline_shortest | 245.91 | 441.2 | 37.441 |
| guwahati -> bomdila | fastest_time | 257.18 | 407.3 | 39.648 |
| guwahati -> bomdila | risk_aware | 255.73 | 435.2 | 32.406 |

## Experiment 2: Localized rainfall perturbation near the Guwahati-side branch (Guwahati -> Tawang, risk-aware route)

| Scenario | Distance (km) | Time (min) | Risk Exposure |
|---|---|---|---|
| Normal conditions | 423.31 | 644.3 | 46.658 |
| Localized rainfall perturbation (15km radius) | 417.02 | 669.4 | 53.919 |

Route changed: **True** (3751 edges affected, 53.6% node overlap with the original path)

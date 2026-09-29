# Experiment Results

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

## Experiment 2: Localized storm near Sela Pass (Guwahati -> Tawang, risk-aware route)

| Scenario | Distance (km) | Time (min) | Risk Exposure |
|---|---|---|---|
| Normal conditions | 423.31 | 644.3 | 46.658 |
| Localized storm (Sela Pass, 15km radius) | 417.02 | 669.4 | 53.826 |

Route changed: **True** (3891 edges affected by the storm, 53.6% node overlap with the original path)

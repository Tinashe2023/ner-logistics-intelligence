# Data Audit — NER Logistics Intelligence Platform

Scope for this build: one corridor rather than all of NER, to keep the
graph a manageable size. Recommended: **Guwahati → Tawang** (Assam →
Arunachal Pradesh), since it's already the Phase 8 demo scenario.

## 1. Road network — OpenStreetMap
- **What**: road segments, names, types, geometry for the corridor
- **Where**: [Overpass Turbo](https://overpass-turbo.eu/) (interactive query tool) or the
  `osmnx` Python library (already in requirements.txt) which wraps the Overpass API
- **How**: `osmnx.graph_from_place("Guwahati, Assam, India")` or
  `osmnx.graph_from_bbox(...)` for a custom bounding box covering the corridor
- **Format you'll get**: a networkx graph directly (osmnx builds on networkx),
  or GeoJSON if pulled via Overpass Turbo
- **Effort**: low — this is the easiest dataset to get, do it first

## 2. Elevation / slope — SRTM DEM
- **What**: elevation raster, used to derive slope per road segment
- **Where**: [OpenTopography](https://opentopography.org/) (free account) — SRTM GL1 (30m) dataset,
  or NASA Earthdata (https://earthdata.nasa.gov/, free account, SRTMGL1 product)
- **How**: request a bounding box download (GeoTIFF), then compute slope with
  `rasterio` + `numpy` (gradient of elevation) or `richdem`
- **Format**: GeoTIFF raster
- **Effort**: medium — need a free account, and slope computation is a small script

## 3. Rainfall / weather — current + historical
- **What**: rainfall, forecast, for risk scoring
- **Where**: [Open-Meteo](https://open-meteo.com/) — free, no API key required, has both
  forecast and historical archive endpoints. (IMD's own API access is harder to get
  as a student without institutional access — use Open-Meteo instead.)
- **How**: `https://api.open-meteo.com/v1/forecast?latitude=..&longitude=..&hourly=precipitation`
- **Format**: JSON
- **Effort**: low

## 4. Historical landslide / flood / road-blockage incidents
- **What**: past disruption events, ideally geolocated, to either train a model or
  validate a heuristic risk score
- **Where to check** (roughly in order of likely usefulness):
  1. [GSI Bhukosh](https://bhukosh.gsi.gov.in/) — Geological Survey of India's landslide
     susceptibility maps
  2. [NDMA](https://ndma.gov.in/) — national disaster reports, may have incident logs
  3. Assam/Arunachal Pradesh state disaster management authority websites
  4. News archive search ("NH-13 landslide", "Tawang road blocked") as a manual
     fallback if structured data isn't available
- **Expected outcome**: this is likely to come back thin or unstructured. **If so,
  that's the trigger to go with the rule-based risk score in `app/risk/risk_score.py`
  instead of a trained model** — don't lose time trying to force a dataset that
  doesn't exist.
- **Effort**: high, and the likely bottleneck of Phase 0

## Decision point
Once you've spent ~half a day on #4: if you have >~30-50 geolocated historical
incidents with dates, a simple logistic regression is viable. If you have fewer,
or nothing structured, stay with the weighted heuristic score — it's still a
real, defensible, explainable model, just not a "trained" one. Document whichever
choice you make and why — that's actually good material for the "feasibility and
viability" section of your submission.

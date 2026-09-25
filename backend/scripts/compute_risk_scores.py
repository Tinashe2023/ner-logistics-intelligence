"""
The last step of feature engineering: samples raw elevation (from the
DEM we already downloaded) and runs app/risk/risk_score.py's
compute_risk_score() over every edge, replacing the flat 0.1 placeholder
with a real, explainable risk score per edge.

Usage:
    conda activate ner-logistics
    python scripts/compute_risk_scores.py

Input:  data/corridor_subgraph.graphml, data/corridor_edges.json,
        data/ner_dem.tif
Output: data/corridor_edges.json (overwritten, with real risk_score values)
        Prints summary stats + top-5 highest-risk edges as a sanity check.
"""
import json
import os
import sys

import numpy as np
import osmnx as ox
import rasterio
from rasterio.transform import rowcol

# so `from app.risk.risk_score import ...` works when run as `python scripts/x.py`
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from app.risk.risk_score import SegmentFeatures, compute_risk_score  # noqa: E402

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
SUBGRAPH_PATH = os.path.join(DATA_DIR, "corridor_subgraph.graphml")
EDGES_PATH = os.path.join(DATA_DIR, "corridor_edges.json")
DEM_PATH = os.path.join(DATA_DIR, "ner_dem.tif")


def sample_elevation_at_point(elevation_array, transform, lon, lat):
    row, col = rowcol(transform, lon, lat)
    if 0 <= row < elevation_array.shape[0] and 0 <= col < elevation_array.shape[1]:
        val = elevation_array[row, col]
        return float(val) if not np.isnan(val) and val > -1000 else 0.0
    return 0.0


def join_elevation(edges):
    G = ox.load_graphml(SUBGRAPH_PATH)
    _, edges_gdf = ox.graph_to_gdfs(G)

    with rasterio.open(DEM_PATH) as src:
        elevation_array = src.read(1).astype(float)
        transform = src.transform

    edge_lookup = {(e["u"], e["v"]): e for e in edges}
    updated = 0
    for idx, row in edges_gdf.iterrows():
        u, v = str(idx[0]), str(idx[1])
        edge = edge_lookup.get((u, v))
        if edge is None:
            continue
        midpoint = row.geometry.centroid
        elevation_m = sample_elevation_at_point(elevation_array, transform, midpoint.x, midpoint.y)
        edge["elevation_m"] = round(elevation_m, 1)
        updated += 1

    print(f"Sampled elevation_m on {updated} edges")
    return edges


def compute_all_risk_scores(edges):
    for e in edges:
        features = SegmentFeatures(
            rainfall_mm_24h=e.get("rainfall_mm_24h", 0.0),
            slope_degrees=e.get("slope_degrees", 0.0),
            historical_incident_count=e.get("historical_incident_count", 0),
            elevation_m=e.get("elevation_m", 0.0),
            river_proximity_m=e.get("river_proximity_m", 999999),
            road_condition_score=e.get("road_condition_score", 0.5),
        )
        e["risk_score"] = compute_risk_score(features)
    return edges


def print_summary(edges):
    scores = [e["risk_score"] for e in edges]
    print(f"\nRisk score summary across {len(scores)} edges:")
    print(f"  min={min(scores):.3f}  max={max(scores):.3f}  "
          f"mean={sum(scores)/len(scores):.3f}")

    top5 = sorted(edges, key=lambda e: e["risk_score"], reverse=True)[:5]
    print("\nTop 5 highest-risk edges:")
    for e in top5:
        print(f"  risk={e['risk_score']:.3f}  {e.get('osm_name', 'unnamed')}  "
              f"(slope={e.get('slope_degrees', '?')}°, "
              f"incidents={e.get('historical_incident_count', '?')}, "
              f"rainfall={e.get('rainfall_mm_24h', '?')}mm)")


if __name__ == "__main__":
    with open(EDGES_PATH) as f:
        edges = json.load(f)

    edges = join_elevation(edges)
    edges = compute_all_risk_scores(edges)
    print_summary(edges)

    with open(EDGES_PATH, "w") as f:
        json.dump(edges, f, indent=2)
    print(f"\nSaved final edges (real risk_score per edge) to {EDGES_PATH}")
    print("\nYour risk-aware routing graph is now built on real data.")
    print("Next: wire this into the FastAPI backend (app/api/routes.py).")

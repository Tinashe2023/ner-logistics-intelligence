"""
Joins rainfall_mm_24h onto each edge in corridor_edges.json, using
Open-Meteo (free, no API key required).

Rounds edge midpoints to a coarse grid before querying — rainfall doesn't
vary meaningfully edge-to-edge over a few hundred meters, so this cuts
~17k edges down to a few hundred unique API calls instead of one per edge.

Pulls yesterday's total precipitation (past_days=1, daily precipitation_sum)
as a stand-in for "current rainfall conditions" — good enough for a live
demo. If you later want a proper time-series risk model, switch to the
historical archive endpoint (archive-api.open-meteo.com) instead.

Usage:
    conda activate ner-logistics
    python scripts/join_rainfall_feature.py

Input:  data/corridor_subgraph.graphml, data/corridor_edges.json
Output: data/corridor_edges.json (overwritten, with rainfall_mm_24h filled in)
"""
import json
import os
import time

import osmnx as ox  # pyright: ignore[reportMissingImports]
import requests

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
SUBGRAPH_PATH = os.path.join(DATA_DIR, "corridor_subgraph.graphml")
EDGES_PATH = os.path.join(DATA_DIR, "corridor_edges.json")

GRID_SIZE_DEG = 0.05  # ~5.5km grid — rainfall is spatially smooth at this scale
BATCH_SIZE = 50       # locations per Open-Meteo request
OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


def round_to_grid(value, grid_size):
    return round(value / grid_size) * grid_size


def get_edge_midpoints_with_grid():
    G = ox.load_graphml(SUBGRAPH_PATH)
    _, edges_gdf = ox.graph_to_gdfs(G)

    edge_to_grid = {}       # (u, v) -> (grid_lat, grid_lon)
    grid_cells = set()      # unique (grid_lat, grid_lon)

    for idx, row in edges_gdf.iterrows():
        u, v = str(idx[0]), str(idx[1])
        midpoint = row.geometry.centroid
        grid_lat = round_to_grid(midpoint.y, GRID_SIZE_DEG)
        grid_lon = round_to_grid(midpoint.x, GRID_SIZE_DEG)
        edge_to_grid[(u, v)] = (grid_lat, grid_lon)
        grid_cells.add((grid_lat, grid_lon))

    return edge_to_grid, list(grid_cells)


def fetch_rainfall_for_grid(grid_cells):
    """Returns dict of (grid_lat, grid_lon) -> rainfall_mm_24h."""
    rainfall_by_cell = {}

    for i in range(0, len(grid_cells), BATCH_SIZE):
        batch = grid_cells[i:i + BATCH_SIZE]
        lats = ",".join(str(c[0]) for c in batch)
        lons = ",".join(str(c[1]) for c in batch)

        print(f"Fetching rainfall for grid cells {i+1}-{i+len(batch)} of {len(grid_cells)}...")
        resp = requests.get(
            OPEN_METEO_URL,
            params={
                "latitude": lats,
                "longitude": lons,
                "daily": "precipitation_sum",
                "past_days": 1,
                "forecast_days": 1,
                "timezone": "auto",
            },
            timeout=60,
        )
        resp.raise_for_status()
        data = resp.json()

        # Open-Meteo returns a list of results when multiple locations are
        # requested, one per lat/lon pair, in the same order they were sent.
        results = data if isinstance(data, list) else [data]
        for cell, result in zip(batch, results):
            precip_values = result.get("daily", {}).get("precipitation_sum", [])
            rainfall_mm = precip_values[0] if precip_values else 0.0
            rainfall_by_cell[cell] = rainfall_mm if rainfall_mm is not None else 0.0

        time.sleep(1)  # be polite to the free API

    return rainfall_by_cell


def join_rainfall(edges):
    edge_to_grid, grid_cells = get_edge_midpoints_with_grid()
    print(f"{len(edges)} edges map to {len(grid_cells)} unique grid cells")

    rainfall_by_cell = fetch_rainfall_for_grid(grid_cells)

    edge_lookup = {(e["u"], e["v"]): e for e in edges}
    updated = 0
    for key, edge in edge_lookup.items():
        cell = edge_to_grid.get(key)
        if cell is None:
            continue
        edge["rainfall_mm_24h"] = round(rainfall_by_cell.get(cell, 0.0), 2)
        updated += 1

    print(f"Updated rainfall_mm_24h on {updated} edges")
    return edges


if __name__ == "__main__":
    with open(EDGES_PATH) as f:
        edges = json.load(f)
    edges = join_rainfall(edges)
    with open(EDGES_PATH, "w") as f:
        json.dump(edges, f, indent=2)
    print(f"\nSaved updated edges (with rainfall_mm_24h) to {EDGES_PATH}")
    print("Still missing: historical_incident_count (staying at 0 until the data audit is done).")

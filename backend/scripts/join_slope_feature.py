"""
Downloads an SRTM elevation raster (DEM) for the corridor's bounding box
from OpenTopography, computes slope, and joins slope_degrees onto each
edge in corridor_edges.json.

Requires a free OpenTopography API key, set as an environment variable:
    OPENTOPOGRAPHY_API_KEY=your_key_here
Sign up at https://portal.opentopography.org/myopentopo

Usage:
    conda activate ner-logistics
    python scripts/join_slope_feature.py

Input:  data/corridor_subgraph.graphml, data/corridor_edges.json
Output: data/ner_dem.tif (cached — won't re-download if already present)
        data/corridor_edges.json (overwritten, with slope_degrees filled in)
"""
import json
import os

import geopandas as gpd
import numpy as np
import osmnx as ox
import rasterio
import requests
from rasterio.transform import rowcol

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
SUBGRAPH_PATH = os.path.join(DATA_DIR, "corridor_subgraph.graphml")
EDGES_PATH = os.path.join(DATA_DIR, "corridor_edges.json")
DEM_PATH = os.path.join(DATA_DIR, "ner_dem.tif")

API_KEY = os.environ.get("OPENTOPOGRAPHY_API_KEY")


def get_corridor_bbox():
    G = ox.load_graphml(SUBGRAPH_PATH)
    nodes, _ = ox.graph_to_gdfs(G)
    west, south, east, north = nodes.total_bounds
    # small padding so edge midpoints near the boundary still have DEM coverage
    pad = 0.05
    return west - pad, south - pad, east + pad, north + pad


def download_dem():
    if os.path.exists(DEM_PATH):
        print(f"DEM already downloaded at {DEM_PATH}, skipping download.")
        return

    if not API_KEY:
        raise RuntimeError(
            "OPENTOPOGRAPHY_API_KEY environment variable not set. "
            "Sign up for a free key at https://portal.opentopography.org/myopentopo "
            "and set it before running this script."
        )

    west, south, east, north = get_corridor_bbox()
    print(f"Downloading SRTM DEM for bbox ({west:.3f}, {south:.3f}, {east:.3f}, {north:.3f}) ...")

    url = "https://portal.opentopography.org/API/globaldem"
    params = {
        "demtype": "SRTMGL1",
        "south": south,
        "north": north,
        "west": west,
        "east": east,
        "outputFormat": "GTiff",
        "API_Key": API_KEY,
    }
    resp = requests.get(url, params=params, timeout=300)
    resp.raise_for_status()
    with open(DEM_PATH, "wb") as f:
        f.write(resp.content)
    print(f"Saved DEM to {DEM_PATH} ({len(resp.content) / 1e6:.1f} MB)")


def compute_slope_raster(dem_path):
    """Returns (slope_degrees_array, rasterio transform, crs) for the DEM."""
    with rasterio.open(dem_path) as src:
        elevation = src.read(1).astype(float)
        transform = src.transform
        # approximate pixel size in meters (SRTM is in degrees; ~111km per degree at the equator,
        # good enough for a rough slope estimate at this latitude)
        pixel_size_deg = transform.a
        pixel_size_m = pixel_size_deg * 111_000

        dzdy, dzdx = np.gradient(elevation, pixel_size_m)
        slope_rad = np.arctan(np.sqrt(dzdx**2 + dzdy**2))
        slope_deg = np.degrees(slope_rad)

        return slope_deg, transform, src.crs


def sample_slope_at_point(slope_array, transform, lon, lat):
    row, col = rowcol(transform, lon, lat)
    if 0 <= row < slope_array.shape[0] and 0 <= col < slope_array.shape[1]:
        val = slope_array[row, col]
        return float(val) if not np.isnan(val) else 0.0
    return 0.0  # outside raster coverage — shouldn't happen given the padding above


def join_slope(edges):
    G = ox.load_graphml(SUBGRAPH_PATH)
    _, edges_gdf = ox.graph_to_gdfs(G)

    print("Computing slope raster from DEM...")
    slope_array, transform, crs = compute_slope_raster(DEM_PATH)

    edge_lookup = {(e["u"], e["v"]): e for e in edges}

    print("Sampling slope at each edge midpoint...")
    updated = 0
    for idx, row in edges_gdf.iterrows():
        u, v = str(idx[0]), str(idx[1])
        key = (u, v)
        edge = edge_lookup.get(key)
        if edge is None:
            continue
        midpoint = row.geometry.centroid
        slope_deg = sample_slope_at_point(slope_array, transform, midpoint.x, midpoint.y)
        edge["slope_degrees"] = round(slope_deg, 2)
        updated += 1

    print(f"Updated slope_degrees on {updated} edges")
    return edges


if __name__ == "__main__":
    download_dem()
    with open(EDGES_PATH) as f:
        edges = json.load(f)
    edges = join_slope(edges)
    with open(EDGES_PATH, "w") as f:
        json.dump(edges, f, indent=2)
    print(f"\nSaved updated edges (with slope_degrees) to {EDGES_PATH}")
    print("Still missing: rainfall and historical_incident_count.")

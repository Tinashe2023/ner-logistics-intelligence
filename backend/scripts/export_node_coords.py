"""
Exports node_id -> [lat, lon] as a plain JSON file, so the deployed
backend can load coordinates without needing osmnx/geopandas/rasterio/GDAL
at runtime — those stay as local-only data-prep tools. This is what makes
a plain `pip install` deployment (Render, etc.) actually work, instead of
fighting GDAL system library installation on a hosting platform.

Run this locally whenever corridor_subgraph.graphml changes.

Usage:
    conda activate ner-logistics
    python scripts/export_node_coords.py

Output: data/corridor_nodes.json
"""
import json
import os

import osmnx as ox

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
SUBGRAPH_PATH = os.path.join(DATA_DIR, "corridor_subgraph.graphml")
OUTPUT_PATH = os.path.join(DATA_DIR, "corridor_nodes.json")

if __name__ == "__main__":
    G = ox.load_graphml(SUBGRAPH_PATH)
    coords = {str(n): [data["y"], data["x"]] for n, data in G.nodes(data=True)}

    with open(OUTPUT_PATH, "w") as f:
        json.dump(coords, f)

    print(f"Exported {len(coords)} node coordinates to {OUTPUT_PATH}")
    print(f"File size: {os.path.getsize(OUTPUT_PATH) / 1024:.1f} KB")

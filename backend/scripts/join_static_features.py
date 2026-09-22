"""
Joins two risk features onto corridor_edges.json that don't need any
manual data download:

  - river_proximity_m: distance from each edge's midpoint to the nearest
    mapped river/waterway (from OSM)
  - road_condition_score: heuristic 0-1 score derived from the OSM
    highway tag (trunk/primary assumed better-maintained than
    unclassified/tertiary mountain roads)

Needs internet access (fetches waterway data from OSM) — run on your own
machine, same as the extraction scripts.

Usage:
    conda activate ner-logistics
    python scripts/join_static_features.py

Input:  data/corridor_subgraph.graphml, data/corridor_edges.json
Output: data/corridor_edges.json (overwritten, with the two fields filled in)
"""
import json
import os

import geopandas as gpd
import networkx as nx
import osmnx as ox
from shapely.geometry import Point

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
SUBGRAPH_PATH = os.path.join(DATA_DIR, "corridor_subgraph.graphml")
EDGES_PATH = os.path.join(DATA_DIR, "corridor_edges.json")

# Rough condition heuristic — better-classed roads assumed better maintained.
# Adjust these once you have any real road-condition source; until then this
# is a reasonable, defensible placeholder (document it as such in your report).
ROAD_CONDITION_BY_TYPE = {
    "trunk": 0.8,
    "trunk_link": 0.75,
    "primary": 0.75,
    "primary_link": 0.7,
    "secondary": 0.6,
    "secondary_link": 0.55,
    "tertiary": 0.45,
    "tertiary_link": 0.4,
    "unclassified": 0.35,
}
DEFAULT_CONDITION = 0.5


def load_data():
    print("Loading corridor subgraph and edge list...")
    G = ox.load_graphml(SUBGRAPH_PATH)
    with open(EDGES_PATH) as f:
        edges = json.load(f)
    print(f"Loaded {len(edges)} edges")
    return G, edges


def fetch_rivers(G):
    print("Building a tight polygon around the corridor (not the full bbox)...")
    nodes, _ = ox.graph_to_gdfs(G)

    # Buffer the actual node points, not a rectangular bbox — the bbox
    # around a winding mountain corridor covers a much larger area than
    # the corridor itself, which is what caused the Overpass timeout.
    nodes_proj = nodes.to_crs(epsg=32646)
    corridor_polygon_proj = nodes_proj.geometry.buffer(1000).union_all()
    corridor_polygon = gpd.GeoSeries([corridor_polygon_proj], crs=32646).to_crs(epsg=4326).iloc[0]

    # Raise Overpass's own timeout and the client-side request timeout —
    # defaults are too short for a query this size.
    ox.settings.requests_timeout = 300
    ox.settings.overpass_settings = '[out:json][timeout:300]'

    print("Fetching waterway (river) data from OSM for the corridor polygon...")
    rivers = ox.features_from_polygon(
        corridor_polygon,
        tags={"waterway": ["river", "stream"]},
    )
    print(f"Found {len(rivers)} waterway features")

    rivers_proj = rivers.to_crs(epsg=32646)
    return rivers_proj


def compute_edge_midpoints(G):
    """Returns dict of (u, v) -> Point (lat/lon) for each edge's midpoint."""
    nodes, edges_gdf = ox.graph_to_gdfs(G)
    midpoints = {}
    for idx, row in edges_gdf.iterrows():
        u, v = idx[0], idx[1]
        midpoint = row.geometry.centroid
        midpoints[(str(u), str(v))] = midpoint
    return midpoints


def join_features(G, edges, rivers_proj):
    midpoints = compute_edge_midpoints(G)
    midpoints_gdf = gpd.GeoDataFrame(
        {"key": list(midpoints.keys())},
        geometry=[Point(p.x, p.y) for p in midpoints.values()],
        crs="EPSG:4326",
    ).to_crs(epsg=32646)

    print("Computing distance to nearest river for each edge (this may take a minute)...")
    river_union = rivers_proj.geometry.union_all()

    # Build a (u, v) -> edge dict once, instead of scanning the whole edge
    # list for every midpoint (that was O(n^2) — ~17k x 17k comparisons).
    edge_lookup = {(e["u"], e["v"]): e for e in edges}

    updated = 0
    for i, row in midpoints_gdf.iterrows():
        key = tuple(row["key"])
        dist_m = row.geometry.distance(river_union)
        edge = edge_lookup.get(key)
        if edge is not None:
            edge["river_proximity_m"] = round(dist_m, 1)
            updated += 1

    print(f"Updated river_proximity_m on {updated} edges")

    # Road condition — no need for the river geometry, just the highway tag
    # which osmnx already carries through the graph edges.
    _, edges_gdf = ox.graph_to_gdfs(G)
    condition_lookup = {}
    for idx, row in edges_gdf.iterrows():
        u, v = str(idx[0]), str(idx[1])
        highway = row.get("highway", "")
        if isinstance(highway, list):
            highway = highway[0] if highway else ""
        condition_lookup[(u, v)] = ROAD_CONDITION_BY_TYPE.get(highway, DEFAULT_CONDITION)

    for e in edges:
        key = (e["u"], e["v"])
        e["road_condition_score"] = condition_lookup.get(key, DEFAULT_CONDITION)

    return edges


if __name__ == "__main__":
    G, edges = load_data()
    rivers_proj = fetch_rivers(G)
    edges = join_features(G, edges, rivers_proj)

    with open(EDGES_PATH, "w") as f:
        json.dump(edges, f, indent=2)
    print(f"\nSaved updated edges (with river_proximity_m + road_condition_score) to {EDGES_PATH}")
    print("Still missing: slope (needs DEM download) and historical_incident_count (needs data audit results).")

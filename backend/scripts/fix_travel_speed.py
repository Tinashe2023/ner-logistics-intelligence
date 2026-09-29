"""
Fixes a real gap: every edge currently defaults to a flat 30 km/h, making
travel_time_min perfectly proportional to distance_km — so "fastest route"
and "shortest route" can never differ. This assigns speed by OSM highway
type instead (trunk/primary roads faster, single-lane mountain roads
slower), which is what actually makes "fastest" a meaningfully different
strategy from "shortest."

Usage:
    conda activate ner-logistics
    python scripts/fix_travel_speed.py

Input:  data/corridor_subgraph.graphml, data/corridor_edges.json
Output: data/corridor_edges.json (overwritten — speed_kph added, travel_time_min recomputed)
"""
import json
import os

import osmnx as ox

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
SUBGRAPH_PATH = os.path.join(DATA_DIR, "corridor_subgraph.graphml")
EDGES_PATH = os.path.join(DATA_DIR, "corridor_edges.json")

# Rough speeds for Indian hill-road conditions by OSM highway classification.
# Same honesty note as road_condition_score: a defensible heuristic, not a
# measured value — document it as such if asked.
SPEED_BY_TYPE = {
    "trunk": 50, "trunk_link": 40,
    "primary": 45, "primary_link": 35,
    "secondary": 35, "secondary_link": 30,
    "tertiary": 25, "tertiary_link": 20,
    "unclassified": 20,
}
DEFAULT_SPEED = 25


def main():
    G = ox.load_graphml(SUBGRAPH_PATH)
    _, edges_gdf = ox.graph_to_gdfs(G)

    speed_lookup = {}
    for idx, row in edges_gdf.iterrows():
        u, v = str(idx[0]), str(idx[1])
        highway = row.get("highway", "")
        if isinstance(highway, list):
            highway = highway[0] if highway else ""
        speed_lookup[(u, v)] = SPEED_BY_TYPE.get(highway, DEFAULT_SPEED)

    with open(EDGES_PATH) as f:
        edges = json.load(f)

    updated = 0
    for e in edges:
        key = (e["u"], e["v"])
        speed_kph = speed_lookup.get(key, DEFAULT_SPEED)
        e["speed_kph"] = speed_kph
        e["travel_time_min"] = round((e["distance_km"] / max(speed_kph, 1)) * 60, 2)
        updated += 1

    with open(EDGES_PATH, "w") as f:
        json.dump(edges, f, indent=2)

    print(f"Updated speed_kph and travel_time_min on {updated} edges")
    print("Fastest-path and shortest-path routing should now genuinely differ.")


if __name__ == "__main__":
    main()

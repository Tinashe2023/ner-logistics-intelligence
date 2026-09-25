"""
Joins historical_incident_count onto each edge in corridor_edges.json,
based on proximity to the seed incidents in data/historical_incidents.json.

Any edge within INCIDENT_RADIUS_KM of a historical incident gets +1 to its
count for that incident. This is intentionally simple (a real GIS-grade
approach would snap incidents to the actual road segment they occurred
on) — defensible given the seed dataset is itself approximate,
town-level coordinates from news reports, not precise GPS.

Usage:
    conda activate ner-logistics
    python scripts/join_incident_feature.py

Input:  data/corridor_subgraph.graphml, data/corridor_edges.json,
        data/historical_incidents.json
Output: data/corridor_edges.json (overwritten, with historical_incident_count filled in)
"""
import json
import math
import os

import osmnx as ox

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
SUBGRAPH_PATH = os.path.join(DATA_DIR, "corridor_subgraph.graphml")
EDGES_PATH = os.path.join(DATA_DIR, "corridor_edges.json")
INCIDENTS_PATH = os.path.join(DATA_DIR, "historical_incidents.json")

INCIDENT_RADIUS_KM = 10  # generous, given approximate incident coordinates


def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def load_incidents():
    with open(INCIDENTS_PATH) as f:
        data = json.load(f)
    return data["incidents"]


def get_edge_midpoints():
    G = ox.load_graphml(SUBGRAPH_PATH)
    _, edges_gdf = ox.graph_to_gdfs(G)
    midpoints = {}
    for idx, row in edges_gdf.iterrows():
        u, v = str(idx[0]), str(idx[1])
        midpoint = row.geometry.centroid
        midpoints[(u, v)] = (midpoint.y, midpoint.x)  # (lat, lon)
    return midpoints


def join_incidents(edges):
    incidents = load_incidents()
    midpoints = get_edge_midpoints()
    edge_lookup = {(e["u"], e["v"]): e for e in edges}

    for e in edges:
        e["historical_incident_count_real"] = 0
        e["historical_incident_count_simulated"] = 0
        e["historical_incident_count"] = 0  # real + simulated combined; used by risk_score.py

    for key, edge in edge_lookup.items():
        lat, lon = midpoints.get(key, (None, None))
        if lat is None:
            continue
        real_count = 0
        sim_count = 0
        for inc in incidents:
            dist_km = haversine_km(lat, lon, inc["lat"], inc["lon"])
            if dist_km <= INCIDENT_RADIUS_KM:
                if inc.get("source") == "simulated":
                    sim_count += 1
                else:
                    real_count += 1
        edge["historical_incident_count_real"] = real_count
        edge["historical_incident_count_simulated"] = sim_count
        edge["historical_incident_count"] = real_count + sim_count

    flagged = sum(1 for e in edges if e["historical_incident_count"] > 0)
    real_flagged = sum(1 for e in edges if e["historical_incident_count_real"] > 0)
    print(f"{flagged} of {len(edges)} edges flagged (real + simulated combined)")
    print(f"{real_flagged} of {len(edges)} edges flagged using REAL incidents only — "
          f"use historical_incident_count_real if you need the honest-only figure for your report")
    return edges


if __name__ == "__main__":
    with open(EDGES_PATH) as f:
        edges = json.load(f)
    edges = join_incidents(edges)
    with open(EDGES_PATH, "w") as f:
        json.dump(edges, f, indent=2)
    print(f"\nSaved updated edges (with historical_incident_count) to {EDGES_PATH}")
    print("\nAll SegmentFeatures fields are now populated. Next: compute_risk_scores.py")
    print("to replace the flat 0.1 placeholder with real computed risk per edge.")
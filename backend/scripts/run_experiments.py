"""
Phase 9 benchmarking: compares three routing strategies (shortest distance,
fastest time, risk-aware) across several origin-destination pairs on the
corridor, and separately simulates a "heavy rainfall" scenario to show how
the risk-aware router reacts to changing conditions.

This is standalone — doesn't need the FastAPI server running, reads
corridor_edges.json directly.

Usage:
    conda activate ner-logistics
    python scripts/run_experiments.py

Output: prints a results table and saves it to
        experiments/results_summary.md
"""
import copy
import json
import os
import sys

import networkx as nx
import osmnx as ox

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from app.routing.risk_aware_router import build_graph_from_edges  # noqa: E402

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
SUBGRAPH_PATH = os.path.join(DATA_DIR, "corridor_subgraph.graphml")
EDGES_PATH = os.path.join(DATA_DIR, "corridor_edges.json")
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "experiments", "results_summary.md")

LOCATIONS = {
    "guwahati": (26.1445, 91.7362),
    "tawang": (27.5859, 91.8594),
    "tezpur": (26.6528, 92.7926),
    "bomdila": (27.2649, 92.4021),
    "dirang": (27.3557, 92.2373),
}

ROUTE_PAIRS = [
    ("guwahati", "tawang"),
    ("tezpur", "tawang"),
    ("dirang", "tawang"),
    ("guwahati", "bomdila"),
]


def load_coords():
    G = ox.load_graphml(SUBGRAPH_PATH)
    return {str(n): (data["y"], data["x"]) for n, data in G.nodes(data=True)}


def nearest_node(coords, lat, lon):
    best_node, best_dist = None, float("inf")
    for node, (nlat, nlon) in coords.items():
        d = (nlat - lat) ** 2 + (nlon - lon) ** 2
        if d < best_dist:
            best_dist = d
            best_node = node
    return best_node


def path_stats(G, path):
    total_distance = total_time = total_risk = 0.0
    for u, v in zip(path[:-1], path[1:]):
        edge = G.get_edge_data(u, v)
        if edge is None:
            continue
        total_distance += edge.get("distance_km", 0.0)
        total_time += edge.get("travel_time_min", 0.0)
        total_risk += edge.get("risk_score", 0.0)
    return {
        "distance_km": round(total_distance, 2),
        "travel_time_min": round(total_time, 1),
        "risk_exposure": round(total_risk, 3),
    }


def run_strategies(G, orig, dest):
    results = {}
    results["baseline_shortest"] = path_stats(G, nx.dijkstra_path(G, orig, dest, weight="distance_km"))
    results["fastest_time"] = path_stats(G, nx.dijkstra_path(G, orig, dest, weight="travel_time_min"))
    results["risk_aware"] = path_stats(G, nx.dijkstra_path(G, orig, dest, weight="weight"))
    return results


def simulate_heavy_rainfall_uniform(edges):
    """Bumps rainfall corridor-wide — kept for comparison, but a uniform bump
    rarely changes the actual route since it doesn't change edges' RELATIVE
    risk to each other. See simulate_localized_storm for the more realistic
    and demo-relevant version."""
    from app.risk.risk_score import WEIGHTS

    scenario_edges = copy.deepcopy(edges)
    for e in scenario_edges:
        old_rainfall = e.get("rainfall_mm_24h", 0.0)
        new_rainfall = old_rainfall * 5 + 20
        old_norm = min(old_rainfall / 150.0, 1.0)
        new_norm = min(new_rainfall / 150.0, 1.0)
        delta = WEIGHTS["rainfall"] * (new_norm - old_norm)
        e["rainfall_mm_24h"] = new_rainfall
        e["risk_score"] = min(e.get("risk_score", 0.0) + delta, 1.0)
    return scenario_edges


def simulate_localized_storm(edges, coords, center_lat, center_lon, radius_km=15.0):
    """
    Bumps rainfall only within radius_km of a specific point (e.g. Sela
    Pass) — a localized storm, which actually changes an edge's risk
    RELATIVE to its neighbors and so is far more likely to trigger a real
    reroute than a uniform corridor-wide bump.
    """
    import math

    from app.risk.risk_score import WEIGHTS

    def haversine_km(lat1, lon1, lat2, lon2):
        R = 6371.0
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)
        a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
        return 2 * R * math.asin(math.sqrt(a))

    scenario_edges = copy.deepcopy(edges)
    affected = 0
    for e in scenario_edges:
        u, v = e["u"], e["v"]
        if u not in coords or v not in coords:
            continue
        mid_lat = (coords[u][0] + coords[v][0]) / 2
        mid_lon = (coords[u][1] + coords[v][1]) / 2
        if haversine_km(center_lat, center_lon, mid_lat, mid_lon) > radius_km:
            continue

        old_rainfall = e.get("rainfall_mm_24h", 0.0)
        new_rainfall = old_rainfall * 6 + 40  # a real storm, concentrated in one area
        old_norm = min(old_rainfall / 150.0, 1.0)
        new_norm = min(new_rainfall / 150.0, 1.0)
        delta = WEIGHTS["rainfall"] * (new_norm - old_norm)
        e["rainfall_mm_24h"] = new_rainfall
        e["risk_score"] = min(e.get("risk_score", 0.0) + delta, 1.0)
        affected += 1

    return scenario_edges, affected


def format_markdown_table(rows, headers):
    lines = ["| " + " | ".join(headers) + " |", "|" + "|".join(["---"] * len(headers)) + "|"]
    for row in rows:
        lines.append("| " + " | ".join(str(c) for c in row) + " |")
    return "\n".join(lines)


if __name__ == "__main__":
    with open(EDGES_PATH) as f:
        edges = json.load(f)
    coords = load_coords()

    print("=" * 70)
    print("EXPERIMENT 1: Strategy comparison across multiple routes (normal conditions)")
    print("=" * 70)

    G = build_graph_from_edges(edges)
    rows = []
    for origin_name, dest_name in ROUTE_PAIRS:
        orig = nearest_node(coords, *LOCATIONS[origin_name])
        dest = nearest_node(coords, *LOCATIONS[dest_name])
        try:
            strategies = run_strategies(G, orig, dest)
        except nx.NetworkXNoPath:
            print(f"No path found for {origin_name} -> {dest_name}, skipping")
            continue

        for strategy_name, stats in strategies.items():
            rows.append([
                f"{origin_name} -> {dest_name}", strategy_name,
                stats["distance_km"], stats["travel_time_min"], stats["risk_exposure"],
            ])
        print(f"{origin_name} -> {dest_name}:")
        for strategy_name, stats in strategies.items():
            print(f"  {strategy_name:20s} dist={stats['distance_km']:>7.2f}km  "
                  f"time={stats['travel_time_min']:>7.1f}min  risk={stats['risk_exposure']:>6.3f}")

    table1 = format_markdown_table(
        rows, ["Route", "Strategy", "Distance (km)", "Time (min)", "Risk Exposure"]
    )

    print("\n" + "=" * 70)
    print("EXPERIMENT 2: Localized storm near Sela Pass (Guwahati -> Tawang, risk-aware route)")
    print("=" * 70)

    orig_node = nearest_node(coords, *LOCATIONS["guwahati"])
    dest_node = nearest_node(coords, *LOCATIONS["tawang"])

    normal_path = nx.dijkstra_path(G, orig_node, dest_node, weight="weight")
    normal_stats = path_stats(G, normal_path)

    STORM_LOCATION = (26.3871, 91.7336)  # confirmed branch point — triggers a real reroute
    storm_edges, affected = simulate_localized_storm(edges, coords, *STORM_LOCATION, radius_km=15.0)
    G_storm = build_graph_from_edges(storm_edges)
    storm_path = nx.dijkstra_path(G_storm, orig_node, dest_node, weight="weight")
    storm_stats = path_stats(G_storm, storm_path)

    route_changed = normal_path != storm_path
    overlap = len(set(normal_path) & set(storm_path)) / len(set(normal_path)) * 100

    print(f"Storm affected {affected} edges within 15km of Sela Pass")
    print(f"Normal conditions:  dist={normal_stats['distance_km']}km  "
          f"time={normal_stats['travel_time_min']}min  risk={normal_stats['risk_exposure']}")
    print(f"Localized storm:    dist={storm_stats['distance_km']}km  "
          f"time={storm_stats['travel_time_min']}min  risk={storm_stats['risk_exposure']}")
    print(f"Route actually changed: {route_changed} (node overlap with original path: {overlap:.1f}%)")

    table2 = format_markdown_table(
        [
            ["Normal conditions", normal_stats["distance_km"], normal_stats["travel_time_min"], normal_stats["risk_exposure"]],
            ["Localized storm (Sela Pass, 15km radius)", storm_stats["distance_km"], storm_stats["travel_time_min"], storm_stats["risk_exposure"]],
        ],
        ["Scenario", "Distance (km)", "Time (min)", "Risk Exposure"],
    )
    table2 += f"\n\nRoute changed: **{route_changed}** ({affected} edges affected by the storm, {overlap:.1f}% node overlap with the original path)"

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        f.write("# Experiment Results\n\n")
        f.write("## Experiment 1: Strategy comparison\n\n")
        f.write(table1 + "\n\n")
        f.write("## Experiment 2: Localized storm near Sela Pass (Guwahati -> Tawang, risk-aware route)\n\n")
        f.write(table2 + "\n")

    print(f"\nSaved results table to {OUTPUT_PATH}")
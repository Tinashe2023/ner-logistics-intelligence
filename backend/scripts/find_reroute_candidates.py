"""
Instead of guessing place names and hoping a reroute happens, this finds
actual branch points along the Guwahati->Tawang path — nodes where the
underlying graph has more than 2 connections, meaning a real alternate
road exists there. Targeting a storm at one of these (rather than an
arbitrary named place) gives a much better chance of a genuine, visible
reroute for your demo.

Usage:
    conda activate ner-logistics
    python scripts/find_reroute_candidates.py

Prints candidate branch points, ordered by distance from Guwahati, with
their degree (higher = more alternate options nearby).
"""
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

LOCATIONS = {"guwahati": (26.1445, 91.7362), "tawang": (27.5859, 91.8594)}


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


if __name__ == "__main__":
    with open(EDGES_PATH) as f:
        edges = json.load(f)
    coords = load_coords()

    G = build_graph_from_edges(edges)
    G_undirected = G.to_undirected()

    orig = nearest_node(coords, *LOCATIONS["guwahati"])
    dest = nearest_node(coords, *LOCATIONS["tawang"])
    path = nx.dijkstra_path(G, orig, dest, weight="weight")

    cumulative_km = 0.0
    candidates = []
    for i, node in enumerate(path):
        if i > 0:
            edge = G.get_edge_data(path[i - 1], node)
            cumulative_km += edge.get("distance_km", 0.0) if edge else 0.0

        degree = G_undirected.degree(node)
        if degree > 2:  # more than just "came from" and "going to" — a real branch
            candidates.append((cumulative_km, node, degree, coords[node]))

    print(f"Path has {len(path)} nodes, {len(candidates)} branch points with degree > 2\n")
    print(f"{'km from Guwahati':>18}  {'degree':>6}  {'lat':>10}  {'lon':>10}")
    for km, node, degree, (lat, lon) in sorted(candidates, key=lambda x: -x[2])[:15]:
        print(f"{km:>18.1f}  {degree:>6}  {lat:>10.4f}  {lon:>10.4f}")

    print("\nHighest-degree candidates are your best bet for a visible reroute.")
    print("Pick one, set SELA_PASS in run_experiments.py to its (lat, lon), and re-run Experiment 2.")

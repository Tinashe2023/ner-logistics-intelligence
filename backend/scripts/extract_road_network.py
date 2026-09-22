"""
Extract the NER road network for a corridor (default: Guwahati -> Tawang)
from OpenStreetMap using osmnx, and convert it into the edge-list format
that app/routing/risk_aware_router.py expects.

NOTE: this needs internet access to OSM's Overpass API / Nominatim, which
sandboxed environments (like the one this was drafted in) often can't
reach. Run this on your own machine where you have normal internet access.

Usage:
    conda activate ner-logistics
    python scripts/extract_road_network.py

Output:
    backend/data/ner_corridor_graph.graphml   (full osmnx graph, for reuse)
    backend/data/ner_corridor_edges.json      (simplified edge list for the router)
"""
import json
import os

import networkx as nx
import osmnx as ox

# --- Config -----------------------------------------------------------
# Bounding box loosely covering Guwahati (Assam) up to Tawang (Arunachal
# Pradesh). Adjust if you pick a different corridor. Format: (north,
# south, east, west) in decimal degrees.
BBOX = {
    "north": 27.65,
    "south": 26.05,
    "east": 92.60,
    "west": 91.60,
}

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
os.makedirs(OUTPUT_DIR, exist_ok=True)


def extract_graph():
    print("Downloading road network from OpenStreetMap (this can take a few minutes)...")
    # osmnx >= 2.0 takes a bbox tuple as (left, bottom, right, top)
    bbox = (BBOX["west"], BBOX["south"], BBOX["east"], BBOX["north"])
    G = ox.graph_from_bbox(bbox=bbox, network_type="drive", simplify=True)
    print(f"Downloaded graph: {len(G.nodes)} nodes, {len(G.edges)} edges")

    graphml_path = os.path.join(OUTPUT_DIR, "ner_corridor_graph.graphml")
    ox.save_graphml(G, graphml_path)
    print(f"Saved full graph to {graphml_path}")

    return G


def convert_to_edge_list(G):
    """
    Converts the osmnx/networkx graph into the simplified edge format used
    by app/routing/risk_aware_router.py. Risk score is left as a
    placeholder (0.1) here — wire in app/risk/risk_score.py once you have
    slope/rainfall/incident data joined onto each edge.
    """
    edges = []
    for u, v, data in G.edges(data=True):
        length_km = data.get("length", 0) / 1000.0  # osmnx gives length in meters
        speed_kph = data.get("speed_kph", 30)  # osmnx can infer this; falls back to 30
        travel_time_min = (length_km / max(speed_kph, 1)) * 60

        edges.append({
            "u": str(u),
            "v": str(v),
            "distance_km": round(length_km, 3),
            "travel_time_min": round(travel_time_min, 2),
            "risk_score": 0.1,  # placeholder — replace using risk_score.py once features are joined
            "osm_name": data.get("name", "unnamed"),
        })

    edges_path = os.path.join(OUTPUT_DIR, "ner_corridor_edges.json")
    with open(edges_path, "w") as f:
        json.dump(edges, f, indent=2)
    print(f"Saved {len(edges)} edges to {edges_path}")
    return edges


if __name__ == "__main__":
    G = extract_graph()
    convert_to_edge_list(G)

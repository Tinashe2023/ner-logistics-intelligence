"""
Reduce the full NER bounding-box graph (39k nodes / 93k edges) down to a
manageable corridor: the actual shortest path between Guwahati and Tawang,
plus a buffer around it so we keep real alternate routes for the
reroute demo (Phase 8) instead of only one path.

Run this AFTER extract_road_network.py has already produced
data/ner_corridor_graph.graphml — this script only needs that local file,
no internet required.

Usage:
    conda activate ner-logistics
    python scripts/extract_corridor_subgraph.py

Output:
    backend/data/corridor_subgraph.graphml
    backend/data/corridor_edges.json   <- use this one in the router, not
                                           the full 92k-edge file
"""
import json
import importlib
import os

import networkx as nx

# Load the optional dependency dynamically so static analyzers do not report
# an unresolved direct import when the selected interpreter lacks osmnx.
ox = importlib.import_module("osmnx")

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
FULL_GRAPH_PATH = os.path.join(DATA_DIR, "ner_corridor_graph.graphml")

# Approximate coordinates — used instead of live geocoding so this script
# doesn't need internet access.
GUWAHATI = (26.1445, 91.7362)  # (lat, lon)
TAWANG = (27.5859, 91.8594)

BUFFER_METERS = 15000  # 15km either side of the shortest path — generous
                        # enough to capture real alternate roads

# Road types irrelevant to intercity logistics routing — dropping these is
# what actually shrinks urban street-grid clutter, since residential/service
# roads dominate edge counts in towns like Guwahati within the buffer.
EXCLUDE_HIGHWAY_TYPES = {
    "residential", "service", "track", "footway", "path", "steps",
    "cycleway", "pedestrian", "living_street", "bridleway",
    "construction", "proposed",
}                        


def load_full_graph():
    print(f"Loading full graph from {FULL_GRAPH_PATH} ...")
    G = ox.load_graphml(FULL_GRAPH_PATH)
    print(f"Loaded: {len(G.nodes)} nodes, {len(G.edges)} edges")
    return G


def extract_corridor(G):
    orig_node = ox.nearest_nodes(G, X=GUWAHATI[1], Y=GUWAHATI[0])
    dest_node = ox.nearest_nodes(G, X=TAWANG[1], Y=TAWANG[0])

    print("Computing shortest path Guwahati -> Tawang ...")
    path = ox.shortest_path(G, orig_node, dest_node, weight="length")
    if path is None:
        raise RuntimeError(
            "No path found between Guwahati and Tawang in this graph — "
            "the bounding box in extract_road_network.py may not connect "
            "them. Widen BBOX and re-run that script first."
        )

    # osmnx 2.0 moved this out of utils_graph — use networkx directly instead
    # of re-deriving it from route edge attributes.
    path_length_km = nx.shortest_path_length(G, orig_node, dest_node, weight="length") / 1000.0
    print(f"Shortest path found: {len(path)} nodes, {path_length_km:.1f} km")

    # Project to a metric CRS so buffering in meters is accurate.
    G_proj = ox.project_graph(G)
    # osmnx 2.0: route_to_gdf lives in the routing module, not utils_graph.
    path_edges_proj = ox.routing.route_to_gdf(G_proj, path, weight="length")
    path_line = path_edges_proj.geometry.union_all()
    buffer_polygon = path_line.buffer(BUFFER_METERS)

    print(f"Truncating graph to a {BUFFER_METERS/1000:.0f}km buffer around the corridor ...")
    G_sub_proj = ox.truncate.truncate_graph_polygon(G_proj, buffer_polygon)
    G_sub = ox.project_graph(G_sub_proj, to_crs="EPSG:4326")  # back to lat/lon

    G_sub = filter_to_major_roads(G_sub, path)

    print(f"Corridor subgraph: {len(G_sub.nodes)} nodes, {len(G_sub.edges)} edges")

    subgraph_path = os.path.join(DATA_DIR, "corridor_subgraph.graphml")
    ox.save_graphml(G_sub, subgraph_path)
    print(f"Saved subgraph to {subgraph_path}")

    return G_sub, path


def convert_to_edge_list(G):
    """Same conversion as extract_road_network.py, applied to the smaller subgraph."""
    edges = []
    for u, v, data in G.edges(data=True):
        length_km = data.get("length", 0) / 1000.0
        speed_kph = data.get("speed_kph", 30)
        travel_time_min = (length_km / max(speed_kph, 1)) * 60

        edges.append({
            "u": str(u),
            "v": str(v),
            "distance_km": round(length_km, 3),
            "travel_time_min": round(travel_time_min, 2),
            "risk_score": 0.1,  # placeholder until risk_score.py features are joined
            "osm_name": data.get("name", "unnamed"),
        })

    edges_path = os.path.join(DATA_DIR, "corridor_edges.json")
    with open(edges_path, "w") as f:
        json.dump(edges, f, indent=2)
    print(f"Saved {len(edges)} edges to {edges_path}")

def filter_to_major_roads(G, protected_nodes):
    """
    Drops residential/service/local-street clutter, but always keeps edges
    on the actual Guwahati-Tawang shortest path (protected_nodes) even if
    they're tagged unusually — mountain roads sometimes carry lower-tier
    tags despite being the only paved route through an area, so we don't
    want to accidentally sever our own corridor.
    """
    protected = set(protected_nodes)
    edges_to_drop = []
    for u, v, k, data in G.edges(keys=True, data=True):
        if u in protected and v in protected:
            continue  # never drop an edge on the actual corridor path
        highway = data.get("highway", "")
        tags = {highway} if isinstance(highway, str) else set(highway)
        if tags & EXCLUDE_HIGHWAY_TYPES:
            edges_to_drop.append((u, v, k))

    G.remove_edges_from(edges_to_drop)
    G.remove_nodes_from(list(nx.isolates(G)))
    return G    


if __name__ == "__main__":
    G_full = load_full_graph()
    G_sub, main_path = extract_corridor(G_full)
    convert_to_edge_list(G_sub)
    print("\nDone. Point app/routing/risk_aware_router.py at corridor_edges.json next.")

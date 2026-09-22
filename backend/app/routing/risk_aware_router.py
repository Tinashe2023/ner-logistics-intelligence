"""
Risk-aware routing on the NER road graph.

Cost function (from the project plan):
    C_e = alpha * T_e + beta * D_e + gamma * R_e
where T_e = travel time, D_e = distance, R_e = risk score (0-1) for edge e.

Uses networkx as the graph backend — good enough for a subset-of-NER
sized graph (one corridor), no need for anything heavier at this stage.
"""
import networkx as nx

ALPHA = 1.0  # travel time weight
BETA = 0.3   # distance weight
GAMMA = 5.0  # risk weight — tune this; higher gamma = more risk-averse routing


def edge_cost(travel_time_min: float, distance_km: float, risk_score: float) -> float:
    return ALPHA * travel_time_min + BETA * distance_km + GAMMA * risk_score


def build_graph_from_edges(edges: list[dict]) -> nx.DiGraph:
    """
    edges: list of dicts like
      {"u": "node_a", "v": "node_b", "travel_time_min": 12.0,
       "distance_km": 8.5, "risk_score": 0.2}
    """
    G = nx.DiGraph()
    for e in edges:
        cost = edge_cost(e["travel_time_min"], e["distance_km"], e["risk_score"])
        G.add_edge(e["u"], e["v"], weight=cost, **e)
    return G


def shortest_risk_aware_path(G: nx.DiGraph, origin: str, destination: str):
    """Returns (path, total_cost) using Dijkstra over the risk-weighted graph."""
    path = nx.dijkstra_path(G, origin, destination, weight="weight")
    cost = nx.dijkstra_path_length(G, origin, destination, weight="weight")
    return path, cost


if __name__ == "__main__":
    # Quick smoke test with synthetic data — replace with real graph once
    # Phase 0/2 produce the actual NER road network extract.
    sample_edges = [
        {"u": "Guwahati", "v": "Tezpur", "travel_time_min": 180, "distance_km": 175, "risk_score": 0.1},
        {"u": "Tezpur", "v": "Bomdila", "travel_time_min": 240, "distance_km": 160, "risk_score": 0.6},
        {"u": "Bomdila", "v": "Tawang", "travel_time_min": 180, "distance_km": 140, "risk_score": 0.3},
        {"u": "Tezpur", "v": "Dirang", "travel_time_min": 200, "distance_km": 150, "risk_score": 0.2},
        {"u": "Dirang", "v": "Tawang", "travel_time_min": 150, "distance_km": 100, "risk_score": 0.15},
    ]
    G = build_graph_from_edges(sample_edges)
    path, cost = shortest_risk_aware_path(G, "Guwahati", "Tawang")
    print("Route:", " -> ".join(path))
    print("Total cost:", round(cost, 2))

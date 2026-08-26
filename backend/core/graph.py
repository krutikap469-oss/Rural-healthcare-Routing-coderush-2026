import math
from typing import Dict, List, Tuple, Optional, Any

class RoadGraph:
    """
    In-memory spatial road graph supporting dynamic edge weights,
    road blockages, and fast A* / Dijkstra traversals.
    """
    def __init__(self):
        # node_id -> {id, lat, lon, type, name, meta}
        self.nodes: Dict[str, Dict[str, Any]] = {}
        # u -> {v: {"distance_km": float, "weight": float (mins), "blocked": bool, "road_type": str}}
        self.adjacency: Dict[str, Dict[str, Dict[str, Any]]] = {}
        # Cache for quick edge lookups (u, v) -> properties
        self.blocked_edges: set = set()

    def add_node(self, node_id: str, lat: float, lon: float, node_type: str = "junction", name: str = "", meta: Optional[Dict] = None):
        self.nodes[node_id] = {
            "id": node_id,
            "lat": lat,
            "lon": lon,
            "type": node_type,
            "name": name or node_id,
            "meta": meta or {}
        }
        if node_id not in self.adjacency:
            self.adjacency[node_id] = {}

    def add_edge(self, u: str, v: str, distance_km: float, speed_kmh: float = 50.0, road_type: str = "paved", bidirectional: bool = True):
        base_time_mins = (distance_km / max(speed_kmh, 1.0)) * 60.0
        edge_data = {
            "distance_km": round(distance_km, 2),
            "base_time_mins": round(base_time_mins, 2),
            "weight": round(base_time_mins, 2),
            "speed_kmh": speed_kmh,
            "road_type": road_type,
            "blocked": False
        }
        
        if u not in self.adjacency:
            self.adjacency[u] = {}
        self.adjacency[u][v] = dict(edge_data)

        if bidirectional:
            if v not in self.adjacency:
                self.adjacency[v] = {}
            self.adjacency[v][u] = dict(edge_data)

    def block_edge(self, u: str, v: str, blocked: bool = True):
        edge_key = tuple(sorted([u, v]))
        if blocked:
            self.blocked_edges.add(edge_key)
        else:
            self.blocked_edges.discard(edge_key)

        if u in self.adjacency and v in self.adjacency[u]:
            self.adjacency[u][v]["blocked"] = blocked
            self.adjacency[u][v]["weight"] = float("inf") if blocked else self.adjacency[u][v]["base_time_mins"]
        if v in self.adjacency and u in self.adjacency[v]:
            self.adjacency[v][u]["blocked"] = blocked
            self.adjacency[v][u]["weight"] = float("inf") if blocked else self.adjacency[v][u]["base_time_mins"]

    def is_blocked(self, u: str, v: str) -> bool:
        return tuple(sorted([u, v])) in self.blocked_edges

    def get_neighbors(self, node_id: str) -> List[Tuple[str, float, float]]:
        """Returns list of (neighbor_id, travel_time_mins, distance_km) for unblocked edges."""
        if node_id not in self.adjacency:
            return []
        neighbors = []
        for neighbor, props in self.adjacency[node_id].items():
            if not props.get("blocked", False) and props["weight"] < float("inf"):
                neighbors.append((neighbor, props["weight"], props["distance_km"]))
        return neighbors

    @staticmethod
    def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculates great-circle distance between two points in km."""
        R = 6371.0
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (math.sin(dlat / 2.0) ** 2 +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
             math.sin(dlon / 2.0) ** 2)
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return R * c

    def get_heuristic(self, node_a: str, node_b: str, max_speed_kmh: float = 80.0) -> float:
        if node_a not in self.nodes or node_b not in self.nodes:
            return 0.0
        pos_a = self.nodes[node_a]
        pos_b = self.nodes[node_b]
        dist_km = self.haversine_distance(pos_a["lat"], pos_a["lon"], pos_b["lat"], pos_b["lon"])
        return (dist_km / max_speed_kmh) * 60.0

    def find_nearest_node(self, lat: float, lon: float, node_type: Optional[str] = None) -> Optional[str]:
        closest_id = None
        min_dist = float("inf")
        for node_id, data in self.nodes.items():
            if node_type and data["type"] != node_type:
                continue
            dist = self.haversine_distance(lat, lon, data["lat"], data["lon"])
            if dist < min_dist:
                min_dist = dist
                closest_id = node_id
        return closest_id

    def export_graph_json(self) -> Dict[str, Any]:
        nodes_list = list(self.nodes.values())
        edges_list = []
        seen_edges = set()
        for u, neighbors in self.adjacency.items():
            for v, props in neighbors.items():
                edge_id = f"{min(u,v)}--{max(u,v)}"
                if edge_id not in seen_edges:
                    seen_edges.add(edge_id)
                    u_node = self.nodes[u]
                    v_node = self.nodes[v]
                    edges_list.append({
                        "id": edge_id,
                        "source": u,
                        "target": v,
                        "coordinates": [[u_node["lat"], u_node["lon"]], [v_node["lat"], v_node["lon"]]],
                        "distance_km": props["distance_km"],
                        "travel_time_mins": props["base_time_mins"],
                        "blocked": self.is_blocked(u, v),
                        "road_type": props["road_type"]
                    })
        return {
            "node_count": len(nodes_list),
            "edge_count": len(edges_list),
            "nodes": nodes_list,
            "edges": edges_list
        }

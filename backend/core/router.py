import heapq
import time
from typing import Dict, List, Tuple, Optional, Any
from core.graph import RoadGraph

class PathResult:
    def __init__(self, found: bool, path_nodes: List[str] = None, total_time_mins: float = 0.0, total_distance_km: float = 0.0, coordinates: List[List[float]] = None, nodes_explored: int = 0, execution_ms: float = 0.0):
        self.found = found
        self.path_nodes = path_nodes or []
        self.total_time_mins = round(total_time_mins, 2)
        self.total_distance_km = round(total_distance_km, 2)
        self.distance_km = self.total_distance_km
        self.travel_time_mins = self.total_time_mins
        self.coordinates = coordinates or []
        self.nodes_explored = nodes_explored
        self.execution_ms = round(execution_ms, 3)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "found": self.found,
            "path_nodes": self.path_nodes,
            "total_time_mins": self.total_time_mins,
            "total_distance_km": self.total_distance_km,
            "distance_km": self.total_distance_km,
            "coordinates": self.coordinates,
            "nodes_explored": self.nodes_explored,
            "execution_ms": self.execution_ms
        }

class GraphRouter:
    """
    High-performance A* and Dijkstra pathfinder optimized for
    real-time emergency routing with priority queues (Min-Heap).
    """
    def __init__(self, graph: RoadGraph):
        self.graph = graph

    def a_star_search(self, start_node: str, goal_node: str, max_speed_kmh: float = 80.0) -> PathResult:
        t0 = time.perf_counter()
        
        if start_node not in self.graph.nodes or goal_node not in self.graph.nodes:
            return PathResult(found=False, execution_ms=(time.perf_counter() - t0) * 1000)

        if start_node == goal_node:
            node_data = self.graph.nodes[start_node]
            return PathResult(
                found=True,
                path_nodes=[start_node],
                total_time_mins=0.0,
                total_distance_km=0.0,
                coordinates=[[node_data["lat"], node_data["lon"]]],
                nodes_explored=1,
                execution_ms=(time.perf_counter() - t0) * 1000
            )

        open_set = []
        heapq.heappush(open_set, (0.0, start_node))
        
        g_score: Dict[str, float] = {start_node: 0.0}
        dist_score: Dict[str, float] = {start_node: 0.0}
        came_from: Dict[str, str] = {}
        
        explored_count = 0
        visited = set()

        while open_set:
            current_f, current = heapq.heappop(open_set)

            if current in visited:
                continue
            visited.add(current)
            explored_count += 1

            if current == goal_node:
                return self._reconstruct_path(came_from, current, g_score[current], dist_score[current], explored_count, t0)

            for neighbor, edge_weight_mins, edge_dist_km in self.graph.get_neighbors(current):
                tentative_g = g_score[current] + edge_weight_mins
                if tentative_g < g_score.get(neighbor, float("inf")):
                    came_from[neighbor] = current
                    g_score[neighbor] = tentative_g
                    dist_score[neighbor] = dist_score[current] + edge_dist_km
                    h_score = self.graph.get_heuristic(neighbor, goal_node, max_speed_kmh)
                    f_score = tentative_g + h_score
                    heapq.heappush(open_set, (f_score, neighbor))

        exec_ms = (time.perf_counter() - t0) * 1000
        return PathResult(found=False, nodes_explored=explored_count, execution_ms=exec_ms)

    def dijkstra_search(self, start_node: str, goal_node: str) -> PathResult:
        t0 = time.perf_counter()
        if start_node not in self.graph.nodes or goal_node not in self.graph.nodes:
            return PathResult(found=False, execution_ms=(time.perf_counter() - t0) * 1000)

        open_set = [(0.0, start_node)]
        g_score: Dict[str, float] = {start_node: 0.0}
        dist_score: Dict[str, float] = {start_node: 0.0}
        came_from: Dict[str, str] = {}
        explored_count = 0
        visited = set()

        while open_set:
            current_g, current = heapq.heappop(open_set)
            if current in visited:
                continue
            visited.add(current)
            explored_count += 1

            if current == goal_node:
                return self._reconstruct_path(came_from, current, g_score[current], dist_score[current], explored_count, t0)

            for neighbor, edge_weight_mins, edge_dist_km in self.graph.get_neighbors(current):
                tentative_g = g_score[current] + edge_weight_mins
                if tentative_g < g_score.get(neighbor, float("inf")):
                    came_from[neighbor] = current
                    g_score[neighbor] = tentative_g
                    dist_score[neighbor] = dist_score[current] + edge_dist_km
                    heapq.heappush(open_set, (tentative_g, neighbor))

        exec_ms = (time.perf_counter() - t0) * 1000
        return PathResult(found=False, nodes_explored=explored_count, execution_ms=exec_ms)

    def _reconstruct_path(self, came_from: Dict[str, str], current: str, total_time: float, total_dist: float, explored: int, t0: float) -> PathResult:
        path = [current]
        while current in came_from:
            current = came_from[current]
            path.append(current)
        path.reverse()
        
        coordinates = []
        for node_id in path:
            node = self.graph.nodes[node_id]
            coordinates.append([node["lat"], node["lon"]])
            
        exec_ms = (time.perf_counter() - t0) * 1000
        return PathResult(
            found=True,
            path_nodes=path,
            total_time_mins=total_time,
            total_distance_km=total_dist,
            coordinates=coordinates,
            nodes_explored=explored,
            execution_ms=exec_ms
        )

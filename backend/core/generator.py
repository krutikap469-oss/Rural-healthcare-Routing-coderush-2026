import random
import math
from typing import Dict, List, Tuple, Any
from core.graph import RoadGraph

def generate_district_network() -> Tuple[RoadGraph, Dict[str, Any], Dict[str, Any], Dict[str, Any]]:
    graph = RoadGraph()
    center_lat, center_lon = 18.5204, 73.8567

    hospitals = {
        "HOSP_C": {
            "id": "HOSP_C",
            "name": "Apex Heart & Trauma Center (Hospital C)",
            "node_id": "NODE_HOSP_C",
            "lat": center_lat + 0.12,
            "lon": center_lon + 0.14,
            "tier": "Tertiary Referral",
            "beds_total": 50,
            "beds_available": 18,
            "specialists_on_duty": ["Cardiology", "Trauma", "Neurology", "General"],
            "inventory": {
                "Heparin": 45,
                "Anti-venom": 20,
                "Epinephrine": 80,
                "Blood_O_Neg": 12,
                "Insulin": 60
            },
            "current_triage_wait_mins": 8.0
        },
        "HOSP_B": {
            "id": "HOSP_B",
            "name": "Valley Primary Clinic (Hospital B)",
            "node_id": "NODE_HOSP_B",
            "lat": center_lat + 0.04,
            "lon": center_lon + 0.03,
            "tier": "Primary Clinic",
            "beds_total": 15,
            "beds_available": 4,
            "specialists_on_duty": ["General", "Pediatrics"], # No Cardiologist
            "inventory": {
                "Heparin": 0,
                "Anti-venom": 5,
                "Epinephrine": 10,
                "Blood_O_Neg": 0,
                "Insulin": 15
            },
            "current_triage_wait_mins": 2.0
        },
        "HOSP_NORTH": {
            "id": "HOSP_NORTH",
            "name": "Highland Regional Hospital",
            "node_id": "NODE_HOSP_NORTH",
            "lat": center_lat + 0.18,
            "lon": center_lon - 0.08,
            "tier": "District General",
            "beds_total": 40,
            "beds_available": 12,
            "specialists_on_duty": ["Trauma", "Orthopedic", "General", "Obstetrics"],
            "inventory": {
                "Heparin": 10,
                "Anti-venom": 35,
                "Epinephrine": 40,
                "Blood_O_Neg": 8,
                "Insulin": 50
            },
            "current_triage_wait_mins": 12.0
        },
        "HOSP_SOUTH": {
            "id": "HOSP_SOUTH",
            "name": "Riverside Community Hospital",
            "node_id": "NODE_HOSP_SOUTH",
            "lat": center_lat - 0.14,
            "lon": center_lon - 0.06,
            "tier": "Community Center",
            "beds_total": 25,
            "beds_available": 7,
            "specialists_on_duty": ["General", "Pediatrics", "Cardiology"],
            "inventory": {
                "Heparin": 15,
                "Anti-venom": 18,
                "Epinephrine": 30,
                "Blood_O_Neg": 4,
                "Insulin": 25
            },
            "current_triage_wait_mins": 5.0
        }
    }

    for hid, h in hospitals.items():
        graph.add_node(h["node_id"], h["lat"], h["lon"], node_type="hospital", name=h["name"], meta=h)

    villages = {
        "VILL_A": {
            "id": "VILL_A",
            "name": "Village A (Hilltop Ridge)",
            "node_id": "NODE_VILL_A",
            "lat": center_lat + 0.01,
            "lon": center_lon - 0.02,
            "population": 2800,
            "urgency_level": "Normal"
        },
        "VILL_KASAR": {
            "id": "VILL_KASAR",
            "name": "Kasarwadi Village",
            "node_id": "NODE_VILL_KASAR",
            "lat": center_lat + 0.08,
            "lon": center_lon - 0.12,
            "population": 4200,
            "urgency_level": "Normal"
        },
        "VILL_PIR": {
            "id": "VILL_PIR",
            "name": "Pirangut Forest Village",
            "node_id": "NODE_VILL_PIR",
            "lat": center_lat - 0.07,
            "lon": center_lon + 0.08,
            "population": 1950,
            "urgency_level": "Normal"
        },
        "VILL_SHIV": {
            "id": "VILL_SHIV",
            "name": "Shivane Riverside Village",
            "node_id": "NODE_VILL_SHIV",
            "lat": center_lat - 0.09,
            "lon": center_lon - 0.12,
            "population": 3400,
            "urgency_level": "Normal"
        },
        "VILL_LAV": {
            "id": "VILL_LAV",
            "name": "Lavasa Foothills Village",
            "node_id": "NODE_VILL_LAV",
            "lat": center_lat + 0.15,
            "lon": center_lon + 0.02,
            "population": 1600,
            "urgency_level": "Normal"
        },
        "VILL_MUL": {
            "id": "VILL_MUL",
            "name": "Mulshi Dam Settlement",
            "node_id": "NODE_VILL_MUL",
            "lat": center_lat + 0.05,
            "lon": center_lon - 0.18,
            "population": 2100,
            "urgency_level": "Normal"
        }
    }

    for vid, v in villages.items():
        graph.add_node(v["node_id"], v["lat"], v["lon"], node_type="village", name=v["name"], meta=v)

    junctions = [
        ("J_CENTRAL", center_lat, center_lon, "Central Valley Junction"),
        ("J_EAST_1", center_lat + 0.03, center_lon + 0.08, "East Valley Crossing"),
        ("J_EAST_2", center_lat + 0.07, center_lon + 0.12, "Highway 48 Interchange"),
        ("J_NORTH_1", center_lat + 0.10, center_lon - 0.02, "Highland Junction"),
        ("J_NORTH_2", center_lat + 0.14, center_lon - 0.05, "North Pass Bypass"),
        ("J_WEST_1", center_lat + 0.02, center_lon - 0.08, "West Ridge Way"),
        ("J_WEST_2", center_lat - 0.03, center_lon - 0.10, "River Bridge Crossing"),
        ("J_SOUTH_1", center_lat - 0.06, center_lon - 0.02, "South Valley Fork"),
        ("J_SOUTH_2", center_lat - 0.10, center_lon + 0.04, "Forest Edge Junction"),
        ("J_ALT_ROUTE", center_lat + 0.09, center_lon + 0.18, "Eastern Scenic Bypass")
    ]

    for j_id, j_lat, j_lon, j_name in junctions:
        graph.add_node(j_id, j_lat, j_lon, node_type="junction", name=j_name)

    def connect(u: str, v: str, speed_kmh: float = 50.0, road_type: str = "paved"):
        u_node = graph.nodes[u]
        v_node = graph.nodes[v]
        dist = RoadGraph.haversine_distance(u_node["lat"], u_node["lon"], v_node["lat"], v_node["lon"])
        actual_dist = dist * 1.25
        graph.add_edge(u, v, distance_km=actual_dist, speed_kmh=speed_kmh, road_type=road_type)

    connect("NODE_VILL_A", "J_WEST_1", speed_kmh=45, road_type="rural_road")
    connect("NODE_VILL_A", "J_CENTRAL", speed_kmh=50, road_type="paved")
    connect("J_CENTRAL", "NODE_HOSP_B", speed_kmh=60, road_type="paved")
    connect("J_CENTRAL", "J_EAST_1", speed_kmh=65, road_type="highway")
    connect("J_EAST_1", "J_EAST_2", speed_kmh=70, road_type="highway")
    connect("J_EAST_2", "NODE_HOSP_C", speed_kmh=70, road_type="highway")
    
    connect("J_EAST_1", "J_ALT_ROUTE", speed_kmh=40, road_type="scenic_bypass")
    connect("J_ALT_ROUTE", "NODE_HOSP_C", speed_kmh=45, road_type="scenic_bypass")

    connect("J_CENTRAL", "J_NORTH_1", speed_kmh=55, road_type="paved")
    connect("J_NORTH_1", "NODE_VILL_LAV", speed_kmh=45, road_type="rural_road")
    connect("J_NORTH_1", "J_NORTH_2", speed_kmh=60, road_type="paved")
    connect("J_NORTH_2", "NODE_HOSP_NORTH", speed_kmh=65, road_type="paved")
    connect("NODE_VILL_KASAR", "J_NORTH_2", speed_kmh=40, road_type="rural_road")
    connect("NODE_VILL_KASAR", "J_WEST_1", speed_kmh=45, road_type="rural_road")

    connect("NODE_VILL_MUL", "J_WEST_1", speed_kmh=35, road_type="mountain_track")
    connect("J_WEST_1", "J_WEST_2", speed_kmh=50, road_type="paved")
    connect("J_WEST_2", "NODE_VILL_SHIV", speed_kmh=45, road_type="paved")
    connect("J_WEST_2", "NODE_HOSP_SOUTH", speed_kmh=55, road_type="paved")

    connect("J_CENTRAL", "J_SOUTH_1", speed_kmh=55, road_type="paved")
    connect("J_SOUTH_1", "NODE_HOSP_SOUTH", speed_kmh=60, road_type="paved")
    connect("J_SOUTH_1", "J_SOUTH_2", speed_kmh=50, road_type="paved")
    connect("J_SOUTH_2", "NODE_VILL_PIR", speed_kmh=40, road_type="forest_road")
    connect("NODE_VILL_PIR", "J_EAST_1", speed_kmh=45, road_type="rural_road")

    ambulances = {
        "AMB_1": {
            "id": "AMB_1",
            "plate": "MH-12-HE-101",
            "driver_name": "Rahul Patil",
            "driver_phone": "+91 90000 12345",
            "type": "Advanced Life Support (ALS)",
            "status": "IDLE",
            "current_node_id": "NODE_HOSP_B",
            "speed_multiplier": 1.2,
            "target_node_id": None,
            "assigned_request_id": None
        },
        "AMB_2": {
            "id": "AMB_2",
            "plate": "MH-12-HE-102",
            "driver_name": "Suresh Deshmukh",
            "driver_phone": "+91 90000 23456",
            "type": "Basic Life Support (BLS)",
            "status": "IDLE",
            "current_node_id": "J_CENTRAL",
            "speed_multiplier": 1.0,
            "target_node_id": None,
            "assigned_request_id": None
        },
        "AMB_3": {
            "id": "AMB_3",
            "plate": "MH-12-HE-103",
            "driver_name": "Vikram More",
            "driver_phone": "+91 90000 34567",
            "type": "Advanced Life Support (ALS)",
            "status": "IDLE",
            "current_node_id": "NODE_HOSP_C",
            "speed_multiplier": 1.2,
            "target_node_id": None,
            "assigned_request_id": None
        },
        "AMB_4": {
            "id": "AMB_4",
            "plate": "MH-12-HE-104",
            "driver_name": "Amit Shinde",
            "driver_phone": "+91 90000 45678",
            "type": "Basic Life Support (BLS)",
            "status": "IDLE",
            "current_node_id": "NODE_HOSP_NORTH",
            "speed_multiplier": 1.0,
            "target_node_id": None,
            "assigned_request_id": None
        }
    }

    return graph, hospitals, villages, ambulances

def generate_benchmark_graph(num_nodes: int = 50000, edges_per_node: int = 4) -> RoadGraph:
    bench_graph = RoadGraph()
    side = int(math.sqrt(num_nodes)) + 1
    
    for i in range(num_nodes):
        r = i // side
        c = i % side
        lat = 18.0 + (r * 0.005) + (random.random() * 0.001)
        lon = 73.0 + (c * 0.005) + (random.random() * 0.001)
        node_id = f"N_{i}"
        bench_graph.add_node(node_id, lat, lon)

    for i in range(num_nodes):
        r = i // side
        c = i % side
        u_id = f"N_{i}"
        
        if c + 1 < side and (i + 1) < num_nodes:
            v_id = f"N_{i + 1}"
            dist = RoadGraph.haversine_distance(bench_graph.nodes[u_id]["lat"], bench_graph.nodes[u_id]["lon"],
                                               bench_graph.nodes[v_id]["lat"], bench_graph.nodes[v_id]["lon"])
            bench_graph.add_edge(u_id, v_id, max(dist, 0.1), speed_kmh=60.0)

        if (i + side) < num_nodes:
            v_id = f"N_{i + side}"
            dist = RoadGraph.haversine_distance(bench_graph.nodes[u_id]["lat"], bench_graph.nodes[u_id]["lon"],
                                               bench_graph.nodes[v_id]["lat"], bench_graph.nodes[v_id]["lon"])
            bench_graph.add_edge(u_id, v_id, max(dist, 0.1), speed_kmh=60.0)

        if (c + 1 < side) and (i + side + 1 < num_nodes) and (random.random() < 0.4):
            v_id = f"N_{i + side + 1}"
            dist = RoadGraph.haversine_distance(bench_graph.nodes[u_id]["lat"], bench_graph.nodes[u_id]["lon"],
                                               bench_graph.nodes[v_id]["lat"], bench_graph.nodes[v_id]["lon"])
            bench_graph.add_edge(u_id, v_id, max(dist, 0.1), speed_kmh=50.0)

    return bench_graph

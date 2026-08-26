import uuid
import time
import math
import heapq
import copy
import random
from typing import Dict, List, Any, Optional
from core.graph import RoadGraph
from core.router import GraphRouter, PathResult
from core.matcher import MultiConstraintDispatcher, DispatchDecision, URGENCY_CONFIG
from core.generator import generate_district_network
from state.db import save_dispatch_log, get_recent_logs

def calculate_bearing(lat1, lon1, lat2, lon2):
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_lambda = math.radians(lon2 - lon1)
    
    y = math.sin(delta_lambda) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(delta_lambda)
    bearing_rad = math.atan2(y, x)
    bearing_deg = (math.degrees(bearing_rad) + 360) % 360
    return round(bearing_deg, 1)

def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2.0) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2.0) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def interpolate_polyline(coords: List[List[float]], sub_steps: int = 5) -> List[List[float]]:
    if not coords or len(coords) < 2:
        return coords
    
    micro_coords = []
    for i in range(len(coords) - 1):
        p1 = coords[i]
        p2 = coords[i+1]
        for step in range(sub_steps):
            frac = step / float(sub_steps)
            interp_lat = p1[0] + (p2[0] - p1[0]) * frac
            interp_lon = p1[1] + (p2[1] - p1[1]) * frac
            micro_coords.append([interp_lat, interp_lon])
    micro_coords.append(coords[-1])
    return micro_coords

class QueuedEmergency:
    """Wrapper for heap-based Priority Queue with dynamic aging and fairness."""
    def __init__(self, request_id: str, patient_name: str, village_id: str, urgency_tier: str, specialty_needed: str, medicine_needed: Optional[str], created_at: float, fairness_boost: float = 0.0):
        self.request_id = request_id
        self.patient_name = patient_name
        self.village_id = village_id
        self.urgency_tier = urgency_tier
        self.specialty_needed = specialty_needed
        self.medicine_needed = medicine_needed
        self.created_at = created_at
        self.fairness_boost = fairness_boost
        self.base_score = URGENCY_CONFIG.get(urgency_tier, {}).get("base_priority_score", 50.0)

    def calculate_effective_priority(self) -> float:
        waiting_sec = max(0.0, time.time() - self.created_at)
        # Aging factor: +0.5 priority score per second waiting in queue
        aging_score = 0.5 * waiting_sec
        return self.base_score + aging_score + self.fairness_boost

    def __lt__(self, other):
        # Higher effective priority should be popped first in min-heap (hence compare >)
        return self.calculate_effective_priority() > other.calculate_effective_priority()

    def to_dict(self) -> Dict[str, Any]:
        waiting_sec = round(time.time() - self.created_at, 1)
        effective = round(self.calculate_effective_priority(), 1)
        return {
            "request_id": self.request_id,
            "patient_name": self.patient_name,
            "village_id": self.village_id,
            "urgency_tier": self.urgency_tier,
            "specialty_needed": self.specialty_needed,
            "medicine_needed": self.medicine_needed,
            "waiting_seconds": waiting_sec,
            "effective_priority": effective,
            "status": "AWAITING_AMBULANCE"
        }

class NetworkStateManager:
    def __init__(self):
        self.reset_to_seed()

    def reset_to_seed(self):
        self.graph, self.hospitals, self.villages, self.ambulances = generate_district_network()
        self.router = GraphRouter(self.graph)
        self.dispatcher = MultiConstraintDispatcher(self.graph, self.router)
        self.active_trips: Dict[str, Dict[str, Any]] = {}
        self.request_queue: List[QueuedEmergency] = []
        self.latest_decisions: List[Dict[str, Any]] = []

    def dispatch_emergency(self, 
                           patient_name: str, 
                           village_id: str, 
                           urgency_tier: str = "T1", 
                           specialty_needed: str = "General", 
                           medicine_needed: Optional[str] = None) -> Optional[Dict[str, Any]]:
        
        req_id = f"REQ_{uuid.uuid4().hex[:6].upper()}"
        
        decision: Optional[DispatchDecision] = self.dispatcher.dispatch(
            request_id=req_id,
            patient_name=patient_name,
            village_id=village_id,
            urgency_tier=urgency_tier,
            specialty_needed=specialty_needed,
            medicine_needed=medicine_needed,
            hospitals=self.hospitals,
            ambulances=self.ambulances
        )

        if not decision:
            # Check village fairness for queue boost
            v_stat = self.dispatcher.village_stats.get(village_id, {"avg_wait_mins": 15.0})
            fairness_boost = 10.0 if v_stat["avg_wait_mins"] > self.dispatcher.get_network_average_wait() else 0.0
            
            queue_item = QueuedEmergency(
                request_id=req_id,
                patient_name=patient_name,
                village_id=village_id,
                urgency_tier=urgency_tier,
                specialty_needed=specialty_needed,
                medicine_needed=medicine_needed,
                created_at=time.time(),
                fairness_boost=fairness_boost
            )
            heapq.heappush(self.request_queue, queue_item)

            failure_decision = {
                "request_id": req_id,
                "patient_name": patient_name,
                "village_id": village_id,
                "village_name": self.graph.nodes.get(village_id, {}).get("name", village_id),
                "urgency_tier": urgency_tier,
                "specialty_needed": specialty_needed,
                "medicine_needed": medicine_needed,
                "status": "AWAITING_AMBULANCE",
                "message": "All ambulances currently occupied or no qualifying facility free. Request placed in dynamic priority queue.",
                "effective_priority": queue_item.calculate_effective_priority(),
                "decision_breadcrumbs": [
                    {
                        "step": 1,
                        "title": "Emergency Triaged",
                        "detail": f"Urgency: {urgency_tier}. Required Doctor: {specialty_needed}. Required Medicine: {medicine_needed or 'N/A'}."
                    },
                    {
                        "step": 2,
                        "title": "Fleet / Bed Constraint Check",
                        "detail": "Zero idle ambulances available in district fleet."
                    },
                    {
                        "step": 3,
                        "title": "Priority Queue Enqueued",
                        "detail": f"Placed in Priority Heap with effective score of {round(queue_item.calculate_effective_priority(), 1)}. Will auto-escalate with aging factor."
                    }
                ],
                "rejected_candidates": []
            }
            self.latest_decisions.insert(0, failure_decision)
            return failure_decision

        # Lock Bed and Medicine
        hosp_id = decision.selected_hospital["id"]
        if self.hospitals[hosp_id]["beds_available"] > 0:
            self.hospitals[hosp_id]["beds_available"] -= 1

        if medicine_needed and medicine_needed in self.hospitals[hosp_id]["inventory"]:
            if self.hospitals[hosp_id]["inventory"][medicine_needed] > 0:
                self.hospitals[hosp_id]["inventory"][medicine_needed] -= 1

        amb_id = decision.selected_ambulance["id"]
        self.ambulances[amb_id]["status"] = "EN_ROUTE_PICKUP"
        self.ambulances[amb_id]["target_node_id"] = village_id
        self.ambulances[amb_id]["assigned_request_id"] = req_id

        # Compile and interpolate full GPS trajectory
        leg1_raw = decision.ambulance_to_village_path.coordinates
        leg2_raw = decision.village_to_hospital_path.coordinates
        
        leg1_micro = interpolate_polyline(leg1_raw, sub_steps=6)
        leg2_micro = interpolate_polyline(leg2_raw, sub_steps=6)
        combined_micro = leg1_micro + (leg2_micro[1:] if leg2_micro else [])

        total_dist_km = decision.ambulance_to_village_path.distance_km + decision.village_to_hospital_path.distance_km

        trip_id = f"TRIP_{req_id}"
        self.active_trips[trip_id] = {
            "trip_id": trip_id,
            "request_id": req_id,
            "ambulance_id": amb_id,
            "hospital_id": hosp_id,
            "village_id": village_id,
            "leg": "PICKUP",
            "coords": combined_micro,
            "pickup_step_index": len(leg1_micro),
            "current_step": 0,
            "total_steps": max(len(combined_micro), 1),
            "total_distance_km": total_dist_km,
            "total_travel_time_mins": decision.total_travel_time_mins,
            "start_time": time.time(),
            "patient_name": patient_name,
            "specialty": specialty_needed,
            "destination_hospital_name": decision.selected_hospital["name"]
        }

        # Initialize GPS telemetry object on ambulance
        if combined_micro:
            start_lat, start_lon = combined_micro[0]
            next_lat, next_lon = combined_micro[1] if len(combined_micro) > 1 else (start_lat, start_lon)
            self.ambulances[amb_id]["current_lat"] = start_lat
            self.ambulances[amb_id]["current_lon"] = start_lon
            self.ambulances[amb_id]["gps_telemetry"] = {
                "active": True,
                "trip_id": trip_id,
                "request_id": req_id,
                "patient_name": patient_name,
                "destination": decision.selected_hospital["name"],
                "speed_kmh": 62.4,
                "heading_deg": calculate_bearing(start_lat, start_lon, next_lat, next_lon),
                "distance_remaining_km": round(total_dist_km, 2),
                "eta_seconds": round(total_dist_km / 60.0 * 3600),
                "satellites": 11,
                "signal_quality": "Differential GPS Lock (HDOP 0.7)",
                "current_leg": "AMBULANCE → VILLAGE PICKUP",
                "progress_pct": 0.0,
                "trail": [[start_lat, start_lon]]
            }

        dec_dict = decision.to_dict()
        self.latest_decisions.insert(0, dec_dict)
        if len(self.latest_decisions) > 20:
            self.latest_decisions.pop()

        try:
            save_dispatch_log(dec_dict)
        except Exception as e:
            print(f"Error logging to SQLite: {e}")

        return dec_dict

    def toggle_road_block(self, u: str, v: str, blocked: bool) -> Dict[str, Any]:
        self.graph.block_edge(u, v, blocked=blocked)
        
        rerouted_count = 0
        for trip_id, trip in list(self.active_trips.items()):
            amb_id = trip["ambulance_id"]
            target_hosp_id = trip["hospital_id"]
            hosp_node = self.hospitals[target_hosp_id]["node_id"]
            current_amb_node = self.ambulances[amb_id]["current_node_id"]
            
            new_path = self.router.a_star_search(current_amb_node, hosp_node)
            if new_path.found:
                trip["coords"] = interpolate_polyline(new_path.coordinates, sub_steps=6)
                trip["current_step"] = 0
                trip["total_steps"] = len(trip["coords"])
                rerouted_count += 1

        return {
            "u": u,
            "v": v,
            "blocked": blocked,
            "rerouted_active_trips": rerouted_count
        }

    def simulate_step(self):
        completed_trips = []
        for trip_id, trip in self.active_trips.items():
            amb_id = trip["ambulance_id"]
            trip["current_step"] += 1
            step = trip["current_step"]
            coords = trip["coords"]
            
            if step < len(coords):
                curr_lat, curr_lon = coords[step]
                prev_lat, prev_lon = coords[step - 1]
                
                bearing = calculate_bearing(prev_lat, prev_lon, curr_lat, curr_lon)
                rem_steps = len(coords) - step
                rem_dist = max(0.1, (rem_steps / float(len(coords))) * trip.get("total_distance_km", 15.0))
                
                speed = 64.0 + random.uniform(-3.5, 4.0)
                eta_sec = (rem_dist / max(speed, 20.0)) * 3600.0
                
                is_hospital_transit = step >= trip.get("pickup_step_index", len(coords) // 2)
                leg_name = "PATIENT → HOSPITAL IN TRANSIT" if is_hospital_transit else "AMBULANCE → VILLAGE PICKUP"
                
                self.ambulances[amb_id]["current_lat"] = curr_lat
                self.ambulances[amb_id]["current_lon"] = curr_lon
                self.ambulances[amb_id]["status"] = "TRANSIT_TO_HOSPITAL" if is_hospital_transit else "EN_ROUTE_PICKUP"
                
                trail = coords[:step+1]
                sampled_trail = trail[::max(1, len(trail)//30)] if len(trail) > 30 else trail

                self.ambulances[amb_id]["gps_telemetry"] = {
                    "active": True,
                    "trip_id": trip_id,
                    "request_id": trip.get("request_id"),
                    "patient_name": trip.get("patient_name"),
                    "destination": trip.get("destination_hospital_name"),
                    "speed_kmh": round(speed, 1),
                    "heading_deg": bearing,
                    "distance_remaining_km": round(rem_dist, 2),
                    "eta_seconds": max(10, round(eta_sec)),
                    "satellites": 11,
                    "signal_quality": "Differential GPS Lock (HDOP 0.7)",
                    "current_leg": leg_name,
                    "progress_pct": round((step / float(len(coords))) * 100, 1),
                    "trail": sampled_trail
                }
            else:
                completed_trips.append(trip_id)

        for trip_id in completed_trips:
            trip = self.active_trips.pop(trip_id)
            amb_id = trip["ambulance_id"]
            hosp_id = trip["hospital_id"]
            village_id = trip["village_id"]
            
            # Record actual trip completion in rolling village stats (Requirement 8)
            actual_travel_mins = trip.get("total_travel_time_mins", 15.0)
            self.dispatcher.record_trip_completion(village_id, actual_travel_mins)

            self.ambulances[amb_id]["status"] = "IDLE"
            self.ambulances[amb_id]["current_node_id"] = self.hospitals[hosp_id]["node_id"]
            self.ambulances[amb_id]["target_node_id"] = None
            self.ambulances[amb_id]["assigned_request_id"] = None
            hosp_node = self.graph.nodes[self.hospitals[hosp_id]["node_id"]]
            self.ambulances[amb_id]["current_lat"] = hosp_node["lat"]
            self.ambulances[amb_id]["current_lon"] = hosp_node["lon"]
            self.ambulances[amb_id]["gps_telemetry"] = {
                "active": False,
                "speed_kmh": 0.0,
                "status": "PARKED_AT_HUB"
            }

            # Check if any emergency is waiting in Priority Queue and dispatch it!
            if self.request_queue:
                next_emergency = heapq.heappop(self.request_queue)
                self.dispatch_emergency(
                    patient_name=next_emergency.patient_name,
                    village_id=next_emergency.village_id,
                    urgency_tier=next_emergency.urgency_tier,
                    specialty_needed=next_emergency.specialty_needed,
                    medicine_needed=next_emergency.medicine_needed
                )

    def run_prepackaged_scenario(self, scenario_id: int) -> Dict[str, Any]:
        self.reset_to_seed()
        
        if scenario_id == 1:
            result = self.dispatch_emergency(
                patient_name="Ramesh Patil (62M, Chest Pain)",
                village_id="NODE_VILL_A",
                urgency_tier="T1",
                specialty_needed="Cardiology",
                medicine_needed="Heparin"
            )
            return {
                "scenario_id": 1,
                "title": "Scenario 1: Critical Cardiac Emergency",
                "description": "Village A reports a severe myocardial infarction. Hospital B is closer (10km) but lacks a Cardiologist. Engine routes to Hospital C (25km), dispatches nearest ambulance, and locks Heparin & ICU bed.",
                "result": result
            }

        elif scenario_id == 2:
            self.toggle_road_block("J_EAST_1", "J_EAST_2", blocked=True)
            result = self.dispatch_emergency(
                patient_name="Pooja Shinde (Trauma Injury)",
                village_id="NODE_VILL_PIR",
                urgency_tier="T1",
                specialty_needed="Trauma",
                medicine_needed="Blood_O_Neg"
            )
            return {
                "scenario_id": 2,
                "title": "Scenario 2: Monsoon Landslide Failover",
                "description": "Highway 48 blocked. Engine recalculates optimal detour via Scenic Bypass without dropping emergency SLA.",
                "result": result
            }

        elif scenario_id == 3:
            surge_calls = [
                ("Sunita Jadhav", "NODE_VILL_A", "T1", "Cardiology", "Heparin"),
                ("Anand Kulkarni", "NODE_VILL_KASAR", "T1", "Trauma", "Epinephrine"),
                ("Ganesh More", "NODE_VILL_MUL", "T2", "General", "Anti-venom"),
                ("Kavita Deshmukh", "NODE_VILL_PIR", "T2", "Pediatrics", "Insulin"),
                ("Rahul Chavan", "NODE_VILL_SHIV", "T3", "General", None)
            ]
            results = []
            for name, vill, urg, spec, med in surge_calls:
                res = self.dispatch_emergency(patient_name=name, village_id=vill, urgency_tier=urg, specialty_needed=spec, medicine_needed=med)
                results.append(res)

            return {
                "scenario_id": 3,
                "title": "Scenario 3: Multi-Village Mass Surge",
                "description": "5 simultaneous emergency requests across multiple villages. Engine prioritizes Tier-1 critical cases first, optimizes fleet distribution, and prevents hospital bottlenecking.",
                "results": results
            }

        return {"error": "Invalid scenario ID"}

    def get_full_snapshot(self) -> Dict[str, Any]:
        for aid, amb in self.ambulances.items():
            if "current_lat" not in amb or "current_lon" not in amb:
                node = self.graph.nodes.get(amb["current_node_id"])
                if node:
                    amb["current_lat"] = node["lat"]
                    amb["current_lon"] = node["lon"]

        # Sort queue by live effective priority
        live_queue = [q.to_dict() for q in sorted(self.request_queue, key=lambda x: x.calculate_effective_priority(), reverse=True)]

        return {
            "graph": self.graph.export_graph_json(),
            "hospitals": list(self.hospitals.values()),
            "villages": list(self.villages.values()),
            "ambulances": list(self.ambulances.values()),
            "active_trips": list(self.active_trips.values()),
            "request_queue": live_queue,
            "latest_decisions": self.latest_decisions,
            "blocked_edges": [f"{min(u,v)}--{max(u,v)}" for u, v in self.graph.blocked_edges],
            "village_fairness_stats": self.dispatcher.village_stats,
            "network_average_wait_mins": self.dispatcher.get_network_average_wait()
        }

state_manager = NetworkStateManager()

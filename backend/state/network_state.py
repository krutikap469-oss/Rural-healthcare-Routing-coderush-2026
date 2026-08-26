import uuid
import time
import copy
from typing import Dict, List, Any, Optional
from core.graph import RoadGraph
from core.router import GraphRouter, PathResult
from core.matcher import MultiConstraintDispatcher, DispatchDecision
from core.generator import generate_district_network
from state.db import save_dispatch_log, get_recent_logs

class NetworkStateManager:
    def __init__(self):
        self.reset_to_seed()

    def reset_to_seed(self):
        self.graph, self.hospitals, self.villages, self.ambulances = generate_district_network()
        self.router = GraphRouter(self.graph)
        self.dispatcher = MultiConstraintDispatcher(self.graph, self.router)
        self.active_trips: Dict[str, Dict[str, Any]] = {}
        self.request_queue: List[Dict[str, Any]] = []
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
            queue_item = {
                "request_id": req_id,
                "patient_name": patient_name,
                "village_id": village_id,
                "urgency_tier": urgency_tier,
                "specialty_needed": specialty_needed,
                "medicine_needed": medicine_needed,
                "status": "QUEUED",
                "timestamp": time.time()
            }
            self.request_queue.append(queue_item)
            return {
                "status": "QUEUED",
                "message": "No qualified facility or ambulance currently free. Request placed in emergency priority queue.",
                "request_id": req_id
            }

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

        combined_coords = (decision.ambulance_to_village_path.coordinates + 
                           decision.village_to_hospital_path.coordinates[1:])

        trip_id = f"TRIP_{req_id}"
        self.active_trips[trip_id] = {
            "trip_id": trip_id,
            "request_id": req_id,
            "ambulance_id": amb_id,
            "hospital_id": hosp_id,
            "village_id": village_id,
            "leg": "PICKUP",
            "coords": combined_coords,
            "current_step": 0,
            "total_steps": max(len(combined_coords), 1),
            "start_time": time.time(),
            "patient_name": patient_name,
            "specialty": specialty_needed
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
                trip["coords"] = new_path.coordinates
                trip["current_step"] = 0
                trip["total_steps"] = len(new_path.coordinates)
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
            
            if trip["current_step"] < len(trip["coords"]):
                lat, lon = trip["coords"][trip["current_step"]]
                self.ambulances[amb_id]["current_lat"] = lat
                self.ambulances[amb_id]["current_lon"] = lon
            else:
                completed_trips.append(trip_id)

        for trip_id in completed_trips:
            trip = self.active_trips.pop(trip_id)
            amb_id = trip["ambulance_id"]
            hosp_id = trip["hospital_id"]
            
            self.ambulances[amb_id]["status"] = "IDLE"
            self.ambulances[amb_id]["current_node_id"] = self.hospitals[hosp_id]["node_id"]
            self.ambulances[amb_id]["target_node_id"] = None
            self.ambulances[amb_id]["assigned_request_id"] = None
            hosp_node = self.graph.nodes[self.hospitals[hosp_id]["node_id"]]
            self.ambulances[amb_id]["current_lat"] = hosp_node["lat"]
            self.ambulances[amb_id]["current_lon"] = hosp_node["lon"]

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
                "title": "Scenario 2: Monsoon Road Blockage & Rerouting",
                "description": "Highway 48 is blocked due to landslide. Engine detects blockage and dynamically re-routes ambulance via Eastern Scenic Bypass to reach Apex Trauma Center safely.",
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

        return {
            "graph": self.graph.export_graph_json(),
            "hospitals": list(self.hospitals.values()),
            "villages": list(self.villages.values()),
            "ambulances": list(self.ambulances.values()),
            "active_trips": list(self.active_trips.values()),
            "request_queue": self.request_queue,
            "latest_decisions": self.latest_decisions,
            "blocked_edges": [f"{min(u,v)}--{max(u,v)}" for u, v in self.graph.blocked_edges]
        }

state_manager = NetworkStateManager()

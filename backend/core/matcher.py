from typing import Dict, List, Optional, Any, Tuple
from core.graph import RoadGraph
from core.router import GraphRouter, PathResult

URGENCY_CONFIG = {
  "T1": {
    "name": "Tier 1 - Immediate / Critical",
    "color": "#ef4444",
    "max_sla_mins": 20.0,
    "urgency_boost_mult": 3.0,
    "base_priority_score": 100.0
  },
  "T2": {
    "name": "Tier 2 - Urgent / Moderate",
    "color": "#f59e0b",
    "max_sla_mins": 45.0,
    "urgency_boost_mult": 1.5,
    "base_priority_score": 50.0
  },
  "T3": {
    "name": "Tier 3 - Standard / Stable",
    "color": "#10b981",
    "max_sla_mins": 90.0,
    "urgency_boost_mult": 0.0,
    "base_priority_score": 20.0
  }
}

class DispatchDecision:
    def __init__(self, 
                 request_id: str,
                 patient_name: str,
                 village_id: str,
                 village_name: str,
                 urgency_tier: str,
                 specialty_needed: str,
                 medicine_needed: Optional[str],
                 selected_hospital: Dict[str, Any],
                 selected_ambulance: Dict[str, Any],
                 ambulance_to_village_path: PathResult,
                 village_to_hospital_path: PathResult,
                 total_travel_time_mins: float,
                 triage_wait_time_mins: float,
                 total_cost_score: float,
                 cost_breakdown: Dict[str, Any],
                 decision_breadcrumbs: List[Dict[str, Any]],
                 rejected_candidates: List[Dict[str, Any]],
                 status: str = "DISPATCHED"):
        self.request_id = request_id
        self.patient_name = patient_name
        self.village_id = village_id
        self.village_name = village_name
        self.urgency_tier = urgency_tier
        self.specialty_needed = specialty_needed
        self.medicine_needed = medicine_needed
        self.selected_hospital = selected_hospital
        self.selected_ambulance = selected_ambulance
        self.ambulance_to_village_path = ambulance_to_village_path
        self.village_to_hospital_path = village_to_hospital_path
        self.total_travel_time_mins = round(total_travel_time_mins, 2)
        self.triage_wait_time_mins = round(triage_wait_time_mins, 2)
        self.total_cost_score = round(total_cost_score, 2)
        self.cost_breakdown = cost_breakdown
        self.decision_breadcrumbs = decision_breadcrumbs
        self.rejected_candidates = rejected_candidates
        self.status = status

    def to_dict(self) -> Dict[str, Any]:
        return {
            "request_id": self.request_id,
            "patient_name": self.patient_name,
            "village_id": self.village_id,
            "village_name": self.village_name,
            "urgency_tier": self.urgency_tier,
            "specialty_needed": self.specialty_needed,
            "medicine_needed": self.medicine_needed,
            "selected_hospital": self.selected_hospital,
            "selected_ambulance": self.selected_ambulance,
            "ambulance_to_village": self.ambulance_to_village_path.to_dict(),
            "village_to_hospital": self.village_to_hospital_path.to_dict(),
            "total_travel_time_mins": self.total_travel_time_mins,
            "triage_wait_time_mins": self.triage_wait_time_mins,
            "total_cost_score": self.total_cost_score,
            "cost_breakdown": self.cost_breakdown,
            "decision_breadcrumbs": self.decision_breadcrumbs,
            "rejected_candidates": self.rejected_candidates,
            "status": self.status
        }

class MultiConstraintDispatcher:
    def __init__(self, graph: RoadGraph, router: GraphRouter):
        self.graph = graph
        self.router = router
        
        # In-memory rolling wait time statistics per village (Requirement 8)
        self.village_stats: Dict[str, Dict[str, Any]] = {
            "NODE_VILL_A": {"total_wait_mins": 45.0, "request_count": 3, "avg_wait_mins": 15.0},
            "NODE_VILL_PIR": {"total_wait_mins": 67.2, "request_count": 3, "avg_wait_mins": 22.4}, # Underserved
            "NODE_VILL_KASAR": {"total_wait_mins": 26.0, "request_count": 2, "avg_wait_mins": 13.0},
            "NODE_VILL_MUL": {"total_wait_mins": 32.0, "request_count": 2, "avg_wait_mins": 16.0},
            "NODE_VILL_LAV": {"total_wait_mins": 18.0, "request_count": 2, "avg_wait_mins": 9.0},
            "NODE_VILL_SHIV": {"total_wait_mins": 28.0, "request_count": 2, "avg_wait_mins": 14.0}
        }

    def get_network_average_wait(self) -> float:
        avgs = [s["avg_wait_mins"] for s in self.village_stats.values() if s["request_count"] > 0]
        return round(sum(avgs) / max(len(avgs), 1), 1)

    def record_trip_completion(self, village_id: str, actual_wait_mins: float):
        if village_id not in self.village_stats:
            self.village_stats[village_id] = {"total_wait_mins": 0.0, "request_count": 0, "avg_wait_mins": 15.0}
        
        stat = self.village_stats[village_id]
        stat["total_wait_mins"] += actual_wait_mins
        stat["request_count"] += 1
        stat["avg_wait_mins"] = round(stat["total_wait_mins"] / stat["request_count"], 1)

    def dispatch(self, 
                 request_id: str,
                 patient_name: str,
                 village_id: str,
                 urgency_tier: str,
                 specialty_needed: str,
                 medicine_needed: Optional[str],
                 hospitals: Dict[str, Dict[str, Any]],
                 ambulances: Dict[str, Dict[str, Any]]) -> Optional[DispatchDecision]:
        
        village_node = self.graph.nodes.get(village_id)
        if not village_node:
            return None

        village_name = village_node.get("name", village_id)
        urgency_info = URGENCY_CONFIG.get(urgency_tier, URGENCY_CONFIG["T2"])
        
        # 1. Rolling Fairness Statistics
        village_stat = self.village_stats.get(village_id, {"avg_wait_mins": 15.0, "request_count": 1})
        v_avg_wait = village_stat["avg_wait_mins"]
        net_avg_wait = self.get_network_average_wait()
        delta_fairness = v_avg_wait - net_avg_wait
        is_underserved = (delta_fairness > 0)

        breadcrumbs = []
        rejected = []

        # Step 1: Emergency Triaged & Fairness Audit
        breadcrumbs.append({
            "step": 1,
            "title": "Emergency Triaged & Fairness Evaluated",
            "detail": f"Patient '{patient_name}' at {village_name} reported {specialty_needed} emergency ({urgency_info['name']}). Village historical wait: {v_avg_wait}m vs District avg: {net_avg_wait}m ({'Underserved → Fairness Boost Applied' if is_underserved else 'Standard Triage'})."
        })

        # Step 2: Multi-Constraint Hospital Filtering (Specialist, Bed, Medicine)
        qualified_hospitals = []
        for hid, hdata in hospitals.items():
            active_specialists = hdata.get("specialists_on_duty", [])
            has_specialist = (specialty_needed == "General") or (specialty_needed in active_specialists)
            
            available_beds = hdata.get("beds_available", 0)
            has_bed = (available_beds > 0)

            has_medicine = True
            if medicine_needed:
                med_stock = hdata.get("inventory", {}).get(medicine_needed, 0)
                has_medicine = (med_stock > 0)

            if not has_specialist:
                rejected.append({
                    "hospital_id": hid,
                    "hospital_name": hdata["name"],
                    "reason": f"No on-duty {specialty_needed} specialist available",
                    "code": "MISSING_SPECIALIST"
                })
            elif not has_bed:
                rejected.append({
                    "hospital_id": hid,
                    "hospital_name": hdata["name"],
                    "reason": "Zero beds available (Capacity full)",
                    "code": "NO_BEDS"
                })
            elif not has_medicine:
                rejected.append({
                    "hospital_id": hid,
                    "hospital_name": hdata["name"],
                    "reason": f"Out of stock for required medication: {medicine_needed}",
                    "code": "OUT_OF_STOCK"
                })
            else:
                qualified_hospitals.append((hid, hdata))

        breadcrumbs.append({
            "step": 2,
            "title": "Medical Facility Constraint Filtering",
            "detail": f"{len(qualified_hospitals)} of {len(hospitals)} regional hospitals satisfy all constraints ({specialty_needed}, bed capacity, {medicine_needed or 'N/A'})."
        })

        if not qualified_hospitals:
            breadcrumbs.append({
                "step": 3,
                "title": "Dispatcher Alert: No Qualified Facility Found",
                "detail": "CRITICAL: All hospitals lack required specialist, bed, or medicine stock. Request queued."
            })
            return None

        # Check Available Ambulances
        available_ambulances = []
        for aid, adata in ambulances.items():
            if adata.get("status") == "IDLE":
                available_ambulances.append((aid, adata))

        if not available_ambulances:
            breadcrumbs.append({
                "step": 3,
                "title": "Fleet Alert: All Ambulances Occupied",
                "detail": "All fleet ambulances currently busy on calls. Request placed into priority queue."
            })
            return None

        # Step 3: Formal Cost Function Optimization
        # Cost = w1 * travelTime + w2 * waitTime + w3 * fairnessPenalty - w4 * urgencyBoost
        w1 = 1.0  # Travel time weight
        w2 = 1.2  # Triage wait time weight
        w3 = 0.5  # Fairness penalty/boost weight
        w4 = 4.0  # Urgency discount weight

        best_candidate = None
        min_total_cost = float("inf")

        for hid, hdata in qualified_hospitals:
            hosp_node_id = hdata["node_id"]
            path_vil_to_hosp = self.router.a_star_search(village_id, hosp_node_id)
            
            if not path_vil_to_hosp.found:
                rejected.append({
                    "hospital_id": hid,
                    "hospital_name": hdata["name"],
                    "reason": "Road impassable / No route available due to blockages",
                    "code": "ROAD_BLOCKED"
                })
                continue

            for aid, adata in available_ambulances:
                amb_node_id = adata["current_node_id"]
                path_amb_to_vil = self.router.a_star_search(amb_node_id, village_id)
                
                if not path_amb_to_vil.found:
                    continue

                travel_time = path_amb_to_vil.total_time_mins + path_vil_to_hosp.total_time_mins
                triage_wait = hdata.get("current_triage_wait_mins", 5.0)
                urgency_boost = urgency_info["urgency_boost_mult"]
                
                # Fairness adjustment: if village has waited longer, delta_fairness > 0 -> subtract cost
                fairness_term = - (w3 * delta_fairness)
                urgency_term = - (w4 * urgency_boost)
                
                final_cost = (w1 * travel_time) + (w2 * triage_wait) + fairness_term + urgency_term

                if final_cost < min_total_cost:
                    min_total_cost = final_cost
                    best_candidate = {
                        "hospital": hdata,
                        "ambulance": adata,
                        "path_amb_to_vil": path_amb_to_vil,
                        "path_vil_to_hosp": path_vil_to_hosp,
                        "travel_time": travel_time,
                        "triage_wait": triage_wait,
                        "cost_breakdown": {
                            "w1_travel_term": round(w1 * travel_time, 2),
                            "w2_wait_term": round(w2 * triage_wait, 2),
                            "w3_fairness_term": round(fairness_term, 2),
                            "w4_urgency_term": round(urgency_term, 2),
                            "w1": w1,
                            "w2": w2,
                            "w3": w3,
                            "w4": w4,
                            "travel_time_mins": round(travel_time, 2),
                            "triage_wait_mins": round(triage_wait, 2),
                            "village_avg_wait_mins": v_avg_wait,
                            "network_avg_wait_mins": net_avg_wait,
                            "delta_fairness": round(delta_fairness, 1),
                            "is_underserved": is_underserved,
                            "final_cost": round(final_cost, 2)
                        }
                    }

        if not best_candidate:
            return None

        hosp = best_candidate["hospital"]
        amb = best_candidate["ambulance"]
        breakdown = best_candidate["cost_breakdown"]
        
        breadcrumbs.append({
            "step": 3,
            "title": "A* Pathfinding & Composite Cost Optimization",
            "detail": f"Computed A* path. Cost formula: ({breakdown['w1_travel_term']} Travel) + ({breakdown['w2_wait_term']} Wait) + ({breakdown['w3_fairness_term']} Fairness) + ({breakdown['w4_urgency_term']} Urgency) = Final Score: {breakdown['final_cost']}."
        })
        
        breadcrumbs.append({
            "step": 4,
            "title": "Resource Lock & Dispatch Triggered",
            "detail": f"Assigned Ambulance #{amb['id']} ({amb['type']}). Locked 1 bed at {hosp['name']} and reserved {medicine_needed or 'standard triage kit'}."
        })

        return DispatchDecision(
            request_id=request_id,
            patient_name=patient_name,
            village_id=village_id,
            village_name=village_name,
            urgency_tier=urgency_tier,
            specialty_needed=specialty_needed,
            medicine_needed=medicine_needed,
            selected_hospital=hosp,
            selected_ambulance=amb,
            ambulance_to_village_path=best_candidate["path_amb_to_vil"],
            village_to_hospital_path=best_candidate["path_vil_to_hosp"],
            total_travel_time_mins=best_candidate["travel_time"],
            triage_wait_time_mins=best_candidate["triage_wait"],
            total_cost_score=breakdown["final_cost"],
            cost_breakdown=breakdown,
            decision_breadcrumbs=breadcrumbs,
            rejected_candidates=rejected,
            status="DISPATCHED"
        )

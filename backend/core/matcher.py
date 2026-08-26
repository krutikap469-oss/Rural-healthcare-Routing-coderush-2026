from typing import Dict, List, Optional, Any, Tuple
from core.graph import RoadGraph
from core.router import GraphRouter, PathResult

URGENCY_CONFIG = {
    "T1": {
        "name": "Tier 1 - Immediate / Critical",
        "color": "#ef4444",
        "max_sla_mins": 20.0,
        "cost_multiplier": 2.5,
        "wait_penalty_per_min": 5.0
    },
    "T2": {
        "name": "Tier 2 - Urgent / Moderate",
        "color": "#f59e0b",
        "max_sla_mins": 45.0,
        "cost_multiplier": 1.5,
        "wait_penalty_per_min": 2.0
    },
    "T3": {
        "name": "Tier 3 - Standard / Stable",
        "color": "#10b981",
        "max_sla_mins": 90.0,
        "cost_multiplier": 1.0,
        "wait_penalty_per_min": 1.0
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
            "decision_breadcrumbs": self.decision_breadcrumbs,
            "rejected_candidates": self.rejected_candidates,
            "status": self.status
        }

class MultiConstraintDispatcher:
    def __init__(self, graph: RoadGraph, router: GraphRouter):
        self.graph = graph
        self.router = router

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
        
        breadcrumbs = []
        rejected = []

        breadcrumbs.append({
            "step": 1,
            "title": "Emergency Triaged",
            "detail": f"Patient '{patient_name}' at {village_name} reported {specialty_needed} emergency ({urgency_info['name']}). Required medicine: {medicine_needed or 'None'}."
        })

        qualified_hospitals = []
        for hid, hdata in hospitals.items():
            active_specialists = hdata.get("specialists_on_duty", [])
            has_specialist = (specialty_needed == "General") or (specialty_needed in active_specialists)
            
            available_beds = hdata.get("beds_available", 0)
            has_bed = available_beds > 0

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
                "detail": "CRITICAL: All hospitals lack required specialist, bed, or medicine stock."
            })
            return None

        available_ambulances = []
        for aid, adata in ambulances.items():
            if adata.get("status") == "IDLE":
                available_ambulances.append((aid, adata))

        if not available_ambulances:
            breadcrumbs.append({
                "step": 3,
                "title": "Fleet Alert: All Ambulances Occupied",
                "detail": "No idle ambulances available in district network. Queueing request."
            })
            return None

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
                
                cost_score = (travel_time * urgency_info["cost_multiplier"]) + (triage_wait * urgency_info["wait_penalty_per_min"])

                if cost_score < min_total_cost:
                    min_total_cost = cost_score
                    best_candidate = {
                        "hospital": hdata,
                        "ambulance": adata,
                        "path_amb_to_vil": path_amb_to_vil,
                        "path_vil_to_hosp": path_vil_to_hosp,
                        "travel_time": travel_time,
                        "triage_wait": triage_wait,
                        "cost_score": cost_score
                    }

        if not best_candidate:
            return None

        hosp = best_candidate["hospital"]
        amb = best_candidate["ambulance"]
        
        breadcrumbs.append({
            "step": 3,
            "title": "A* Pathfinding & Cost Optimization",
            "detail": f"Evaluated candidate paths. Selected {hosp['name']} and Ambulance #{amb['id']} with optimal combined travel time of {best_candidate['travel_time']} mins."
        })
        breadcrumbs.append({
            "step": 4,
            "title": "Resource Lock & Dispatch Triggered",
            "detail": f"Locked 1 bed at {hosp['name']}. Reserved {medicine_needed or 'standard triage kit'}. Ambulance #{amb['id']} dispatched en route to {village_name}."
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
            total_cost_score=best_candidate["cost_score"],
            decision_breadcrumbs=breadcrumbs,
            rejected_candidates=rejected,
            status="DISPATCHED"
        )

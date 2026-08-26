import sqlite3
import json
import os
from typing import List, Dict, Any, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "dispatch_audit.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS dispatch_logs (
            request_id TEXT PRIMARY KEY,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            patient_name TEXT,
            village_id TEXT,
            village_name TEXT,
            urgency_tier TEXT,
            specialty_needed TEXT,
            medicine_needed TEXT,
            hospital_id TEXT,
            hospital_name TEXT,
            ambulance_id TEXT,
            travel_time_mins REAL,
            triage_wait_time_mins REAL,
            total_cost_score REAL,
            breadcrumbs_json TEXT,
            rejected_json TEXT,
            status TEXT
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS benchmark_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            node_count INTEGER,
            edge_count INTEGER,
            query_count INTEGER,
            avg_a_star_ms REAL,
            avg_dijkstra_ms REAL,
            speedup_ratio REAL
        )
    """)
    conn.commit()
    conn.close()

def save_dispatch_log(dispatch_data: Dict[str, Any]):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO dispatch_logs (
            request_id, patient_name, village_id, village_name, urgency_tier,
            specialty_needed, medicine_needed, hospital_id, hospital_name,
            ambulance_id, travel_time_mins, triage_wait_time_mins, total_cost_score,
            breadcrumbs_json, rejected_json, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        dispatch_data["request_id"],
        dispatch_data["patient_name"],
        dispatch_data["village_id"],
        dispatch_data["village_name"],
        dispatch_data["urgency_tier"],
        dispatch_data["specialty_needed"],
        dispatch_data.get("medicine_needed"),
        dispatch_data["selected_hospital"]["id"],
        dispatch_data["selected_hospital"]["name"],
        dispatch_data["selected_ambulance"]["id"],
        dispatch_data["total_travel_time_mins"],
        dispatch_data["triage_wait_time_mins"],
        dispatch_data["total_cost_score"],
        json.dumps(dispatch_data["decision_breadcrumbs"]),
        json.dumps(dispatch_data["rejected_candidates"]),
        dispatch_data["status"]
    ))
    conn.commit()
    conn.close()

def get_recent_logs(limit: int = 50) -> List[Dict[str, Any]]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM dispatch_logs ORDER BY timestamp DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    results = []
    for r in rows:
        item = dict(r)
        item["decision_breadcrumbs"] = json.loads(item["breadcrumbs_json"]) if item["breadcrumbs_json"] else []
        item["rejected_candidates"] = json.loads(item["rejected_json"]) if item["rejected_json"] else []
        results.append(item)
    conn.close()
    return results

def save_benchmark_result(node_count: int, edge_count: int, query_count: int, avg_a_star_ms: float, avg_dijkstra_ms: float):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    speedup = (avg_dijkstra_ms / max(avg_a_star_ms, 0.001))
    cursor.execute("""
        INSERT INTO benchmark_history (
            node_count, edge_count, query_count, avg_a_star_ms, avg_dijkstra_ms, speedup_ratio
        ) VALUES (?, ?, ?, ?, ?, ?)
    """, (node_count, edge_count, query_count, avg_a_star_ms, avg_dijkstra_ms, round(speedup, 2)))
    conn.commit()
    conn.close()

init_db()

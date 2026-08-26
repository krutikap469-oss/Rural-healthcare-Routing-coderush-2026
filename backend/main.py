import asyncio
import time
import random
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from core.generator import generate_benchmark_graph
from core.router import GraphRouter
from state.network_state import state_manager
from state.db import get_recent_logs, save_benchmark_result

active_websockets: List[WebSocket] = []

async def simulation_loop():
    while True:
        try:
            state_manager.simulate_step()
            snapshot = state_manager.get_full_snapshot()
            
            disconnected = []
            for ws in active_websockets:
                try:
                    await ws.send_json({"type": "TELEMETRY_UPDATE", "data": snapshot})
                except Exception:
                    disconnected.append(ws)
                    
            for ws in disconnected:
                if ws in active_websockets:
                    active_websockets.remove(ws)
                    
            await asyncio.sleep(0.6)
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"Simulation loop tick error: {e}")
            await asyncio.sleep(1.0)

@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(simulation_loop())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass

app = FastAPI(
    title="PulseRoute AI - Decentralized Healthcare Dispatch Engine",
    description="Intelligent routing and resource allocation for rural healthcare networks.",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class EmergencyRequest(BaseModel):
    patient_name: str = Field(..., example="Ramesh Patil")
    village_id: str = Field(..., example="NODE_VILL_A")
    urgency_tier: str = Field(default="T1", example="T1")
    specialty_needed: str = Field(default="Cardiology", example="Cardiology")
    medicine_needed: Optional[str] = Field(default="Heparin", example="Heparin")

class RoadBlockRequest(BaseModel):
    u: str = Field(..., example="J_EAST_1")
    v: str = Field(..., example="J_EAST_2")
    blocked: bool = Field(default=True, example=True)

class BenchmarkRequest(BaseModel):
    node_count: int = Field(default=50000, ge=1000, le=100000, example=50000)
    query_count: int = Field(default=20, ge=1, le=100, example=20)

@app.get("/")
def root():
    return {
        "system": "PulseRoute AI Rural Healthcare Dispatch Engine",
        "status": "ONLINE",
        "endpoints": ["/api/network", "/api/dispatch", "/api/scenario/{id}", "/api/block-road", "/api/benchmark", "/api/logs", "/ws/live"]
    }

@app.get("/api/network")
def get_network():
    return state_manager.get_full_snapshot()

@app.post("/api/dispatch")
def dispatch_call(req: EmergencyRequest):
    result = state_manager.dispatch_emergency(
        patient_name=req.patient_name,
        village_id=req.village_id,
        urgency_tier=req.urgency_tier,
        specialty_needed=req.specialty_needed,
        medicine_needed=req.medicine_needed
    )
    if not result:
        raise HTTPException(status_code=400, detail="Dispatch failed: No candidate could satisfy constraints.")
    return result

@app.post("/api/scenario/{scenario_id}")
def run_scenario(scenario_id: int):
    result = state_manager.run_prepackaged_scenario(scenario_id)
    return result

@app.post("/api/block-road")
def toggle_road(req: RoadBlockRequest):
    result = state_manager.toggle_road_block(req.u, req.v, req.blocked)
    return result

@app.post("/api/reset")
def reset_network():
    state_manager.reset_to_seed()
    return {"status": "SUCCESS", "message": "Network reset to seed parameters."}

@app.get("/api/logs")
def get_logs(limit: int = Query(default=20, ge=1, le=100)):
    return get_recent_logs(limit=limit)

@app.post("/api/benchmark")
def run_stress_benchmark(req: BenchmarkRequest):
    t_gen_start = time.perf_counter()
    bench_graph = generate_benchmark_graph(num_nodes=req.node_count)
    gen_time_sec = round(time.perf_counter() - t_gen_start, 3)

    router = GraphRouter(bench_graph)
    node_keys = list(bench_graph.nodes.keys())
    
    a_star_times = []
    dijkstra_times = []
    explored_a_star = []
    explored_dijkstra = []

    for _ in range(req.query_count):
        src = random.choice(node_keys)
        dst = random.choice(node_keys)
        
        res_a = router.a_star_search(src, dst)
        a_star_times.append(res_a.execution_ms)
        explored_a_star.append(res_a.nodes_explored)

        res_d = router.dijkstra_search(src, dst)
        dijkstra_times.append(res_d.execution_ms)
        explored_dijkstra.append(res_d.nodes_explored)

    avg_a_star = round(sum(a_star_times) / len(a_star_times), 3) if a_star_times else 0.0
    avg_dijkstra = round(sum(dijkstra_times) / len(dijkstra_times), 3) if dijkstra_times else 0.0
    avg_explored_a = round(sum(explored_a_star) / len(explored_a_star), 1) if explored_a_star else 0
    avg_explored_d = round(sum(explored_dijkstra) / len(explored_dijkstra), 1) if explored_dijkstra else 0
    speedup = round(avg_dijkstra / max(avg_a_star, 0.001), 2)
    pruned_ratio = round((1.0 - (avg_explored_a / max(avg_explored_d, 1))) * 100, 1)

    edge_count = sum(len(neighbors) for neighbors in bench_graph.adjacency.values()) // 2

    try:
        save_benchmark_result(
            node_count=req.node_count,
            edge_count=edge_count,
            query_count=req.query_count,
            avg_a_star_ms=avg_a_star,
            avg_dijkstra_ms=avg_dijkstra
        )
    except Exception as e:
        print(f"Error logging benchmark: {e}")

    return {
        "status": "COMPLETED",
        "node_count": req.node_count,
        "edge_count": edge_count,
        "queries_executed": req.query_count,
        "graph_generation_sec": gen_time_sec,
        "a_star": {
            "avg_latency_ms": avg_a_star,
            "min_latency_ms": round(min(a_star_times), 3),
            "max_latency_ms": round(max(a_star_times), 3),
            "avg_nodes_explored": avg_explored_a
        },
        "dijkstra": {
            "avg_latency_ms": avg_dijkstra,
            "min_latency_ms": round(min(dijkstra_times), 3),
            "max_latency_ms": round(max(dijkstra_times), 3),
            "avg_nodes_explored": avg_explored_d
        },
        "efficiency": {
            "speedup_factor": f"{speedup}x faster",
            "search_space_pruned_pct": f"{pruned_ratio}%"
        }
    }

@app.websocket("/ws/live")
async def websocket_telemetry(websocket: WebSocket):
    await websocket.accept()
    active_websockets.append(websocket)
    try:
        await websocket.send_json({
            "type": "INITIAL_STATE",
            "data": state_manager.get_full_snapshot()
        })
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        if websocket in active_websockets:
            active_websockets.remove(websocket)
    except Exception:
        if websocket in active_websockets:
            active_websockets.remove(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

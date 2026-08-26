# Rural-healthcare-Routing-coderush-2026 (PulseRoute AI)

An intelligent rural healthcare dispatch and routing engine that dynamically dispatches ambulances, routes emergency patients to qualified medical facilities, and manages volatile medicine supplies while minimizing total operational cost (Travel Time + Wait Time) and respecting emergency triage SLAs.

Built for **CodeRush 2026**.

---

## 🚀 Quick Setup & How to Run in VS Code

### 1. Open the Project in VS Code
Open VS Code and choose **File > Open Folder...**, then select:
`C:\Users\KRUTIKA\Rural-healthcare-Routing-coderush-2026`

---

### 2. Run the FastAPI Backend (Terminal 1 in VS Code)
Press `` Ctrl + ` `` to open the VS Code Terminal, then run:

```powershell
# Navigate to backend directory
cd backend

# Create virtual environment (recommended)
python -m venv venv
.\venv\Scripts\activate

# Install Python requirements
pip install -r requirements.txt

# Start FastAPI server
python main.py
```
> Backend starts at **`http://127.0.0.1:8000`** with real-time WebSocket telemetry stream at **`ws://127.0.0.1:8000/ws/live`**.

---

### 3. Run the React Frontend (Terminal 2 in VS Code)
Open a **new split terminal** in VS Code (click the `+` or split icon), then run:

```powershell
# Navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```
> Open **`http://localhost:5173`** in your browser!

---

## 🎯 1-Click Interactive Judge Demo Scenarios

| Scenario | Feature Tested | Algorithmic Execution |
| :--- | :--- | :--- |
| **Scenario 1: Cardiology Emergency** | **Hackathon Prompt Test Case** | Village A requests urgent cardiology. Hospital B (10km) has no cardiologist; Hospital C (25km) has an on-duty specialist. The engine routes to Hospital C, dispatches the nearest ambulance, and reserves Heparin medication. |
| **Scenario 2: Monsoon Road Blockage** | **Dynamic Graph Rerouting** | Highway 48 is blocked by landslide. Engine instantly detects blockage and reroutes ambulance through the Eastern Scenic Bypass. |
| **Scenario 3: Multi-Village Mass Surge** | **Priority Queues & Starvation Prevention** | 5 simultaneous village emergency calls arrive. Engine optimizes Tier-1 triage SLAs and distributes ambulances evenly across district hubs. |
| **50,000 Node Stress Benchmark** | **Algorithmic Scale & Efficiency** | Click the **"50k Benchmark"** button in the header to run A* vs Dijkstra across 50,000 nodes and 200,000 edges. Demonstrates sub-millisecond execution times ($\le 5\text{ms}$) and search space pruning %. |

---

## 🏗️ System Architecture

- **Frontend**: React 18, Vite, JavaScript, Tailwind CSS, React-Leaflet, Lucide Icons.
- **Backend**: Python 3.9+, FastAPI, WebSockets (60 FPS Telemetry stream), NumPy.
- **Core Algorithms**:
  - Heuristic A* with Haversine distance metric.
  - Multi-constraint Pareto candidate matcher (Specialist on duty, Bed capacity, Medicine buffer).
  - Priority Queue (Min-Heap) for emergency triage SLAs.
  - In-Memory Spatial Road Graph with dynamic edge weight updates and SQLite audit persistence.

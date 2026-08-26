import React from 'react';
import { Activity, RotateCcw, PlusCircle, Cpu, HeartPulse, Truck, Bed, ShieldCheck, PanelRightClose, PanelRightOpen } from 'lucide-react';

export default function Navbar({ 
  isConnected, 
  networkData,
  onReset, 
  onOpenEmergencyModal, 
  onOpenBenchmarkModal,
  isSidebarOpen,
  onToggleSidebar,
  telemetryOverride = null
}) {
  const ambulances = networkData?.ambulances || [];
  const hospitals = networkData?.hospitals || [];
  const blockedCount = networkData?.blocked_edges?.length || 0;
  
  const rawIdle = ambulances.filter(a => a.status === 'IDLE').length;
  const rawBeds = hospitals.reduce((sum, h) => sum + (h.beds_available || 0), 0);
  const rawTrips = networkData?.active_trips?.length || 0;

  // Use telemetryOverride if in the middle of a staggered influx animation
  const idleAmbulances = telemetryOverride?.idleAmbulances !== undefined ? telemetryOverride.idleAmbulances : rawIdle;
  const totalBeds = telemetryOverride?.totalBeds !== undefined ? telemetryOverride.totalBeds : rawBeds;
  const activeTripsCount = telemetryOverride?.activeTrips !== undefined ? telemetryOverride.activeTrips : rawTrips;

  return (
    <header className="h-16 bg-[#0a0f1d]/90 backdrop-blur-xl border-b border-slate-800/80 px-4 md:px-6 flex items-center justify-between z-40 sticky top-0 shadow-lg">
      {/* Brand & Identity */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 ring-1 ring-cyan-400/40">
          <HeartPulse className="w-5 h-5 text-white animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-base md:text-lg tracking-tight text-white flex items-center gap-1.5">
              PulseRoute <span className="text-cyan-400 text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800/60 font-mono font-bold">SMART HEALTHCARE</span>
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              SYSTEM ONLINE
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block font-medium">Smart Rural Emergency Ambulance Dispatcher & Routing System</p>
        </div>
      </div>

      {/* Center Live Telemetry Stat Pills */}
      <div className="hidden lg:flex items-center gap-2.5">
        <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 shadow-inner">
          <Truck className={`w-3.5 h-3.5 ${idleAmbulances > 0 ? 'text-cyan-400' : 'text-rose-400'}`} />
          <span>Ambulances: <strong className={idleAmbulances > 0 ? 'text-emerald-400 font-bold' : 'text-rose-400'}>{idleAmbulances}/{ambulances.length} Ready</strong></span>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 shadow-inner">
          <Bed className="w-3.5 h-3.5 text-cyan-400" />
          <span>Hospital Beds: <strong className="text-white font-bold">{totalBeds} Free</strong></span>
        </div>

        {blockedCount > 0 ? (
          <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 rounded-xl text-rose-400 text-xs font-mono animate-pulse font-bold">
            <span>⚠️ {blockedCount} Road Blocked</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-emerald-400 text-xs font-mono font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>All Roads Clear</span>
          </div>
        )}

        {activeTripsCount > 0 && (
          <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl text-amber-300 text-xs font-mono animate-pulse">
            <Activity className="w-3.5 h-3.5 animate-spin" />
            <span>{activeTripsCount} Ambulance Driving</span>
          </div>
        )}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onReset}
          className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 rounded-xl border border-slate-800 hover:border-slate-700 transition-all active:scale-95 shadow-sm"
          title="Reset simulation to default state (clears all logs and collapses panels)"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden sm:inline font-semibold">Reset</span>
        </button>

        <button
          onClick={onOpenBenchmarkModal}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-cyan-300 hover:text-cyan-200 bg-cyan-950/60 hover:bg-cyan-900/60 rounded-xl border border-cyan-800/60 transition-all active:scale-95 shadow-sm shadow-cyan-950/40"
        >
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span>⚡ 50,000 Node Speed Test</span>
        </button>

        <button
          onClick={onOpenEmergencyModal}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 rounded-xl shadow-lg shadow-rose-900/30 transition-all active:scale-95 border border-rose-400/30"
        >
          <PlusCircle className="w-4 h-4 text-white" />
          <span>+ New Emergency Call</span>
        </button>

        {/* Sidebar Toggle Button (Only active when a request is active) */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition-colors ml-1 shadow-sm"
            title={isSidebarOpen ? "Hide Side Details Panel" : "Show Side Details Panel"}
          >
            {isSidebarOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </button>
        )}
      </div>
    </header>
  );
}

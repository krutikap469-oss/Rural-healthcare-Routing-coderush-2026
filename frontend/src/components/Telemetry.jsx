import React, { useState } from 'react';
import { Building2, Pill, Truck, Clock, Scale, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';
import { URGENCY_TIERS } from '../utils/constants';

export default function Telemetry({ networkData }) {
  const [activeTab, setActiveTab] = useState('hospitals');

  if (!networkData) return null;

  const { 
    hospitals = [], 
    ambulances = [], 
    request_queue = [],
    village_fairness_stats = {},
    network_average_wait_mins = 14.9
  } = networkData;

  const districtStock = {};
  hospitals.forEach((h) => {
    Object.entries(h.inventory || {}).forEach(([drug, count]) => {
      districtStock[drug] = (districtStock[drug] || 0) + count;
    });
  });

  const activeAmbulancesCount = ambulances.filter(a => a.status !== 'IDLE').length;

  return (
    <div className="flex flex-col h-full bg-[#0a0f1d]">
      {/* Top Pill Tabs */}
      <div className="flex items-center border-b border-slate-800/80 bg-slate-900/80 p-2 gap-1.5 sticky top-0 z-10">
        <button
          onClick={() => setActiveTab('hospitals')}
          className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'hospitals'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Hospitals</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'inventory'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
          }`}
        >
          <Pill className="w-3.5 h-3.5" />
          <span>Pharmacy</span>
        </button>

        <button
          onClick={() => setActiveTab('fleet')}
          className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'fleet'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Fleet ({activeAmbulancesCount}/{ambulances.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('fairness')}
          className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'fairness'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>Fairness</span>
        </button>

        {request_queue.length > 0 && (
          <button
            onClick={() => setActiveTab('queue')}
            className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'queue'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-950'
                : 'text-rose-400 hover:text-rose-300 bg-rose-950/40 animate-pulse'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Queue ({request_queue.length})</span>
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* 1. Hospitals Tab */}
        {activeTab === 'hospitals' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>HOSPITAL BEDS & ACTIVE DOCTORS</span>
              <span>{hospitals.length} CENTERS</span>
            </div>

            {hospitals.map((hosp) => {
              const bedPct = Math.round((hosp.beds_available / hosp.beds_total) * 100);
              const isApex = hosp.id === 'HOSP_C';
              return (
                <div
                  key={hosp.id}
                  className={`bg-slate-900/80 border rounded-2xl p-3.5 space-y-2.5 transition-all shadow-sm ${
                    isApex ? 'border-cyan-500/40 shadow-cyan-950/30' : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                        {hosp.name}
                        {isApex && <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded-full font-mono font-bold border border-cyan-500/30">MAIN HUB</span>}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-medium">{hosp.tier} • Expected Wait: <strong className="text-amber-400 font-mono">{hosp.current_triage_wait_mins} mins</strong></span>
                    </div>
                    <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg ${
                      hosp.beds_available > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse'
                    }`}>
                      {hosp.beds_available}/{hosp.beds_total} BEDS FREE
                    </span>
                  </div>

                  {/* Bed Capacity Bar */}
                  <div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          bedPct > 30 ? 'bg-gradient-to-r from-cyan-500 to-emerald-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${bedPct}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* On Duty Specialists */}
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono block mb-1">ON-DUTY SPECIALIST DOCTORS:</span>
                    <div className="flex flex-wrap gap-1">
                      {hosp.specialists_on_duty.map((spec) => (
                        <span
                          key={spec}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                            spec === 'Cardiology' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                            spec === 'Trauma' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                            'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 2. Pharmacy Tab */}
        {activeTab === 'inventory' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>CRITICAL MEDICINE STOCK</span>
              <span>DISTRICT TOTALS</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {Object.entries(districtStock).map(([drug, total]) => (
                <div
                  key={drug}
                  className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 space-y-1 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">{drug}</span>
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                      total > 15 ? 'bg-emerald-500/10 text-emerald-400' :
                      total > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400 animate-pulse'
                    }`}>
                      {total} units
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono block">
                    {total === 0 ? '⚠️ OUT OF STOCK' : 'Available in stock'}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800">
              <span className="text-xs font-bold text-slate-300 block mb-2 font-mono">STOCK PER HOSPITAL</span>
              <div className="space-y-2">
                {hospitals.map((hosp) => (
                  <div key={hosp.id} className="bg-slate-900/50 p-2.5 rounded-xl text-[11px] border border-slate-800">
                    <span className="font-semibold text-slate-300 block mb-1">{hosp.name}</span>
                    <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
                      {Object.entries(hosp.inventory || {}).map(([d, c]) => (
                        <span key={d} className={`px-1.5 py-0.5 rounded ${c === 0 ? 'bg-rose-950 text-rose-400 line-through border border-rose-900' : 'bg-slate-800 text-slate-300'}`}>
                          {d}: {c}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. Fleet Tab */}
        {activeTab === 'fleet' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>AMBULANCE FLEET STATUS</span>
              <span>{ambulances.length} VEHICLES</span>
            </div>

            {ambulances.map((amb) => {
              const isEnRoute = amb.status.startsWith('EN_ROUTE') || amb.status.startsWith('TRANSIT');
              return (
                <div
                  key={amb.id}
                  className={`bg-slate-900/80 border rounded-2xl p-3.5 space-y-2 transition-all shadow-sm ${
                    isEnRoute ? 'border-cyan-500/40 bg-cyan-950/10' : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Truck className={`w-4 h-4 ${isEnRoute ? 'text-cyan-400 animate-bounce' : 'text-slate-400'}`} />
                      <span className="text-xs font-bold text-slate-100">Ambulance #{amb.id}</span>
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      amb.status === 'IDLE' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                      'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse'
                    }`}>
                      {amb.status === 'IDLE' ? 'READY / IDLE' : 'DRIVING ON ROUTE'}
                    </span>
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                    <span>Plate: <strong className="text-slate-200">{amb.plate}</strong></span>
                    <span>Type: <strong className="text-slate-200">{amb.type}</strong></span>
                  </div>

                  {amb.assigned_request_id && (
                    <div className="pt-1.5 border-t border-slate-800/80 flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>Assigned Call ID:</span>
                      <span className="text-cyan-300 font-bold">{amb.assigned_request_id}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 4. Fairness Statistics Tab (Requirement 8) */}
        {activeTab === 'fairness' && (
          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-cyan-400" />
                ROLLING WAIT TIME AUDIT
              </span>
              <span>Net Avg: <strong className="text-white">{network_average_wait_mins}m</strong></span>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 space-y-2">
              <p className="text-[11px] text-slate-400 leading-relaxed font-sans font-normal">
                PulseRoute tracks historical waiting times per village. Underserved villages that wait longer than the network average automatically receive a <strong className="text-emerald-400">fairness priority adjustment</strong> to prevent starvation.
              </p>
            </div>

            <div className="space-y-2">
              {Object.entries(village_fairness_stats).map(([vId, s]) => {
                const isUnderserved = s.avg_wait_mins > network_average_wait_mins;
                return (
                  <div
                    key={vId}
                    className={`bg-slate-900/90 border rounded-xl p-2.5 flex items-center justify-between ${
                      isUnderserved ? 'border-emerald-500/40 bg-emerald-950/10' : 'border-slate-800'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">{vId.replace('NODE_VILL_', 'Village ')}</span>
                      <span className="text-[10px] text-slate-500">{s.request_count} past calls logged</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-bold block ${isUnderserved ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {s.avg_wait_mins} mins avg
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${isUnderserved ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                        {isUnderserved ? 'Underserved (+Fairness Boost)' : 'Balanced'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. Priority Queue Tab with Aging Escalation */}
        {activeTab === 'queue' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-rose-400 font-mono">
              <span>PRIORITY QUEUE (BINARY HEAP)</span>
              <span>{request_queue.length} PENDING</span>
            </div>

            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-400 font-mono">
              <span className="text-cyan-400 font-bold block mb-0.5">⚡ Dynamic Aging Active:</span>
              Waiting requests automatically gain +0.5 priority score/sec so lower-priority cases cannot starve.
            </div>

            {request_queue.map((req, idx) => {
              const tier = URGENCY_TIERS[req.urgency_tier] || URGENCY_TIERS.T2;
              return (
                <div
                  key={req.request_id}
                  className="bg-rose-950/20 border border-rose-500/40 rounded-2xl p-3.5 space-y-2 font-mono text-xs shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700 flex items-center justify-center text-[10px] font-bold">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-rose-200">{req.patient_name}</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${tier.badge}`}>
                      {req.urgency_tier}
                    </span>
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Village: <strong className="text-slate-200">{req.village_id}</strong></span>
                    <span>Doctor: <strong className="text-slate-200">{req.specialty_needed}</strong></span>
                  </div>

                  <div className="flex justify-between items-center pt-1.5 border-t border-rose-900/40 text-[10px]">
                    <span className="text-amber-400">Waiting: {req.waiting_seconds}s</span>
                    <span className="bg-cyan-500/20 text-cyan-300 font-bold px-2 py-0.5 rounded border border-cyan-500/40">
                      Effective Score: {req.effective_priority}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

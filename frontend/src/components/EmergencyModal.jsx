import React, { useState } from 'react';
import { X, HeartPulse, Sparkles, AlertCircle, ShieldCheck } from 'lucide-react';
import { SPECIALTIES, MEDICINES } from '../utils/constants';

export default function EmergencyModal({ isOpen, onClose, villages = [], onDispatch }) {
  const [patientName, setPatientName] = useState('Anil Deshmukh (54M, Acute Angina)');
  const [villageId, setVillageId] = useState(villages[0]?.node_id || 'NODE_VILL_A');
  const [urgencyTier, setUrgencyTier] = useState('T1');
  const [specialty, setSpecialty] = useState('Cardiology');
  const [medicine, setMedicine] = useState('Heparin');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const applyPreset = (preset) => {
    setPatientName(preset.patientName);
    setVillageId(preset.villageId);
    setUrgencyTier(preset.urgencyTier);
    setSpecialty(preset.specialty);
    setMedicine(preset.medicine);
  };

  const presets = [
    {
      label: '❤️ Cardiac Arrest',
      patientName: 'Ramesh Patil (62M, Acute MI)',
      villageId: 'NODE_VILL_A',
      urgencyTier: 'T1',
      specialty: 'Cardiology',
      medicine: 'Heparin'
    },
    {
      label: '🐍 Snake Bite',
      patientName: 'Kavita More (Viper Bite)',
      villageId: 'NODE_VILL_PIR',
      urgencyTier: 'T1',
      specialty: 'Trauma',
      medicine: 'Anti-venom'
    },
    {
      label: '🚗 Highway Trauma',
      patientName: 'Sanjay Joshi (Crash polytrauma)',
      villageId: 'NODE_VILL_KASAR',
      urgencyTier: 'T1',
      specialty: 'Trauma',
      medicine: 'Blood_O_Neg'
    },
    {
      label: '👶 Child Respiratory',
      patientName: 'Aarav Shinde (Severe Asthma)',
      villageId: 'NODE_VILL_LAV',
      urgencyTier: 'T2',
      specialty: 'Pediatrics',
      medicine: 'Epinephrine'
    }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onDispatch({
        patient_name: patientName,
        village_id: villageId,
        urgency_tier: urgencyTier,
        specialty_needed: specialty,
        medicine_needed: medicine === 'None' ? null : medicine
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-slate-700/90 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shadow-lg shadow-rose-950/40">
              <HeartPulse className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Manual Emergency Call Dispatcher</h3>
              <p className="text-xs text-slate-400">Trigger a custom patient triage call into the engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Presets Bar */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block mb-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            Quick 1-Click Clinical Presets:
          </span>
          <div className="grid grid-cols-2 gap-2">
            {presets.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyPreset(p)}
                className="py-1.5 px-2.5 rounded-xl text-xs font-semibold bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-cyan-500/40 transition-all text-left truncate flex items-center justify-between"
              >
                <span>{p.label}</span>
                <span className="text-[9px] text-slate-500 font-mono">{p.urgencyTier}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5 font-mono">Patient Summary & Symptoms</label>
            <input
              type="text"
              required
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-medium"
              placeholder="e.g. Ramesh Patil (Chest Pain, 62M)"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5 font-mono">Origin Village</label>
              <select
                value={villageId}
                onChange={(e) => setVillageId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-medium font-mono"
              >
                {villages.map((v) => (
                  <option key={v.id} value={v.node_id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5 font-mono">Urgency SLA Tier</label>
              <select
                value={urgencyTier}
                onChange={(e) => setUrgencyTier(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-medium font-mono"
              >
                <option value="T1">🔴 Tier 1 - Critical (&lt;20m SLA)</option>
                <option value="T2">🟡 Tier 2 - Urgent (&lt;45m SLA)</option>
                <option value="T3">🟢 Tier 3 - Standard (&lt;90m SLA)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5 font-mono">Required Specialist</label>
              <select
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-medium font-mono"
              >
                {SPECIALTIES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5 font-mono">Required Medication</label>
              <select
                value={medicine}
                onChange={(e) => setMedicine(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-medium font-mono"
              >
                <option value="None">None (Standard Triage)</option>
                {MEDICINES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 rounded-xl border border-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 rounded-xl shadow-lg shadow-rose-900/40 disabled:opacity-50 transition-all active:scale-95"
            >
              {submitting ? 'Solving Optimal Route...' : '🚀 Dispatch Emergency Call'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

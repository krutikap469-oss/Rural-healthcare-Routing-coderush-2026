import React, { useState, useEffect } from 'react';
import { X, HeartPulse, AlertCircle, ShieldCheck, ArrowRight, Activity, CheckCircle2, Stethoscope, Clock, Zap } from 'lucide-react';

const EMERGENCY_TYPES = [
  {
    id: 'heart_attack',
    label: 'Heart Attack',
    icon: '❤️',
    specialty: 'Cardiology',
    medicine: 'Heparin',
    defaultUrgency: 'T1',
    desc: 'Severe chest pain, acute myocardial infarction'
  },
  {
    id: 'accident',
    label: 'Accident / Trauma',
    icon: '🚗',
    specialty: 'Trauma',
    medicine: 'Blood_O_Neg',
    defaultUrgency: 'T1',
    desc: 'Vehicle collision, heavy bleeding, compound fracture'
  },
  {
    id: 'breathing',
    label: 'Breathing Problem',
    icon: '🫁',
    specialty: 'Pediatrics',
    medicine: 'Epinephrine',
    defaultUrgency: 'T2',
    desc: 'Severe asthma, acute respiratory distress'
  },
  {
    id: 'pregnancy',
    label: 'Pregnancy Emergency',
    icon: '🤰',
    specialty: 'Obstetrics',
    medicine: 'None',
    defaultUrgency: 'T1',
    desc: 'Complicated labor, postpartum distress'
  },
  {
    id: 'other',
    label: 'Other / General',
    icon: '🩹',
    specialty: 'General',
    medicine: 'None',
    defaultUrgency: 'T2',
    desc: 'Severe infection, dehydration, snake bite'
  }
];

export default function EmergencyModal({ isOpen, onClose, villages = [], initialVillageId = null, onDispatch }) {
  const [selectedVillageId, setSelectedVillageId] = useState(initialVillageId || villages[0]?.node_id || 'NODE_VILL_A');
  const [selectedType, setSelectedType] = useState(EMERGENCY_TYPES[0]);
  const [urgencyTier, setUrgencyTier] = useState(EMERGENCY_TYPES[0].defaultUrgency);
  const [patientName, setPatientName] = useState('');
  const [step, setStep] = useState('select'); // 'select' | 'confirm'
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialVillageId) {
      setSelectedVillageId(initialVillageId);
    }
  }, [initialVillageId]);

  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setPatientName('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentVillage = villages.find(v => v.node_id === selectedVillageId) || villages[0];

  const handleSelectType = (typeObj) => {
    setSelectedType(typeObj);
    setUrgencyTier(typeObj.defaultUrgency);
  };

  const handleProceedToConfirm = (e) => {
    e.preventDefault();
    setStep('confirm');
  };

  const handleFinalConfirm = async () => {
    setSubmitting(true);
    try {
      const finalPatientName = patientName.trim() || `Emergency Patient (${selectedType.label})`;
      await onDispatch({
        patient_name: finalPatientName,
        village_id: selectedVillageId,
        urgency_tier: urgencyTier,
        specialty_needed: selectedType.specialty,
        medicine_needed: selectedType.medicine === 'None' ? null : selectedType.medicine
      });
      onClose();
    } catch (err) {
      console.error("Emergency dispatch error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-slate-700/90 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shadow-lg shadow-rose-950/40">
              <HeartPulse className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Quick Emergency Dispatcher
                <span className="text-[9px] font-mono bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/30 font-bold">
                  FAST 1-TAP FLOW
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Origin Village: <strong className="text-cyan-300">{currentVillage?.name || 'Selected Village'}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Select Emergency Type & Urgency */}
        {step === 'select' && (
          <form onSubmit={handleProceedToConfirm} className="p-5 space-y-4">
            {/* Village Selector (if user wants to change) */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5 font-mono flex items-center justify-between">
                <span>1. EMERGENCY ORIGIN (VILLAGE)</span>
                <span className="text-[10px] text-slate-500 font-normal">Auto-selected from map</span>
              </label>
              <select
                value={selectedVillageId}
                onChange={(e) => setSelectedVillageId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500 font-medium"
              >
                {villages.map((v) => (
                  <option key={v.id} value={v.node_id}>
                    {v.name} ({v.population?.toLocaleString()} pop)
                  </option>
                ))}
              </select>
            </div>

            {/* Quick-Tap Emergency Types */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-2 font-mono">
                2. SELECT EMERGENCY TYPE (1-TAP)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {EMERGENCY_TYPES.map((typeObj) => {
                  const isSelected = selectedType.id === typeObj.id;
                  return (
                    <button
                      key={typeObj.id}
                      type="button"
                      onClick={() => handleSelectType(typeObj)}
                      className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-2.5 ${
                        isSelected
                          ? 'bg-cyan-950/80 border-cyan-400 text-white shadow-lg shadow-cyan-950/50 ring-1 ring-cyan-400/40'
                          : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-850'
                      }`}
                    >
                      <span className="text-xl shrink-0">{typeObj.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold block truncate">{typeObj.label}</span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                        </div>
                        <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                          {typeObj.specialty} • Rx: {typeObj.medicine}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Urgency Selector */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5 font-mono">
                3. URGENCY SLA LEVEL
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'T1', label: '🔴 Critical', sla: '< 20m SLA', badge: 'border-rose-500 bg-rose-950/40 text-rose-300' },
                  { id: 'T2', label: '🟡 Urgent', sla: '< 45m SLA', badge: 'border-amber-500 bg-amber-950/40 text-amber-300' },
                  { id: 'T3', label: '🟢 Moderate', sla: '< 90m SLA', badge: 'border-emerald-500 bg-emerald-950/40 text-emerald-300' }
                ].map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setUrgencyTier(u.id)}
                    className={`py-2 px-2.5 rounded-xl border text-center transition-all ${
                      urgencyTier === u.id
                        ? `${u.badge} ring-1 font-bold shadow-md`
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xs block font-bold">{u.label}</span>
                    <span className="text-[9px] font-mono block opacity-80">{u.sla}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Patient Name */}
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1 font-mono">
                PATIENT NAME / NOTES (OPTIONAL)
              </label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder={`e.g. Ramesh Patil (${selectedType.label})`}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-medium"
              />
            </div>

            {/* Footer Buttons */}
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
                className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 rounded-xl shadow-lg shadow-rose-900/40 transition-all flex items-center gap-1.5 active:scale-95"
              >
                <span>Continue to Confirmation</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Clear Confirmation Step */}
        {step === 'confirm' && (
          <div className="p-5 space-y-4 animate-in fade-in duration-200">
            <div className="bg-rose-950/20 border border-rose-500/40 rounded-2xl p-4 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-rose-600/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto text-2xl">
                {selectedType.icon}
              </div>
              <h4 className="text-sm font-bold text-white">
                Dispatch ambulance to {currentVillage?.name}?
              </h4>
              <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                The smart routing engine will automatically filter hospitals for an on-duty <strong className="text-cyan-300">{selectedType.specialty}</strong> specialist, reserve required medicine (<strong className="text-cyan-300">{selectedType.medicine}</strong>), and dispatch the fastest available ambulance.
              </p>
            </div>

            {/* Summary Details Box */}
            <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 text-xs font-mono space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Origin Village:</span>
                <strong className="text-white">{currentVillage?.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Emergency Type:</span>
                <strong className="text-cyan-300">{selectedType.label}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Urgency SLA Tier:</span>
                <strong className="text-rose-400">{urgencyTier} ({urgencyTier === 'T1' ? '<20m' : urgencyTier === 'T2' ? '<45m' : '<90m'})</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Required Specialist:</span>
                <strong className="text-emerald-400">{selectedType.specialty}</strong>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep('select')}
                disabled={submitting}
                className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 rounded-xl border border-slate-800"
              >
                Back / Edit
              </button>
              <button
                type="button"
                onClick={handleFinalConfirm}
                disabled={submitting}
                className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 rounded-xl shadow-xl shadow-rose-900/50 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Solving Optimal Route...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-current text-amber-200" />
                    <span>Confirm & Dispatch Ambulance</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

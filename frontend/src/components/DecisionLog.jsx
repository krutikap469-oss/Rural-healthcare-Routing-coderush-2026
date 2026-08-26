import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XCircle, ShieldCheck, Activity, FileText, CheckCircle2, Stethoscope, MapPin, Zap, Users } from 'lucide-react';
import { URGENCY_TIERS } from '../utils/constants';

export default function DecisionLog({ activeDecision, multiDispatches = [], selectedMultiIndex = 0, onSelectMultiIndex }) {
  const currentDecision = (multiDispatches.length > 0)
    ? (multiDispatches[selectedMultiIndex] || multiDispatches[0])
    : activeDecision;

  // Staggered reveal state: controls how many breadcrumb steps are visible
  const [visibleStepCount, setVisibleStepCount] = useState(0);
  const [showRejection, setShowRejection] = useState(false);

  useEffect(() => {
    if (!currentDecision) {
      setVisibleStepCount(0);
      setShowRejection(false);
      return;
    }

    const breadcrumbs = currentDecision.decision_breadcrumbs || [];
    const totalSteps = breadcrumbs.length;

    // Reset on new decision
    setVisibleStepCount(0);
    setShowRejection(false);

    // Stagger each breadcrumb step one-by-one (~550ms delay)
    const timers = [];
    for (let i = 1; i <= totalSteps; i++) {
      const timer = setTimeout(() => {
        setVisibleStepCount(i);
      }, i * 550);
      timers.push(timer);
    }

    // Reveal Constraint Rejection log after all steps finish + ~400ms delay
    const rejectionTimer = setTimeout(() => {
      setShowRejection(true);
    }, (totalSteps * 550) + 400);
    timers.push(rejectionTimer);

    return () => {
      timers.forEach(t => clearTimeout(t));
    };
  }, [currentDecision?.request_id, selectedMultiIndex]);

  if (!currentDecision) {
    return (
      <div className="h-full bg-[#0a0f1d] p-6 flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-cyan-950/40 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-3 shadow-lg shadow-cyan-950/40">
          <Activity className="w-7 h-7 animate-pulse" />
        </div>
        <h3 className="text-sm font-bold text-slate-200 mb-1.5">Waiting for an Emergency Call</h3>
        <p className="text-xs text-slate-400 max-w-xs leading-relaxed mb-4">
          Click any <strong className="text-cyan-300">1-Click Demo Scenario</strong> above to see why the smart system chooses a specific hospital!
        </p>
      </div>
    );
  }

  const {
    request_id,
    patient_name,
    village_name,
    urgency_tier,
    specialty_needed,
    medicine_needed,
    selected_hospital,
    selected_ambulance,
    total_travel_time_mins,
    triage_wait_time_mins,
    total_cost_score,
    decision_breadcrumbs = [],
    rejected_candidates = []
  } = currentDecision;

  const tier = URGENCY_TIERS[urgency_tier] || URGENCY_TIERS.T2;

  return (
    <div className="h-full flex flex-col bg-[#0a0f1d] overflow-y-auto">
      {/* If Multi-Village Influx is active, render the 5 patient selector pill tabs */}
      {multiDispatches.length > 1 && (
        <div className="bg-slate-950/90 border-b border-slate-800 p-2 px-3">
          <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-400 mb-1.5">
            <span className="flex items-center gap-1 text-cyan-400">
              <Users className="w-3 h-3" />
              Concurrent Influx Calls ({multiDispatches.length}):
            </span>
            <span>Ranked by Priority</span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {multiDispatches.map((disp, idx) => {
              const dTier = URGENCY_TIERS[disp.urgency_tier] || URGENCY_TIERS.T2;
              const isSelected = idx === selectedMultiIndex;
              return (
                <button
                  key={disp.request_id || idx}
                  onClick={() => onSelectMultiIndex && onSelectMultiIndex(idx)}
                  className={`py-1 px-2 rounded-lg text-[10px] font-mono font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-950'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${disp.urgency_tier === 'T1' ? 'bg-rose-400' : 'bg-amber-400'}`}></span>
                  <span>#{idx + 1} {disp.patient_name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Call Header Card */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="p-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-10 shadow-sm"
      >
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Why This Route Was Chosen (Decision Reason)
            </h3>
          </div>
          <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-800/60 px-2 py-0.5 rounded-full">
            Call #{request_id}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-100">{patient_name}</h4>
            <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
              <MapPin className="w-3 h-3 text-emerald-400" /> Patient Location: <strong className="text-slate-200">{village_name}</strong>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-2.5">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm ${tier.badge}`}>
            Priority: {urgency_tier} ({tier.sla})
          </span>
          <span className="text-[10px] bg-slate-800 text-slate-200 font-semibold px-2 py-0.5 rounded-md border border-slate-700 flex items-center gap-1">
            <Stethoscope className="w-3 h-3 text-cyan-400" />
            Doctor Needed: {specialty_needed}
          </span>
          {medicine_needed && (
            <span className="text-[10px] bg-cyan-950/90 text-cyan-300 font-semibold px-2 py-0.5 rounded-md border border-cyan-800">
              Medicine: {medicine_needed} (Reserved)
            </span>
          )}
        </div>
      </motion.div>

      <div className="p-4 space-y-4 flex-1">
        {/* Selected Optimal Candidate Hero Box */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="bg-gradient-to-br from-cyan-950/50 via-slate-900 to-slate-950 border border-cyan-500/40 rounded-2xl p-4 space-y-3 shadow-xl shadow-cyan-950/30"
        >
          <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20">
            <span className="text-xs font-bold text-cyan-300 font-mono flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              Best Hospital & Ambulance Match
            </span>
            <span className="text-xs font-mono font-extrabold bg-cyan-500/20 text-cyan-300 px-2.5 py-0.5 rounded-full border border-cyan-500/40">
              Score: {total_cost_score}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-mono block mb-0.5">SELECTED HOSPITAL</span>
              <strong className="text-slate-100 text-xs block">{selected_hospital?.name}</strong>
              <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-3 h-3" /> Has Required Specialist Doctor
              </span>
            </div>

            <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-mono block mb-0.5">DISPATCHED AMBULANCE</span>
              <strong className="text-slate-100 text-xs block">Ambulance #{selected_ambulance?.id}</strong>
              <span className="text-[10px] text-cyan-300 font-mono mt-1 block">
                {selected_ambulance?.plate} ({selected_ambulance?.type})
              </span>
            </div>
          </div>

          {/* Transit Time Badges */}
          <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between">
              <span className="text-slate-400">Driving Time:</span>
              <strong className="text-cyan-400 font-bold">{total_travel_time_mins} mins</strong>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between">
              <span className="text-slate-400">Hospital Wait:</span>
              <strong className="text-amber-400 font-bold">{triage_wait_time_mins} mins</strong>
            </div>
          </div>
        </motion.div>

        {/* Step-by-Step Staggered Live Reasoning Breadcrumbs */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3.5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              Step-by-Step System Decision
            </h4>
            {visibleStepCount < decision_breadcrumbs.length && (
              <span className="text-[10px] font-mono text-cyan-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                Evaluating step {visibleStepCount + 1}...
              </span>
            )}
          </div>

          <div className="space-y-3 relative before:absolute before:inset-0 before:left-2 before:w-0.5 before:bg-slate-800">
            <AnimatePresence>
              {decision_breadcrumbs.slice(0, visibleStepCount).map((crumb, idx) => (
                <motion.div 
                  key={crumb.step || idx}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="relative pl-6 space-y-0.5"
                >
                  <span className="absolute left-0 top-0.5 w-4 h-4 rounded-full bg-cyan-950 border border-cyan-500 flex items-center justify-center text-[9px] font-bold text-cyan-300 font-mono shadow-sm">
                    {crumb.step}
                  </span>
                  <span className="text-xs font-bold text-slate-200 block">{crumb.title}</span>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-normal">{crumb.detail}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Why Were Other Facilities Skipped? (Delayed Reveal) */}
        <AnimatePresence>
          {showRejection && rejected_candidates.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="bg-rose-950/10 border border-rose-500/30 rounded-2xl p-3.5 space-y-2.5"
            >
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-300 font-mono flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                Why Other Hospitals Were Skipped ({rejected_candidates.length} Centers Checked)
              </h4>
              <div className="space-y-2">
                {rejected_candidates.map((rej, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.15 }}
                    className="bg-slate-900/90 border border-rose-500/20 rounded-xl p-2.5 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">{rej.hospital_name}</span>
                      <span className="text-[9px] font-mono font-bold bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/30">
                        {rej.code}
                      </span>
                    </div>
                    <p className="text-[11px] text-rose-400/90 leading-snug">
                      {rej.reason}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

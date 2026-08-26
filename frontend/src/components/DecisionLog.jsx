import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XCircle, ShieldCheck, Activity, FileText, CheckCircle2, Stethoscope, MapPin, 
  Zap, Users, Scale, Clock, Calculator, Phone, MessageSquare, AlertTriangle, Send, X, Radio
} from 'lucide-react';
import { URGENCY_TIERS } from '../utils/constants';

export default function DecisionLog({ 
  activeDecision, 
  multiDispatches = [], 
  selectedMultiIndex = 0, 
  onSelectMultiIndex,
  onSendMessage 
}) {
  const currentDecision = (multiDispatches.length > 0)
    ? (multiDispatches[selectedMultiIndex] || multiDispatches[0])
    : activeDecision;

  const [visibleStepCount, setVisibleStepCount] = useState(0);
  const [showRejection, setShowRejection] = useState(false);

  // Driver Communication Modals
  const [isCallingDriver, setIsCallingDriver] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [selectedQuickMsg, setSelectedQuickMsg] = useState('Road ahead is blocked near village entrance.');
  const [customMsg, setCustomMsg] = useState('');
  const [isSending, setIsSending] = useState(false);

  const quickMessages = [
    { text: 'Road ahead is blocked near village entrance.', isBlockReport: true, icon: '🚧' },
    { text: 'Patient condition has changed, please hurry.', isBlockReport: false, icon: '🩺' },
    { text: 'Need immediate oxygen / ALS equipment ready.', isBlockReport: false, icon: '🆘' },
    { text: 'I am waiting by the main village temple landmark.', isBlockReport: false, icon: '📍' }
  ];

  useEffect(() => {
    if (!currentDecision) {
      setVisibleStepCount(0);
      setShowRejection(false);
      return;
    }

    const breadcrumbs = currentDecision.decision_breadcrumbs || [];
    const totalSteps = breadcrumbs.length;

    setVisibleStepCount(0);
    setShowRejection(false);

    const timers = [];
    for (let i = 1; i <= totalSteps; i++) {
      const timer = setTimeout(() => {
        setVisibleStepCount(i);
      }, i * 550);
      timers.push(timer);
    }

    const rejectionTimer = setTimeout(() => {
      setShowRejection(true);
    }, (totalSteps * 550) + 400);
    timers.push(rejectionTimer);

    return () => {
      timers.forEach(t => clearTimeout(t));
    };
  }, [currentDecision?.request_id, selectedMultiIndex, currentDecision?.decision_breadcrumbs?.length]);

  if (!currentDecision) {
    return (
      <div className="h-full bg-[#0a0f1d] p-6 flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-cyan-950/40 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-3 shadow-lg shadow-cyan-950/40">
          <Activity className="w-7 h-7 animate-pulse" />
        </div>
        <h3 className="text-sm font-bold text-slate-200 mb-1.5">Waiting for an Emergency Call</h3>
        <p className="text-xs text-slate-400 max-w-xs leading-relaxed mb-4">
          Click any <strong className="text-cyan-300">1-Click Demo Scenario</strong> above or click any village on the map to trigger a real dispatch!
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
    cost_breakdown,
    decision_breadcrumbs = [],
    rejected_candidates = [],
    status
  } = currentDecision;

  const tier = URGENCY_TIERS[urgency_tier] || URGENCY_TIERS.T2;
  const isAwaitingAmbulance = (status === 'AWAITING_AMBULANCE');

  const driverName = selected_ambulance?.driver_name || 'Rahul Patil';
  const driverPhone = selected_ambulance?.driver_phone || '+91 90000 12345';
  const ambPlate = selected_ambulance?.plate || 'MH-12-HE-101';
  const ambType = selected_ambulance?.type || 'Advanced Life Support (ALS)';

  const handleInitiateCall = () => {
    setIsCallingDriver(true);
  };

  const handleSendPatientMessage = async (e) => {
    e?.preventDefault();
    const finalMsg = customMsg.trim() || selectedQuickMsg;
    const isBlock = finalMsg.toLowerCase().includes('blocked');

    setIsSending(true);
    try {
      if (onSendMessage) {
        await onSendMessage(request_id, finalMsg, isBlock);
      }
      setIsMessageModalOpen(false);
      setCustomMsg('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0f1d] overflow-y-auto relative">
      {/* Multi-Village Influx Patient Selector Tabs */}
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
              Route Decision & Reason (Dispatch Engine)
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
        {/* Awaiting Ambulance Alert Card */}
        {isAwaitingAmbulance ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-amber-950/20 border border-amber-500/40 rounded-2xl p-4 space-y-2 text-xs font-mono"
          >
            <div className="flex items-center justify-between">
              <span className="text-amber-300 font-bold flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                STATUS: AWAITING AMBULANCE
              </span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/40 font-bold">
                PRIORITY HEAP
              </span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              All district ambulances are currently occupied. Request has been enqueued in the Binary Heap. It will be dispatched automatically as soon as any ambulance returns to IDLE.
            </p>
          </motion.div>
        ) : (
          <>
            {/* 1. Assigned Ambulance & Driver Contact Card (Requirement 1, 2, 3, 4) */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-emerald-950/50 via-slate-900 to-cyan-950/50 border border-emerald-500/40 rounded-2xl p-4 space-y-3 shadow-xl shadow-emerald-950/30"
            >
              <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <span className="text-base">🚑</span>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      Ambulance Dispatched
                    </h4>
                    <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                      Unit: #{selected_ambulance?.id} ({ambPlate})
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <Radio className="w-2.5 h-2.5 animate-pulse" /> EN ROUTE
                </span>
              </div>

              {/* Driver Details Row */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[9px] text-slate-400 block mb-0.5">ASSIGNED DRIVER</span>
                  <strong className="text-white text-xs block">{driverName}</strong>
                  <span className="text-[10px] text-cyan-300 mt-0.5 block">{ambType.split(' ')[0]} Specialist</span>
                </div>

                <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[9px] text-slate-400 block mb-0.5">DIRECT CONTACT</span>
                  <a 
                    href={`tel:${driverPhone.replace(/\s+/g, '')}`} 
                    className="text-emerald-400 font-bold text-xs hover:underline block truncate"
                  >
                    {driverPhone}
                  </a>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">ETA: ~{Math.round(total_travel_time_mins)} mins</span>
                </div>
              </div>

              {/* Action Buttons: [ 📞 Contact Driver ] & [ 💬 Send Message ] */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={handleInitiateCall}
                  className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5 fill-current" />
                  <span>Contact Driver</span>
                </button>

                <button
                  onClick={() => setIsMessageModalOpen(true)}
                  className="py-2 px-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-950/50 flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Send Message</span>
                </button>
              </div>
            </motion.div>

            {/* 2. Best Hospital & Ambulance Match Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, delay: 0.1 }}
              className="bg-gradient-to-br from-cyan-950/50 via-slate-900 to-slate-950 border border-cyan-500/40 rounded-2xl p-4 space-y-3 shadow-xl shadow-cyan-950/30"
            >
              <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20">
                <span className="text-xs font-bold text-cyan-300 font-mono flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  Target Referral Facility
                </span>
                <span className="text-xs font-mono font-extrabold bg-cyan-500/20 text-cyan-300 px-2.5 py-0.5 rounded-full border border-cyan-500/40">
                  Cost Score: {total_cost_score}
                </span>
              </div>

              <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 text-xs">
                <span className="text-[10px] text-slate-400 font-mono block mb-0.5">SELECTED HOSPITAL</span>
                <strong className="text-slate-100 text-xs block">{selected_hospital?.name}</strong>
                <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1 mt-1">
                  <CheckCircle2 className="w-3 h-3" /> Has Required {specialty_needed} Specialist
                </span>
              </div>

              {/* Transit Time Badges */}
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between">
                  <span className="text-slate-400">Total Travel:</span>
                  <strong className="text-cyan-400 font-bold">{total_travel_time_mins} mins</strong>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between">
                  <span className="text-slate-400">Hospital Wait:</span>
                  <strong className="text-amber-400 font-bold">{triage_wait_time_mins} mins</strong>
                </div>
              </div>
            </motion.div>
          </>
        )}

        {/* 3. Formal Mathematical Cost Breakdown */}
        {cost_breakdown && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 space-y-2.5 font-mono text-xs shadow-sm">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-cyan-400" />
                Cost Function Breakdown:
              </span>
              <span className="text-[10px] text-slate-500">w1·T + w2·W + w3·F - w4·U</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                <span className="text-slate-500 text-[10px] block">TRAVEL TIME (w1=1.0)</span>
                <strong className="text-cyan-300">+{cost_breakdown.w1_travel_term}</strong>
                <span className="text-slate-500 text-[9px] block">({cost_breakdown.travel_time_mins}m)</span>
              </div>

              <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                <span className="text-slate-500 text-[10px] block">WAIT TIME (w2=1.2)</span>
                <strong className="text-amber-300">+{cost_breakdown.w2_wait_term}</strong>
                <span className="text-slate-500 text-[9px] block">({cost_breakdown.triage_wait_mins}m)</span>
              </div>

              <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                <span className="text-slate-500 text-[10px] block">FAIRNESS ADJ (w3=0.5)</span>
                <strong className={cost_breakdown.w3_fairness_term <= 0 ? 'text-emerald-400' : 'text-slate-300'}>
                  {cost_breakdown.w3_fairness_term > 0 ? `+${cost_breakdown.w3_fairness_term}` : cost_breakdown.w3_fairness_term}
                </strong>
                <span className="text-slate-500 text-[9px] block">({cost_breakdown.is_underserved ? 'Fairness Boost' : 'Normal'})</span>
              </div>

              <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                <span className="text-slate-500 text-[10px] block">URGENCY BOOST (w4=4.0)</span>
                <strong className="text-rose-400">{cost_breakdown.w4_urgency_term}</strong>
                <span className="text-slate-500 text-[9px] block">({urgency_tier} Discount)</span>
              </div>
            </div>

            <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-800/60 flex items-center justify-between text-[10px]">
              <span className="text-slate-400 flex items-center gap-1">
                <Scale className="w-3 h-3 text-cyan-400" />
                Village Wait: <strong className="text-white">{cost_breakdown.village_avg_wait_mins}m</strong> (Net Avg: {cost_breakdown.network_avg_wait_mins}m)
              </span>
              <span className={`px-1.5 py-0.5 rounded font-bold ${cost_breakdown.is_underserved ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
                {cost_breakdown.is_underserved ? '⚖️ Underserved Village Boost' : 'Balanced'}
              </span>
            </div>
          </div>
        )}

        {/* 4. Step-by-Step Staggered Live Reasoning Breadcrumbs */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3.5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              Step-by-Step System Decision & Events
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

        {/* 5. Why Were Other Facilities Skipped? */}
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

      {/* Demo Call Modal (Requirement 3) */}
      {isCallingDriver && (
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-emerald-500/40 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto text-2xl animate-pulse">
              <Phone className="w-8 h-8" />
            </div>
            
            <div>
              <h4 className="text-sm font-bold text-white">Calling {driverName}...</h4>
              <p className="text-xs text-emerald-400 font-mono mt-0.5">{driverPhone}</p>
              <p className="text-[11px] text-slate-400 mt-2">
                Ambulance #{selected_ambulance?.id} ({ambPlate}) • Connected in Demo Mode
              </p>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-[11px] text-slate-300 font-mono text-left space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="text-emerald-400 font-bold">Call Active (0:04)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Device Telephony:</span>
                <a href={`tel:${driverPhone.replace(/\s+/g, '')}`} className="text-cyan-300 underline font-bold">Open Phone App</a>
              </div>
            </div>

            <button
              onClick={() => setIsCallingDriver(false)}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-950/50 transition-all active:scale-95"
            >
              End Call
            </button>
          </div>
        </div>
      )}

      {/* Emergency Message & Road Block Report Modal (Requirement 4 & 5) */}
      {isMessageModalOpen && (
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-cyan-500/40 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white font-mono">Message Driver {driverName}</h4>
                  <span className="text-[10px] text-slate-400 font-mono">Unit #{selected_ambulance?.id} ({ambPlate})</span>
                </div>
              </div>
              <button
                onClick={() => setIsMessageModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendPatientMessage} className="p-5 space-y-4 text-xs font-mono">
              <div>
                <label className="text-slate-300 font-bold block mb-2">
                  1. SELECT PREDEFINED EMERGENCY MESSAGE:
                </label>
                <div className="space-y-1.5">
                  {quickMessages.map((qm, idx) => {
                    const isSelected = selectedQuickMsg === qm.text && !customMsg;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedQuickMsg(qm.text);
                          setCustomMsg('');
                        }}
                        className={`w-full p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                          isSelected
                            ? 'bg-cyan-950/80 border-cyan-400 text-white shadow-md'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <span className="text-base shrink-0">{qm.icon}</span>
                        <div className="flex-1">
                          <span className="text-xs font-semibold block">{qm.text}</span>
                          {qm.isBlockReport && (
                            <span className="text-[9px] text-amber-300 block mt-0.5">
                              ⚠️ Triggers automatic A* road rerouting
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  2. OR WRITE CUSTOM MESSAGE:
                </label>
                <input
                  type="text"
                  value={customMsg}
                  onChange={(e) => setCustomMsg(e.target.value)}
                  placeholder="e.g. Landslide near forest entrance, road is impassable"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-sans"
                />
              </div>

              {/* Reroute Warning Banner if Blocked */}
              {(customMsg.toLowerCase().includes('blocked') || (selectedQuickMsg.includes('blocked') && !customMsg)) && (
                <div className="bg-amber-950/30 border border-amber-500/40 rounded-xl p-2.5 flex items-center gap-2 text-[10px] text-amber-300">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 animate-pulse" />
                  <span>
                    <strong>Dynamic Rerouting Enabled:</strong> Graph engine will mark the road as BLOCKED and run A* search for the fastest detour.
                  </span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsMessageModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white bg-slate-900 rounded-xl border border-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl shadow-lg shadow-cyan-950/50 flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  {isSending ? (
                    <span>Transmitting & Rerouting...</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Transmit Message to Driver</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

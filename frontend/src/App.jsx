import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import ScenarioBar from './components/ScenarioBar';
import MapView from './components/MapView';
import Telemetry from './components/Telemetry';
import DecisionLog from './components/DecisionLog';
import EmergencyModal from './components/EmergencyModal';
import BenchmarkModal from './components/BenchmarkModal';
import { useNetworkState } from './hooks/useNetworkState';
import { Layers, Activity, AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export default function App() {
  const {
    networkData,
    isConnected,
    loading,
    activeDecision,
    toastMessage,
    triggerScenario,
    dispatchEmergency,
    toggleRoadBlock,
    sendDriverMessage,
    resetNetwork,
    runBenchmark
  } = useNetworkState();

  // Single source of truth for panel visibility
  const [activeRequest, setActiveRequest] = useState(null);
  
  // Multi-dispatch / Mass Influx concurrent animation state
  const [multiDispatches, setMultiDispatches] = useState([]);
  const [selectedMultiIndex, setSelectedMultiIndex] = useState(0);
  const [activeVillageIds, setActiveVillageIds] = useState([]);
  const [priorityQueueBanner, setPriorityQueueBanner] = useState(null);
  const [telemetryOverride, setTelemetryOverride] = useState(null);

  // Modals & Panels
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [selectedVillageForModal, setSelectedVillageForModal] = useState(null);
  const [isBenchmarkModalOpen, setIsBenchmarkModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeSideView, setActiveSideView] = useState('decision');

  const animationTimersRef = useRef([]);

  const clearAnimationTimers = () => {
    animationTimersRef.current.forEach(t => clearTimeout(t));
    animationTimersRef.current = [];
  };

  useEffect(() => {
    return () => clearAnimationTimers();
  }, []);

  // Sync activeDecision from single scenario dispatch
  useEffect(() => {
    if (activeDecision && multiDispatches.length === 0) {
      setActiveRequest(activeDecision);
      setIsSidebarOpen(true);
    }
  }, [activeDecision]);

  // Handle Scenario triggers with special multi-request animation for Scenario 3
  const handleScenarioRun = async (scenarioId) => {
    clearAnimationTimers();
    setActiveVillageIds([]);
    setPriorityQueueBanner(null);
    setTelemetryOverride(null);
    setSelectedMultiIndex(0);

    if (scenarioId === 3) {
      // Scenario 3: Multi-Village Mass Influx (5 Concurrent Emergencies)
      try {
        const res = await triggerScenario(3);
        const dispatches = res?.dispatches || [];
        if (!dispatches || dispatches.length === 0) return;

        const villages = dispatches.map(d => d.village_id);
        const initialIdle = networkData?.ambulances?.filter(a => a.status === 'IDLE').length || 4;
        const initialBeds = networkData?.hospitals?.reduce((sum, h) => sum + (h.beds_available || 0), 0) || 41;

        // Stage 1 (0-600ms): Ripple 5 village emergency pins on the map (~150ms stagger)
        villages.forEach((vId, idx) => {
          const t = setTimeout(() => {
            setActiveVillageIds(prev => [...prev, vId]);
          }, idx * 150);
          animationTimersRef.current.push(t);
        });

        // Stage 2 (600-1000ms): Show Priority Queue Ranking HUD banner (~400ms hold)
        const tRank = setTimeout(() => {
          setPriorityQueueBanner(dispatches.map(d => ({
            name: d.patient_name.split(' ')[0],
            tier: d.urgency_tier,
            village: d.village_name
          })));
        }, 600);
        animationTimersRef.current.push(tRank);

        // Stage 3 (1000-3000ms): Launch ambulance routes in parallel with ~280ms stagger, stream decision entries & tick telemetry
        dispatches.forEach((d, idx) => {
          const tDisp = setTimeout(() => {
            setMultiDispatches(prev => [...prev, d]);
            setActiveRequest(d);
            setIsSidebarOpen(true);

            // Incremental telemetry ticks
            setTelemetryOverride({
              idleAmbulances: Math.max(0, initialIdle - (idx + 1)),
              totalBeds: Math.max(0, initialBeds - (idx + 1)),
              activeTrips: idx + 1
            });
          }, 1000 + (idx * 280));
          animationTimersRef.current.push(tDisp);
        });

        // Clear priority queue banner after dispatches are in motion
        const tClearHUD = setTimeout(() => {
          setPriorityQueueBanner(null);
        }, 3200);
        animationTimersRef.current.push(tClearHUD);

      } catch (err) {
        console.error("Mass influx scenario error:", err);
      }
    } else {
      // Scenario 1 or 2
      setMultiDispatches([]);
      const res = await triggerScenario(scenarioId);
      if (res?.decision) {
        setActiveRequest(res.decision);
        setIsSidebarOpen(true);
      }
    }
  };

  // Handle Manual Emergency Dispatch
  const handleManualDispatch = async (payload) => {
    clearAnimationTimers();
    setMultiDispatches([]);
    setActiveVillageIds([]);
    setPriorityQueueBanner(null);
    setTelemetryOverride(null);

    const res = await dispatchEmergency(payload);
    if (res?.decision) {
      setActiveRequest(res.decision);
      setIsSidebarOpen(true);
    }
  };

  // Reset: Clears all active logs, animations, and collapses right sidebar back to map-only default view
  const handleReset = async () => {
    clearAnimationTimers();
    setActiveRequest(null);
    setMultiDispatches([]);
    setActiveVillageIds([]);
    setPriorityQueueBanner(null);
    setTelemetryOverride(null);
    setSelectedMultiIndex(0);
    setIsSidebarOpen(false);
    await resetNetwork();
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#080d1a] overflow-hidden select-none font-['Plus_Jakarta_Sans',sans-serif]">
      {/* 1. Top Status Bar */}
      <Navbar
        isConnected={isConnected}
        networkData={networkData}
        onReset={handleReset}
        onOpenEmergencyModal={() => setIsEmergencyModalOpen(true)}
        onOpenBenchmarkModal={() => setIsBenchmarkModalOpen(true)}
        isSidebarOpen={isSidebarOpen && activeRequest !== null}
        onToggleSidebar={activeRequest !== null ? () => setIsSidebarOpen(!isSidebarOpen) : null}
        telemetryOverride={telemetryOverride}
      />

      {/* 2. 1-Click Scenario Bar */}
      <ScenarioBar onRunScenario={handleScenarioRun} />

      {/* 3. Main Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Full Width Map Area */}
        <div className="flex-1 h-full relative">
          <MapView
            networkData={networkData}
            onToggleRoadBlock={toggleRoadBlock}
            activeDecision={activeRequest}
            multiDispatches={multiDispatches}
            activeVillageIds={activeVillageIds}
            priorityQueueBanner={priorityQueueBanner}
            onReportEmergency={(vId) => {
              setSelectedVillageForModal(vId);
              setIsEmergencyModalOpen(true);
            }}
          />
        </div>

        {/* Right Details Panel: Framer Motion Slide-In (Only rendered when activeRequest is present) */}
        <AnimatePresence>
          {activeRequest !== null && isSidebarOpen && (
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="w-full lg:w-[440px] xl:w-[480px] h-[48vh] lg:h-full flex flex-col bg-[#0a0f1d]/95 backdrop-blur-xl z-20 shadow-2xl border-t lg:border-t-0 lg:border-l border-slate-800"
            >
              {/* View Selector Header */}
              <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-3 py-2">
                <div className="flex items-center gap-1.5 flex-1 mr-2">
                  <button
                    onClick={() => setActiveSideView('decision')}
                    className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                      activeSideView === 'decision'
                        ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/60'
                        : 'text-slate-400 hover:text-white bg-slate-900/60'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Route Decision & Reason</span>
                  </button>

                  <button
                    onClick={() => setActiveSideView('telemetry')}
                    className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                      activeSideView === 'telemetry'
                        ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/60'
                        : 'text-slate-400 hover:text-white bg-slate-900/60'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Hospitals & Medicine Stock</span>
                  </button>
                </div>

                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
                  title="Collapse Panel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Panel Viewport */}
              <div className="flex-1 overflow-hidden">
                {activeSideView === 'decision' ? (
                  <DecisionLog 
                    activeDecision={activeRequest}
                    multiDispatches={multiDispatches}
                    selectedMultiIndex={selectedMultiIndex}
                    onSelectMultiIndex={setSelectedMultiIndex}
                    onSendMessage={sendDriverMessage}
                  />
                ) : (
                  <Telemetry networkData={networkData} />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="absolute bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-xl text-xs font-bold ${
            toastMessage.type === 'success' ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40 shadow-emerald-950/50' :
            toastMessage.type === 'warning' ? 'bg-amber-950/90 text-amber-300 border-amber-500/40 shadow-amber-950/50' :
            toastMessage.type === 'error' ? 'bg-rose-950/90 text-rose-300 border-rose-500/40 shadow-rose-950/50' :
            'bg-slate-900/90 text-cyan-300 border-cyan-500/40 shadow-cyan-950/50'
          }`}>
            {toastMessage.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
            {toastMessage.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-400" />}
            {toastMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
            {toastMessage.type === 'info' && <Info className="w-4 h-4 text-cyan-400" />}
            <span>{toastMessage.message}</span>
          </div>
        </div>
      )}

      {/* Interactive Modals */}
      <EmergencyModal
        isOpen={isEmergencyModalOpen}
        onClose={() => {
          setIsEmergencyModalOpen(false);
          setSelectedVillageForModal(null);
        }}
        villages={networkData?.villages || []}
        initialVillageId={selectedVillageForModal}
        onDispatch={handleManualDispatch}
      />

      <BenchmarkModal
        isOpen={isBenchmarkModalOpen}
        onClose={() => setIsBenchmarkModalOpen(false)}
        onRunBenchmark={runBenchmark}
      />
    </div>
  );
}

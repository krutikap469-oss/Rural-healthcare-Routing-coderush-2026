import React, { useState } from 'react';
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
    resetNetwork,
    runBenchmark
  } = useNetworkState();

  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [isBenchmarkModalOpen, setIsBenchmarkModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeSideView, setActiveSideView] = useState('decision');

  return (
    <div className="h-screen w-screen flex flex-col bg-[#080d1a] overflow-hidden select-none font-['Plus_Jakarta_Sans',sans-serif]">
      {/* 1. Modern Glassmorphic Top Navbar */}
      <Navbar
        isConnected={isConnected}
        networkData={networkData}
        onReset={resetNetwork}
        onOpenEmergencyModal={() => setIsEmergencyModalOpen(true)}
        onOpenBenchmarkModal={() => setIsBenchmarkModalOpen(true)}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* 2. Interactive 1-Click Judge Scenario Bar */}
      <ScenarioBar onRunScenario={triggerScenario} />

      {/* 3. Main Operational Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Interactive Map Area */}
        <div className="flex-1 h-full relative">
          <MapView
            networkData={networkData}
            onToggleRoadBlock={toggleRoadBlock}
            activeDecision={activeDecision}
          />
        </div>

        {/* Right Command Center Drawer */}
        {isSidebarOpen && (
          <div className="w-full lg:w-[440px] xl:w-[480px] h-[48vh] lg:h-full flex flex-col bg-[#0a0f1d]/95 backdrop-blur-xl z-20 shadow-2xl border-t lg:border-t-0 lg:border-l border-slate-800 animate-in slide-in-from-right duration-200">
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
                <DecisionLog activeDecision={activeDecision} />
              ) : (
                <Telemetry networkData={networkData} />
              )}
            </div>
          </div>
        )}
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
        onClose={() => setIsEmergencyModalOpen(false)}
        villages={networkData?.villages || []}
        onDispatch={dispatchEmergency}
      />

      <BenchmarkModal
        isOpen={isBenchmarkModalOpen}
        onClose={() => setIsBenchmarkModalOpen(false)}
        onRunBenchmark={runBenchmark}
      />
    </div>
  );
}

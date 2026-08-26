import React from 'react';
import { Play, Heart, AlertTriangle, Users, Sparkles, Zap } from 'lucide-react';

export default function ScenarioBar({ onRunScenario }) {
  const scenarios = [
    {
      id: 1,
      title: "1. Heart Attack Emergency",
      subtitle: "Hackathon Prompt Test Case",
      desc: "Village A calls for heart attack. System skips nearby Clinic B (no heart doctor) and sends patient to Hospital C (has heart specialist & medicine).",
      testTag: "SMART DOCTOR CHECK",
      tagColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
      btnGrad: "from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500",
      icon: Heart,
      iconColor: "text-rose-400 bg-rose-500/10 border-rose-500/20"
    },
    {
      id: 2,
      title: "2. Blocked Road / Landslide",
      subtitle: "Dynamic Road Rerouting",
      desc: "Highway 48 is blocked by rocks. System instantly redirects ambulance through the mountain bypass road without getting stuck.",
      testTag: "ROAD REROUTING",
      tagColor: "bg-amber-500/10 text-amber-400 border-amber-500/30",
      btnGrad: "from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500",
      icon: AlertTriangle,
      iconColor: "text-amber-400 bg-amber-500/10 border-amber-500/20"
    },
    {
      id: 3,
      title: "3. 5 Emergency Calls at Once",
      subtitle: "Priority Order Triage",
      desc: "5 villages call simultaneously. System prioritizes life-threatening cases first and sends ambulances without running out of hospital beds.",
      testTag: "RUSH PRIORITY",
      tagColor: "bg-purple-500/10 text-purple-400 border-purple-500/30",
      btnGrad: "from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500",
      icon: Users,
      iconColor: "text-purple-400 bg-purple-500/10 border-purple-500/20"
    }
  ];

  return (
    <div className="bg-[#0b101f]/95 border-b border-slate-800/80 px-4 md:px-6 py-2.5 shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-cyan-400" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            1-Click Demo Scenarios (Click to test how the smart system makes decisions)
          </span>
        </div>
        <span className="text-[11px] text-slate-400 font-mono hidden md:inline">
          ⚡ Instant calculations under 2 milliseconds
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {scenarios.map((sc) => {
          const Icon = sc.icon;
          return (
            <div
              key={sc.id}
              onClick={() => onRunScenario(sc.id)}
              className="group relative bg-slate-900/90 hover:bg-slate-850 border border-slate-800/90 hover:border-slate-700 rounded-2xl p-3.5 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-xl border flex items-center justify-center ${sc.iconColor}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                        {sc.title}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-medium">{sc.subtitle}</p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-md border ${sc.tagColor}`}>
                    {sc.testTag}
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 line-clamp-2 mb-2 leading-relaxed font-normal">
                  {sc.desc}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  Live Simulation
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRunScenario(sc.id);
                  }}
                  className={`flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-lg text-white bg-gradient-to-r ${sc.btnGrad} shadow-sm transition-transform group-hover:scale-105 active:scale-95`}
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Run Test</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { X, Cpu, Zap, CheckCircle2, RefreshCw, BarChart2, ShieldCheck, Gauge } from 'lucide-react';

export default function BenchmarkModal({ isOpen, onClose, onRunBenchmark }) {
  const [nodeCount, setNodeCount] = useState(50000);
  const [queryCount, setQueryCount] = useState(20);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await onRunBenchmark(nodeCount, queryCount);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Benchmark execution failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-cyan-500/40 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-950/40">
              <Cpu className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                50,000+ Node Algorithmic Stress Benchmark
                <span className="text-[10px] font-mono bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30 font-bold">
                  SCALE PROFILER
                </span>
              </h3>
              <p className="text-xs text-slate-400">Profile A* with Haversine distance heuristic vs baseline Dijkstra in RAM</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {/* Parameter Selectors */}
          <div className="grid grid-cols-2 gap-3 bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5 font-mono">
                Graph Network Scale
              </label>
              <select
                value={nodeCount}
                onChange={(e) => setNodeCount(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
              >
                <option value={10000}>10,000 Nodes (~40k Edges)</option>
                <option value={50000}>50,000 Nodes (~200k Edges) [Target Scale]</option>
                <option value={100000}>100,000 Nodes (~400k Edges) [Extreme]</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5 font-mono">
                Sample Query Influx
              </label>
              <select
                value={queryCount}
                onChange={(e) => setQueryCount(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
              >
                <option value={10}>10 Random Emergency Pairs</option>
                <option value={20}>20 Random Emergency Pairs</option>
                <option value={50}>50 Random Emergency Pairs</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleRun}
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs rounded-2xl shadow-xl shadow-cyan-950/50 flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Generating {nodeCount.toLocaleString()} Nodes & Profiling Heuristics...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-cyan-200 fill-current" />
                <span>Execute Algorithmic Stress Benchmark ({nodeCount.toLocaleString()} Nodes)</span>
              </>
            )}
          </button>

          {error && (
            <div className="p-3 bg-rose-950/30 border border-rose-500/40 rounded-xl text-xs text-rose-400 font-mono">
              {error}
            </div>
          )}

          {/* Results Comparison Grid */}
          {result && (
            <div className="space-y-3 pt-2 border-t border-slate-800 animate-in fade-in duration-300">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Benchmark Completed ({result.queries_executed} queries)
                </span>
                <span className="text-slate-400">
                  {result.node_count.toLocaleString()} nodes • {result.edge_count.toLocaleString()} edges
                </span>
              </div>

              {/* Side-by-Side Comparison Cards */}
              <div className="grid grid-cols-2 gap-3">
                {/* A* Card */}
                <div className="bg-cyan-950/30 border border-cyan-500/40 rounded-2xl p-4 space-y-2 shadow-lg shadow-cyan-950/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-300 font-mono">A* (Haversine Heuristic)</span>
                    <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full font-mono font-bold border border-cyan-500/40">
                      OPTIMAL
                    </span>
                  </div>
                  <div className="text-2xl font-mono font-extrabold text-white">
                    {result.a_star.avg_latency_ms} <span className="text-xs font-normal text-cyan-400">ms/query</span>
                  </div>
                  <div className="text-[11px] text-slate-400 space-y-0.5 font-mono">
                    <div>Min: {result.a_star.min_latency_ms}ms | Max: {result.a_star.max_latency_ms}ms</div>
                    <div>Avg Explored: <strong className="text-cyan-300">{result.a_star.avg_nodes_explored} nodes</strong></div>
                  </div>
                </div>

                {/* Dijkstra Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 font-mono">Dijkstra (No Heuristic)</span>
                    <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono font-semibold">
                      BASELINE
                    </span>
                  </div>
                  <div className="text-2xl font-mono font-extrabold text-slate-300">
                    {result.dijkstra.avg_latency_ms} <span className="text-xs font-normal text-slate-500">ms/query</span>
                  </div>
                  <div className="text-[11px] text-slate-400 space-y-0.5 font-mono">
                    <div>Min: {result.dijkstra.min_latency_ms}ms | Max: {result.dijkstra.max_latency_ms}ms</div>
                    <div>Avg Explored: <strong className="text-slate-300">{result.dijkstra.avg_nodes_explored} nodes</strong></div>
                  </div>
                </div>
              </div>

              {/* Efficiency Gains Callout */}
              <div className="bg-gradient-to-r from-emerald-950/50 via-slate-900 to-cyan-950/50 border border-emerald-500/40 rounded-2xl p-3.5 flex items-center justify-between text-xs font-mono shadow-md">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300 font-bold">Speedup & Pruning:</span>
                </div>
                <span className="text-emerald-400 font-extrabold text-sm">
                  {result.efficiency.speedup_factor} ({result.efficiency.search_space_pruned_pct} Search Space Pruned)
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

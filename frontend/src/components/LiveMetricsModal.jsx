import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Activity,
  Cpu,
  MemoryStick,
  Wifi,
  RefreshCw,
  BarChart2
} from 'lucide-react';
import { fetchLiveMetrics } from '../services/api';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B/s';
  const k = 1024;
  if (bytes < k) return `${bytes.toFixed(0)} B/s`;
  if (bytes < k * k) return `${(bytes / k).toFixed(1)} KB/s`;
  return `${(bytes / k / k).toFixed(2)} MB/s`;
}

function formatGB(mb) {
  return (mb / 1024).toFixed(1);
}

function getRamColor(pct) {
  if (pct < 60) return 'bg-gradient-to-r from-emerald-500 to-green-400';
  if (pct < 80) return 'bg-gradient-to-r from-amber-500 to-yellow-400';
  return 'bg-gradient-to-r from-rose-600 to-red-500';
}

function getCpuColor(pct) {
  if (pct < 60) return 'text-emerald-400';
  if (pct < 80) return 'text-amber-400';
  return 'text-rose-400';
}

// SVG Sparkline for CPU history
function Sparkline({ data, width = 300, height = 56 }) {
  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center h-14 text-fog-text text-xs font-mono">
        Recopilando datos...
      </div>
    );
  }
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (v / max) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const polyline = pts.join(' ');
  // Build fill path
  const fillPath = `M0,${height} L${pts[0]} ${pts
    .slice(1)
    .map((p) => `L${p}`)
    .join(' ')} L${width},${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#17baed" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#17baed" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill="url(#cpuGrad)" />
      <polyline points={polyline} fill="none" stroke="#17baed" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// Skeleton loader block
function SkeletonBlock({ className = '' }) {
  return <div className={`animate-pulse rounded bg-white/5 ${className}`} />;
}

export default function LiveMetricsModal({ server, isOpen, onClose }) {
  const [tab, setTab] = useState('resumen');
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cpuHistory, setCpuHistory] = useState([]);
  const intervalRef = useRef(null);
  const prevNetRef = useRef(null);
  const [netRate, setNetRate] = useState({ rx: 0, tx: 0 });

  const poll = useCallback(async () => {
    if (!server) return;
    try {
      const data = await fetchLiveMetrics(server.id);
      setMetrics(data);
      setError(null);

      // CPU history (last 20)
      setCpuHistory((prev) => {
        const next = [...prev, data.cpu?.percent ?? 0];
        return next.slice(-20);
      });

      // Network rate calculation
      if (prevNetRef.current) {
        const rxDelta = (data.net?.rx_bytes ?? 0) - prevNetRef.current.rx;
        const txDelta = (data.net?.tx_bytes ?? 0) - prevNetRef.current.tx;
        setNetRate({ rx: rxDelta / 5, tx: txDelta / 5 }); // per-second over 5s interval
      }
      prevNetRef.current = { rx: data.net?.rx_bytes ?? 0, tx: data.net?.tx_bytes ?? 0 };
    } catch (err) {
      setError(err.message || 'Error al obtener métricas');
    } finally {
      setLoading(false);
    }
  }, [server]);

  useEffect(() => {
    if (isOpen && server) {
      setTab('resumen');
      setMetrics(null);
      setCpuHistory([]);
      prevNetRef.current = null;
      setNetRate({ rx: 0, tx: 0 });
      setLoading(true);
      poll();
      intervalRef.current = setInterval(poll, 5000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isOpen, server?.id]);

  if (!isOpen || !server) return null;

  const cpu = metrics?.cpu ?? {};
  const ram = metrics?.ram ?? {};
  const net = metrics?.net ?? {};
  const ramPct = ram.percent ?? 0;
  const cpuPct = cpu.percent ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-void-base/85 backdrop-blur-sm">
      <div className="bg-elevated-surface rounded-cards-lg w-full max-w-3xl border border-border-smoke flex flex-col max-h-[88vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-border-smoke/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-nodes bg-white/5 border border-electric-cyan/30 flex items-center justify-center text-electric-cyan shadow-[0_0_10px_rgba(23,186,237,0.2)]">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-medium text-cloud-white">Métricas en Vivo</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-pills bg-white/5 border border-white/10 text-electric-cyan">
                  {server.name}
                </span>
                {/* Pulsing LIVE dot */}
                <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                  </span>
                  LIVE
                </span>
              </div>
              <p className="text-xs font-mono text-fog-text">Actualización cada 5 segundos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-pills hover:bg-muted-shell text-fog-text hover:text-cloud-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border-smoke/70 bg-deep-panel px-4 gap-2 pt-2 text-xs font-mono">
          <button
            onClick={() => setTab('resumen')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-2 transition ${
              tab === 'resumen'
                ? 'border-electric-cyan text-electric-cyan font-semibold'
                : 'border-transparent text-fog-text hover:text-cloud-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            Resumen
          </button>
          <button
            onClick={() => setTab('historial')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-2 transition ${
              tab === 'historial'
                ? 'border-electric-cyan text-electric-cyan font-semibold'
                : 'border-transparent text-fog-text hover:text-cloud-white'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Historial
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 rounded-cards bg-rose-500/10 border border-rose-500/20 text-rose-300 font-mono text-xs">
              {error}
            </div>
          )}

          {tab === 'resumen' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* CPU Panel */}
              <div className="p-4 rounded-cards bg-deep-panel border border-border-smoke/60 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-xs font-mono text-fog-text">
                  <Cpu className="w-3.5 h-3.5 text-electric-cyan" />
                  CPU
                </div>
                {loading && !metrics ? (
                  <>
                    <SkeletonBlock className="h-12 w-24" />
                    <SkeletonBlock className="h-4 w-full" />
                    <SkeletonBlock className="h-3 w-3/4" />
                  </>
                ) : (
                  <>
                    <div className={`text-5xl font-mono font-bold ${getCpuColor(cpuPct)}`}>
                      {cpuPct.toFixed(0)}%
                    </div>
                    {/* Load averages */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {['1m', '5m', '15m'].map((label, i) => (
                        <span
                          key={label}
                          className="text-[10px] font-mono px-2 py-0.5 rounded-pills bg-white/5 border border-white/10 text-ash-text"
                        >
                          {label}: {cpu.loadAvg?.[i]?.toFixed(2) ?? '—'}
                        </span>
                      ))}
                    </div>
                    {/* Footer */}
                    <div className="mt-auto pt-2 border-t border-border-smoke/40 text-[10px] font-mono text-fog-text leading-relaxed">
                      <div className="truncate" title={cpu.model}>{cpu.model || '—'}</div>
                      <div>{cpu.cores ?? '—'} núcleos lógicos</div>
                    </div>
                  </>
                )}
              </div>

              {/* RAM Panel */}
              <div className="p-4 rounded-cards bg-deep-panel border border-border-smoke/60 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-xs font-mono text-fog-text">
                  <MemoryStick className="w-3.5 h-3.5 text-electric-cyan" />
                  RAM
                </div>
                {loading && !metrics ? (
                  <>
                    <SkeletonBlock className="h-8 w-32" />
                    <SkeletonBlock className="h-3 w-full rounded-full" />
                    <SkeletonBlock className="h-3 w-16" />
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-mono font-bold text-cloud-white">
                      {formatGB(ram.usedMb ?? 0)}
                      <span className="text-fog-text text-base font-normal"> / {formatGB(ram.totalMb ?? 0)} GB</span>
                    </div>
                    {/* Bar */}
                    <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${getRamColor(ramPct)}`}
                        style={{ width: `${Math.min(ramPct, 100)}%` }}
                      />
                    </div>
                    <div
                      className={`text-xs font-mono font-semibold ${
                        ramPct < 60 ? 'text-emerald-400' : ramPct < 80 ? 'text-amber-400' : 'text-rose-400'
                      }`}
                    >
                      {ramPct.toFixed(1)}% usado
                    </div>
                  </>
                )}
              </div>

              {/* Network Panel */}
              <div className="p-4 rounded-cards bg-deep-panel border border-border-smoke/60 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-xs font-mono text-fog-text">
                  <Wifi className="w-3.5 h-3.5 text-electric-cyan" />
                  Red
                </div>
                {loading && !metrics ? (
                  <>
                    <SkeletonBlock className="h-6 w-28" />
                    <SkeletonBlock className="h-6 w-28" />
                    <SkeletonBlock className="h-3 w-16" />
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-fog-text">RX</span>
                        <span className="text-emerald-400">{formatBytes(netRate.rx)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-fog-text">TX</span>
                        <span className="text-electric-cyan">{formatBytes(netRate.tx)}</span>
                      </div>
                    </div>
                    <div className="mt-auto pt-2 border-t border-border-smoke/40 text-[10px] font-mono text-fog-text">
                      Interfaz: <span className="text-ash-text">{net.interface || '—'}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {tab === 'historial' && (
            <div className="space-y-4">
              <div className="p-4 rounded-cards bg-deep-panel border border-border-smoke/60">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono text-cloud-white font-medium">CPU — últimas {cpuHistory.length} lecturas</span>
                  <span className="text-[10px] font-mono text-fog-text">intervalo: 5s</span>
                </div>
                {cpuHistory.length < 2 ? (
                  <div className="flex items-center justify-center h-14 gap-2 text-fog-text text-xs font-mono">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-electric-cyan" />
                    Recopilando datos de historial...
                  </div>
                ) : (
                  <Sparkline data={cpuHistory} height={72} />
                )}
              </div>

              {/* Stats summary */}
              {cpuHistory.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Actual', val: cpuHistory[cpuHistory.length - 1] },
                    { label: 'Máximo', val: Math.max(...cpuHistory) },
                    { label: 'Promedio', val: cpuHistory.reduce((a, b) => a + b, 0) / cpuHistory.length }
                  ].map(({ label, val }) => (
                    <div key={label} className="p-3 rounded-cards bg-deep-panel border border-border-smoke/60 text-center">
                      <div className="text-[10px] font-mono text-fog-text mb-1">{label}</div>
                      <div className={`text-lg font-mono font-bold ${getCpuColor(val)}`}>{val.toFixed(1)}%</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

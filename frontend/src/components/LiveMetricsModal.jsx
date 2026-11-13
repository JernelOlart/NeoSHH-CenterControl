import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Activity,
  Cpu,
  MemoryStick,
  Wifi,
  RefreshCw,
  TrendingUp,
  Server,
  Zap,
  ArrowDown,
  ArrowUp
} from 'lucide-react';
import { fetchLiveMetrics } from '../services/api';

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B/s';
  const k = 1024;
  if (bytes < k) return `${bytes.toFixed(0)} B/s`;
  if (bytes < k * k) return `${(bytes / k).toFixed(1)} KB/s`;
  return `${(bytes / (k * k)).toFixed(2)} MB/s`;
}

function formatGB(mb) {
  if (!mb) return '0.0';
  return (mb / 1024).toFixed(1);
}

function getRamColor(pct) {
  if (pct < 60) return 'text-emerald-400';
  if (pct < 80) return 'text-amber-400';
  return 'text-rose-400';
}

function getCpuColor(pct) {
  if (pct < 60) return 'text-emerald-400';
  if (pct < 80) return 'text-amber-400';
  return 'text-rose-400';
}

// Mini SVG Sparkline for individual KPI cards
function CardSparkline({ data = [], strokeColor = '#17baed', fillColor = 'rgba(23, 186, 237, 0.15)', maxVal = 100, height = 48 }) {
  const points = data.length === 1 ? [data[0], data[0]] : data;
  if (!points || points.length === 0) {
    return (
      <div className="h-12 flex items-center justify-center text-[10px] font-mono text-fog-text/50">
        Iniciando captura...
      </div>
    );
  }

  const effectiveMax = Math.max(maxVal, ...points, 1);
  const width = 240;
  const step = points.length > 1 ? width / (points.length - 1) : width;

  const coords = points.map((val, i) => {
    const x = i * step;
    const y = height - (Math.min(val, effectiveMax) / effectiveMax) * (height - 6) - 3;
    return { x, y };
  });

  const polyline = coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const fillPath = `M0,${height} L${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)} ${coords.slice(1).map(c => `L${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')} L${width},${height} Z`;
  const lastPoint = coords[coords.length - 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-12 overflow-visible">
      <defs>
        <linearGradient id={`grad-${strokeColor.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.35" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#grad-${strokeColor.replace('#', '')})`} />
      <polyline points={polyline} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {lastPoint && (
        <circle cx={lastPoint.x} cy={lastPoint.y} r="3" fill={strokeColor} className="animate-pulse" />
      )}
    </svg>
  );
}

// Large Detailed Live Area Chart
function LargeTimelineChart({ cpuData = [], ramData = [], height = 180 }) {
  const count = Math.max(cpuData.length, ramData.length);
  const width = 600;

  if (count < 1) {
    return (
      <div className="h-44 flex items-center justify-center text-xs font-mono text-fog-text">
        <RefreshCw className="w-4 h-4 animate-spin text-electric-cyan mr-2" />
        Sincronizando flujo de métricas en tiempo real...
      </div>
    );
  }

  const cPoints = cpuData.length === 1 ? [cpuData[0], cpuData[0]] : cpuData;
  const rPoints = ramData.length === 1 ? [ramData[0], ramData[0]] : ramData;
  const cStep = cPoints.length > 1 ? width / (cPoints.length - 1) : width;
  const rStep = rPoints.length > 1 ? width / (rPoints.length - 1) : width;

  const cCoords = cPoints.map((v, i) => ({
    x: i * cStep,
    y: height - (Math.min(v, 100) / 100) * (height - 16) - 8
  }));

  const rCoords = rPoints.map((v, i) => ({
    x: i * rStep,
    y: height - (Math.min(v, 100) / 100) * (height - 16) - 8
  }));

  const cPoly = cCoords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const rPoly = rCoords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');

  const cFill = `M0,${height} L${cCoords[0].x.toFixed(1)},${cCoords[0].y.toFixed(1)} ${cCoords.slice(1).map(c => `L${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')} L${width},${height} Z`;

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 overflow-visible">
        <defs>
          <linearGradient id="bigCpuGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#17baed" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#17baed" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal gridlines */}
        {[0, 25, 50, 75, 100].map(pct => {
          const y = height - (pct / 100) * (height - 16) - 8;
          return (
            <g key={pct}>
              <line x1="0" y1={y} x2={width} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
              <text x="4" y={y - 3} fill="rgba(255,255,255,0.25)" fontSize="9" fontFamily="monospace">
                {pct}%
              </text>
            </g>
          );
        })}

        {/* CPU Area + Line */}
        <path d={cFill} fill="url(#bigCpuGrad)" />
        <polyline points={cPoly} fill="none" stroke="#17baed" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        {/* RAM Line */}
        <polyline points={rPoly} fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="4 2" strokeLinejoin="round" strokeLinecap="round" />

        {/* Live Tips */}
        {cCoords.length > 0 && (
          <circle
            cx={cCoords[cCoords.length - 1].x}
            cy={cCoords[cCoords.length - 1].y}
            r="4"
            fill="#17baed"
            className="animate-ping"
          />
        )}
        {rCoords.length > 0 && (
          <circle
            cx={rCoords[rCoords.length - 1].x}
            cy={rCoords[rCoords.length - 1].y}
            r="3.5"
            fill="#10b981"
          />
        )}
      </svg>
    </div>
  );
}

// Live Network Throughput Chart
function NetworkLiveChart({ rxHistory = [], txHistory = [], height = 110 }) {
  const count = Math.max(rxHistory.length, txHistory.length);
  const width = 600;

  if (count < 1) {
    return (
      <div className="h-28 flex items-center justify-center text-xs font-mono text-fog-text">
        Capturando tráfico de red...
      </div>
    );
  }

  const allVals = [...rxHistory, ...txHistory];
  const maxBytes = Math.max(...allVals, 1024); // at least 1 KB/s

  const rPoints = rxHistory.length === 1 ? [rxHistory[0], rxHistory[0]] : rxHistory;
  const tPoints = txHistory.length === 1 ? [txHistory[0], txHistory[0]] : txHistory;
  const rStep = rPoints.length > 1 ? width / (rPoints.length - 1) : width;
  const tStep = tPoints.length > 1 ? width / (tPoints.length - 1) : width;

  const rCoords = rPoints.map((v, i) => ({
    x: i * rStep,
    y: height - (Math.min(v, maxBytes) / maxBytes) * (height - 14) - 6
  }));

  const tCoords = tPoints.map((v, i) => ({
    x: i * tStep,
    y: height - (Math.min(v, maxBytes) / maxBytes) * (height - 14) - 6
  }));

  const rPoly = rCoords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const tPoly = tCoords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-28 overflow-visible">
        {/* Baseline grid */}
        <line x1="0" y1={height - 6} x2={width} y2={height - 6} stroke="rgba(255,255,255,0.08)" />
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="rgba(255,255,255,0.04)" strokeDasharray="2 2" />

        {/* Peak label */}
        <text x="4" y="10" fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="monospace">
          Máx: {formatBytes(maxBytes)}
        </text>

        {/* RX line (cyan) */}
        <polyline points={rPoly} fill="none" stroke="#17baed" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {/* TX line (emerald) */}
        <polyline points={tPoly} fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="3 2" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export default function LiveMetricsModal({ server, isOpen, onClose }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cpuHistory, setCpuHistory] = useState([]);
  const [ramHistory, setRamHistory] = useState([]);
  const [rxHistory, setRxHistory] = useState([]);
  const [txHistory, setTxHistory] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [netRate, setNetRate] = useState({ rx: 0, tx: 0 });

  const intervalRef = useRef(null);
  const prevNetRef = useRef(null);
  const isFetchingRef = useRef(false);

  const poll = useCallback(async () => {
    if (!server || isFetchingRef.current) return;
    try {
      isFetchingRef.current = true;
      setLoading(true);
      const data = await fetchLiveMetrics(server.id);
      setMetrics(data);
      if (data.error) {
        setError(`Aviso de conexión SSH: ${data.error}`);
      } else {
        setError(null);
      }
      setLastUpdated(new Date().toLocaleTimeString());

      const cpuVal = data.cpu?.percent ?? 0;
      const ramVal = data.ram?.percent ?? 0;

      setCpuHistory(prev => {
        const next = [...prev, cpuVal];
        return next.slice(-25);
      });

      setRamHistory(prev => {
        const next = [...prev, ramVal];
        return next.slice(-25);
      });

      // Network rate calculation (delta over 3s interval)
      if (prevNetRef.current) {
        const rxDelta = Math.max(0, (data.net?.rx_bytes ?? 0) - prevNetRef.current.rx);
        const txDelta = Math.max(0, (data.net?.tx_bytes ?? 0) - prevNetRef.current.tx);
        const currentRxRate = rxDelta / 3;
        const currentTxRate = txDelta / 3;
        setNetRate({ rx: currentRxRate, tx: currentTxRate });

        setRxHistory(prev => [...prev, currentRxRate].slice(-25));
        setTxHistory(prev => [...prev, currentTxRate].slice(-25));
      } else {
        setRxHistory(prev => (prev.length ? prev : [0]));
        setTxHistory(prev => (prev.length ? prev : [0]));
      }
      prevNetRef.current = { rx: data.net?.rx_bytes ?? 0, tx: data.net?.tx_bytes ?? 0 };
    } catch (err) {
      setError(err.message || 'Error al obtener métricas del servidor');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [server]);

  useEffect(() => {
    if (isOpen && server) {
      setMetrics(null);
      setCpuHistory([]);
      setRamHistory([]);
      setRxHistory([]);
      setTxHistory([]);
      prevNetRef.current = null;
      setNetRate({ rx: 0, tx: 0 });
      setLastUpdated(null);

      poll();
      intervalRef.current = setInterval(poll, 3000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isOpen, server?.id, poll]);

  if (!isOpen || !server) return null;

  const cpu = metrics?.cpu ?? {};
  const ram = metrics?.ram ?? {};
  const net = metrics?.net ?? {};
  const ramPct = ram.percent ?? 0;
  const cpuPct = cpu.percent ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-void-base/85 backdrop-blur-sm">
      <div className="bg-elevated-surface rounded-cards-lg w-full max-w-5xl border border-border-smoke flex flex-col h-[85vh] max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-border-smoke/70 flex items-center justify-between gap-3 flex-shrink-0 bg-deep-panel/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-nodes bg-white/5 border border-electric-cyan/30 flex items-center justify-center text-electric-cyan shadow-[0_0_12px_rgba(23,186,237,0.25)]">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-cloud-white">Métricas en Tiempo Real</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-pills bg-white/5 border border-white/10 text-electric-cyan">
                  {server.name}
                </span>
                <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-pills">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                  </span>
                  LIVE • 3s
                </span>
              </div>
              <p className="text-xs font-mono text-fog-text">
                {lastUpdated ? `Última actualización: ${lastUpdated}` : 'Conectando al stream SSH...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={poll}
              disabled={loading}
              className="btn-cyan-secondary px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
              title="Actualizar ahora"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-electric-cyan' : ''}`} />
              <span className="hidden sm:inline">{loading ? 'Actualizando...' : 'Actualizar'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-pills hover:bg-muted-shell text-fog-text hover:text-cloud-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error notice */}
        {error && (
          <div className="mx-4 mt-3 flex-shrink-0 p-3 rounded-cards bg-rose-500/10 border border-rose-500/20 text-rose-300 font-mono text-xs flex items-center justify-between">
            <span>{error}</span>
            <button onClick={poll} className="underline text-rose-200 text-xs">Reintentar</button>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 min-h-0">
          {/* Top 3 Metric Cards with Live Sparklines */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* CPU Card */}
            <div className="p-4 rounded-cards bg-deep-panel border border-border-smoke/70 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs font-mono text-fog-text">
                    <Cpu className="w-4 h-4 text-electric-cyan" />
                    <span>Uso de CPU</span>
                  </div>
                  <span className={`text-xl font-mono font-bold ${getCpuColor(cpuPct)}`}>
                    {cpuPct.toFixed(1)}%
                  </span>
                </div>

                <div className="h-12 w-full my-1">
                  <CardSparkline data={cpuHistory} strokeColor="#17baed" maxVal={100} height={48} />
                </div>
              </div>

              <div className="pt-2 border-t border-border-smoke/40 mt-2">
                <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                  <span className="text-[10px] font-mono text-fog-text">Load:</span>
                  {['1m', '5m', '15m'].map((label, i) => (
                    <span
                      key={label}
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-ash-text"
                    >
                      {label}: {cpu.loadAvg?.[i]?.toFixed(2) ?? '—'}
                    </span>
                  ))}
                </div>
                <div className="text-[10px] font-mono text-fog-text truncate" title={cpu.model}>
                  {cpu.cores ?? 1} núcleos • {cpu.model || 'CPU'}
                </div>
              </div>
            </div>

            {/* RAM Card */}
            <div className="p-4 rounded-cards bg-deep-panel border border-border-smoke/70 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs font-mono text-fog-text">
                    <MemoryStick className="w-4 h-4 text-emerald-400" />
                    <span>Memoria RAM</span>
                  </div>
                  <span className={`text-xl font-mono font-bold ${getRamColor(ramPct)}`}>
                    {ramPct.toFixed(1)}%
                  </span>
                </div>

                <div className="h-12 w-full my-1">
                  <CardSparkline data={ramHistory} strokeColor="#10b981" maxVal={100} height={48} />
                </div>
              </div>

              <div className="pt-2 border-t border-border-smoke/40 mt-2">
                <div className="flex items-center justify-between text-xs font-mono mb-1">
                  <span className="text-cloud-white font-semibold">
                    {formatGB(ram.usedMb ?? 0)} GB
                  </span>
                  <span className="text-fog-text">
                    de {formatGB(ram.totalMb ?? 0)} GB
                  </span>
                </div>
                {/* Progress Bar */}
                <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      ramPct < 60 ? 'bg-emerald-400' : ramPct < 80 ? 'bg-amber-400' : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(ramPct, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Network Card */}
            <div className="p-4 rounded-cards bg-deep-panel border border-border-smoke/70 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs font-mono text-fog-text">
                    <Wifi className="w-4 h-4 text-electric-cyan" />
                    <span>Tráfico de Red</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-pills bg-white/5 border border-white/10 text-ash-text">
                    {net.interface || 'eth0'}
                  </span>
                </div>

                <div className="h-12 w-full my-1">
                  <CardSparkline data={rxHistory} strokeColor="#17baed" maxVal={Math.max(...rxHistory, 1024)} height={48} />
                </div>
              </div>

              <div className="pt-2 border-t border-border-smoke/40 mt-2 space-y-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="flex items-center gap-1 text-fog-text">
                    <ArrowDown className="w-3 h-3 text-electric-cyan" /> RX (Descarga)
                  </span>
                  <span className="text-electric-cyan font-semibold">{formatBytes(netRate.rx)}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="flex items-center gap-1 text-fog-text">
                    <ArrowUp className="w-3 h-3 text-emerald-400" /> TX (Subida)
                  </span>
                  <span className="text-emerald-400 font-semibold">{formatBytes(netRate.tx)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Large Live Area Timeline Graph: CPU vs RAM */}
          <div className="p-4 sm:p-5 rounded-cards bg-deep-panel border border-border-smoke/70">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-electric-cyan" />
                <h3 className="text-xs font-mono font-semibold text-cloud-white">
                  Línea de Tiempo de Rendimiento en Vivo
                </h3>
                <span className="text-[10px] font-mono text-fog-text">
                  ({cpuHistory.length} lecturas continuas)
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1 rounded-full bg-electric-cyan inline-block" />
                  <span className="text-fog-text">CPU %</span>
                  <span className="text-electric-cyan font-bold">{cpuPct.toFixed(0)}%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1 rounded-full bg-emerald-400 inline-block border-b border-dashed border-emerald-400" />
                  <span className="text-fog-text">RAM %</span>
                  <span className="text-emerald-400 font-bold">{ramPct.toFixed(0)}%</span>
                </div>
              </div>
            </div>

            <LargeTimelineChart cpuData={cpuHistory} ramData={ramHistory} height={180} />
          </div>

          {/* Live Network Throughput Timeline */}
          <div className="p-4 sm:p-5 rounded-cards bg-deep-panel border border-border-smoke/70">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-electric-cyan" />
                <h3 className="text-xs font-mono font-semibold text-cloud-white">
                  Throughput de Red en Directo
                </h3>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1 rounded-full bg-electric-cyan inline-block" />
                  <span className="text-fog-text">RX</span>
                  <span className="text-electric-cyan font-bold">{formatBytes(netRate.rx)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1 rounded-full bg-emerald-400 inline-block" />
                  <span className="text-fog-text">TX</span>
                  <span className="text-emerald-400 font-bold">{formatBytes(netRate.tx)}</span>
                </div>
              </div>
            </div>

            <NetworkLiveChart rxHistory={rxHistory} txHistory={txHistory} height={110} />
          </div>
        </div>
      </div>
    </div>
  );
}

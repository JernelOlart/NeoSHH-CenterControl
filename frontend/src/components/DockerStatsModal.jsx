import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  RefreshCw,
  Activity,
  Pause,
  Play,
  Box,
  AlertCircle,
  Cpu,
  HardDrive,
  Network
} from 'lucide-react';
import { fetchDockerStats } from '../services/api';

function StatBar({ percent, label }) {
  const pct = parseFloat(percent) || 0;
  const color =
    pct > 80 ? 'bg-rose-500' :
    pct > 50 ? 'bg-amber-400' :
    'bg-emerald-400';
  const textColor =
    pct > 80 ? 'text-rose-300' :
    pct > 50 ? 'text-amber-300' :
    'text-emerald-300';

  return (
    <div className="space-y-1 min-w-[80px]">
      <div className={`text-[11px] font-mono font-semibold ${textColor}`}>{label}</div>
      <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function DockerStatsModal({ server, isOpen, onClose }) {
  const [stats, setStats] = useState([]);
  const [hasDocker, setHasDocker] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paused, setPaused] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const intervalRef = useRef(null);
  const pausedRef = useRef(false);

  const poll = async () => {
    if (!server || pausedRef.current) return;
    try {
      const data = await fetchDockerStats(server.id);
      setHasDocker(data.hasDocker !== false);
      setStats(data.containers || data.stats || []);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(err.message || 'Error al obtener estadísticas');
    }
  };

  const startPolling = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    poll();
    intervalRef.current = setInterval(poll, 5000);
  };

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    if (isOpen && server) {
      setLoading(true);
      setStats([]);
      setError(null);
      setPaused(false);
      pausedRef.current = false;
      fetchDockerStats(server.id)
        .then(data => {
          setHasDocker(data.hasDocker !== false);
          setStats(data.containers || data.stats || []);
          setLastUpdate(new Date());
        })
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
      intervalRef.current = setInterval(poll, 5000);
    }
    return () => stopPolling();
  }, [isOpen, server?.id]);

  const handlePauseResume = () => {
    const next = !paused;
    setPaused(next);
    pausedRef.current = next;
    if (!next) {
      poll();
      intervalRef.current = setInterval(poll, 5000);
    } else {
      stopPolling();
    }
  };

  if (!isOpen || !server) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-void-base/85 backdrop-blur-sm">
      <div className="bg-elevated-surface rounded-cards-lg w-full max-w-3xl border border-border-smoke flex flex-col max-h-[88vh] overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="p-4 border-b border-border-smoke/70 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-nodes bg-white/5 border border-electric-cyan/30 flex items-center justify-center text-electric-cyan shadow-[0_0_10px_rgba(23,186,237,0.2)]">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-medium text-cloud-white">Docker Stats</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-pills bg-white/5 border border-white/10 text-electric-cyan">
                  {server.name}
                </span>
                {/* LIVE indicator */}
                {!paused && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-pills">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE
                  </span>
                )}
                {paused && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-fog-text bg-white/5 border border-white/10 px-2 py-0.5 rounded-pills">
                    <Pause className="w-2.5 h-2.5" />
                    PAUSED
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-fog-text">
                {lastUpdate ? `Actualizado: ${lastUpdate.toLocaleTimeString()}` : 'Monitoreando contenedores en tiempo real'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePauseResume}
              className="btn-cyan-secondary px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
            >
              {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              <span>{paused ? 'Reanudar' : 'Pausar'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-pills hover:bg-muted-shell text-fog-text hover:text-cloud-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-xs text-fog-text font-mono">
              <RefreshCw className="w-4 h-4 animate-spin text-electric-cyan" />
              <span>Obteniendo estadísticas de Docker...</span>
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
              <p className="text-xs font-mono text-rose-300">{error}</p>
            </div>
          ) : !hasDocker ? (
            <div className="p-8 text-center rounded-cards bg-deep-panel border border-border-smoke/60">
              <Box className="w-10 h-10 text-fog-text mx-auto mb-3 opacity-40" />
              <h3 className="text-sm font-medium text-cloud-white mb-1">Docker no detectado</h3>
              <p className="text-xs text-fog-text">No se pudo conectar con el motor Docker en este servidor.</p>
            </div>
          ) : stats.length === 0 ? (
            <div className="p-8 text-center rounded-cards bg-deep-panel border border-border-smoke/60">
              <Activity className="w-10 h-10 text-fog-text mx-auto mb-3 opacity-40 text-electric-cyan" />
              <h3 className="text-sm font-medium text-cloud-white mb-1">Sin contenedores activos</h3>
              <p className="text-xs text-fog-text">No hay contenedores en ejecución en este momento.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_120px_120px_100px_100px] gap-3 px-3 pb-1 text-[10px] font-mono text-fog-text uppercase tracking-widest border-b border-border-smoke/50">
                <span className="flex items-center gap-1"><Box className="w-3 h-3" /> Contenedor</span>
                <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> CPU</span>
                <span className="flex items-center gap-1"><HardDrive className="w-3 h-3" /> Memoria</span>
                <span className="flex items-center gap-1"><Network className="w-3 h-3" /> Net I/O</span>
                <span>Block I/O</span>
              </div>

              {stats.map((c, idx) => {
                const cpuPct = parseFloat(c.cpu) || 0;
                const memPct = parseFloat(c.memPercent) || 0;

                return (
                  <div
                    key={c.name || idx}
                    className="grid grid-cols-[1fr_120px_120px_100px_100px] gap-3 p-3 rounded-cards bg-deep-panel border border-border-smoke/60 hover:border-white/10 transition items-center"
                  >
                    {/* Name */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] flex-shrink-0" />
                        <span className="font-mono text-xs font-semibold text-cloud-white truncate">{c.name}</span>
                      </div>
                    </div>

                    {/* CPU */}
                    <StatBar percent={cpuPct} label={`${cpuPct.toFixed(1)}%`} />

                    {/* Memory */}
                    <div className="space-y-1">
                      <StatBar percent={memPct} label={`${memPct.toFixed(1)}%`} />
                      <div className="text-[10px] font-mono text-fog-text">{c.memUsage || '—'}</div>
                    </div>

                    {/* Net I/O */}
                    <div className="text-[10px] font-mono text-ash-text leading-relaxed">
                      {c.netIO ? (
                        <div className="text-electric-cyan truncate" title={c.netIO}>{c.netIO}</div>
                      ) : (
                        <>
                          <div className="text-emerald-400">{c.netRx || '—'}</div>
                          <div className="text-sky-400">{c.netTx || '—'}</div>
                        </>
                      )}
                    </div>

                    {/* Block I/O */}
                    <div className="text-[10px] font-mono text-ash-text leading-relaxed">
                      {c.blockIO ? (
                        <div className="text-fog-text truncate" title={c.blockIO}>{c.blockIO}</div>
                      ) : (
                        <>
                          <div>{c.blockRead || '—'}</div>
                          <div className="text-fog-text">{c.blockWrite || '—'}</div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

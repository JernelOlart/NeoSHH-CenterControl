import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  Square,
  RotateCw,
  RefreshCw,
  Box,
  Terminal,
  AlertCircle,
  ExternalLink,
  Layers
} from 'lucide-react';
import { fetchDockerContainers, dockerAction } from '../services/api';

export default function DockerManagerModal({ server, isOpen, onClose, onOpenTerminal }) {
  const [containers, setContainers] = useState([]);
  const [hasDocker, setHasDocker] = useState(true);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState(null);

  const loadContainers = async () => {
    if (!server) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDockerContainers(server.id);
      setHasDocker(data.hasDocker);
      setContainers(data.containers || []);
    } catch (err) {
      setError(err.message || 'Error al consultar Docker');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && server) {
      loadContainers();
    }
  }, [isOpen, server?.id]);

  if (!isOpen || !server) return null;

  const handleAction = async (containerId, action) => {
    setActionLoading((prev) => ({ ...prev, [containerId]: action }));
    try {
      await dockerAction(server.id, containerId, action);
      await loadContainers();
    } catch (err) {
      alert(`Error al ejecutar ${action}: ${err.message}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [containerId]: null }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-void-base/85 backdrop-blur-sm">
      <div className="bg-elevated-surface rounded-cards-lg w-full max-w-3xl border border-border-smoke flex flex-col max-h-[85vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-border-smoke/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-nodes bg-white/5 border border-electric-cyan/30 flex items-center justify-center text-electric-cyan shadow-[0_0_10px_rgba(23,186,237,0.2)]">
              <Box className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-medium text-cloud-white">
                  Contenedores Docker
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-pills bg-white/5 border border-white/10 text-electric-cyan">
                  {server.name}
                </span>
              </div>
              <p className="text-xs font-mono text-fog-text">
                Gestión y estado de contenedores en tiempo real
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadContainers}
              disabled={loading}
              className="btn-cyan-icon p-2 text-xs"
              title="Refrescar lista"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-electric-cyan' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-pills hover:bg-muted-shell text-fog-text hover:text-cloud-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-fog-text gap-2 text-xs font-mono">
              <RefreshCw className="w-4 h-4 animate-spin text-electric-cyan" />
              <span>Consultando contenedores Docker en el servidor...</span>
            </div>
          ) : !hasDocker ? (
            <div className="p-6 text-center rounded-cards bg-deep-panel border border-border-smoke/60">
              <AlertCircle className="w-10 h-10 text-fog-text mx-auto mb-2 opacity-60" />
              <h3 className="text-sm font-medium text-cloud-white">Docker no detectado</h3>
              <p className="text-xs text-fog-text mt-1 max-w-md mx-auto">
                No se detectó el motor Docker en este servidor VPS o el usuario no tiene permisos suficientes.
              </p>
              <button
                onClick={() => {
                  onClose();
                  onOpenTerminal(server);
                }}
                className="mt-4 btn-cyan-primary px-4 py-2 text-xs font-medium inline-flex items-center gap-2"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Abrir Terminal para Instalar Docker</span>
              </button>
            </div>
          ) : containers.length === 0 ? (
            <div className="text-center py-12 text-fog-text text-xs font-mono">
              <Box className="w-8 h-8 mx-auto mb-2 opacity-40 text-electric-cyan" />
              <p>No hay contenedores registrados en este servidor.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {containers.map((c) => {
                const isRunning = c.status?.toLowerCase().startsWith('up');
                const isBusy = Boolean(actionLoading[c.id]);

                return (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-cards bg-deep-panel border border-border-smoke/60 hover:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isRunning
                              ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                              : 'bg-rose-500'
                          }`}
                        />
                        <span className="font-mono text-xs font-bold text-cloud-white truncate">
                          {c.names || c.id}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-pills bg-white/5 border border-white/10 text-fog-text truncate max-w-[150px]">
                          {c.image}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center gap-3 text-[11px] font-mono text-fog-text flex-wrap">
                        <span className="text-ash-text">{c.status}</span>
                        {c.ports && (
                          <span className="text-electric-cyan truncate max-w-[200px]" title={c.ports}>
                            {c.ports}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 flex-shrink-0 self-end sm:self-center">
                      {isRunning ? (
                        <button
                          onClick={() => handleAction(c.id, 'stop')}
                          disabled={isBusy}
                          className="btn-cyan-secondary px-3 py-1.5 text-xs text-rose-300 hover:text-rose-200"
                          title="Detener contenedor"
                        >
                          <Square className="w-3 h-3 fill-current" />
                          <span>Stop</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAction(c.id, 'start')}
                          disabled={isBusy}
                          className="btn-cyan-primary px-3 py-1.5 text-xs font-semibold"
                          title="Iniciar contenedor"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Start</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleAction(c.id, 'restart')}
                        disabled={isBusy}
                        className="btn-cyan-secondary px-3 py-1.5 text-xs"
                        title="Reiniciar contenedor"
                      >
                        <RotateCw className={`w-3 h-3 ${isBusy ? 'animate-spin text-electric-cyan' : ''}`} />
                        <span className="hidden sm:inline">Reiniciar</span>
                      </button>
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


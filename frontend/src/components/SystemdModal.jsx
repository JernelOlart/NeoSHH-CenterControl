import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Server,
  Play,
  Square,
  RotateCw,
  RefreshCw,
  Search,
  AlertCircle
} from 'lucide-react';
import { fetchSystemServices, serviceAction } from '../services/api';

export default function SystemdModal({ server, isOpen, onClose }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [actionLoading, setActionLoading] = useState({});

  const loadServices = async () => {
    if (!server) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSystemServices(server.id);
      setServices(data.services || (Array.isArray(data) ? data : []));
    } catch (err) {
      setError(err.message || 'Error al obtener la lista de servicios systemd');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && server) {
      setFilterQuery('');
      loadServices();
    }
  }, [isOpen, server?.id]);

  if (!isOpen || !server) return null;

  const handleAction = async (serviceName, action) => {
    setActionLoading((prev) => ({ ...prev, [serviceName]: action }));
    try {
      await serviceAction(server.id, serviceName, action);
      await loadServices();
    } catch (err) {
      alert(`Error al ejecutar ${action} en ${serviceName}: ${err.message}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [serviceName]: null }));
    }
  };

  const filteredServices = useMemo(() => {
    if (!filterQuery.trim()) return services;
    const q = filterQuery.toLowerCase();
    return services.filter(
      (s) =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.description && s.description.toLowerCase().includes(q))
    );
  }, [services, filterQuery]);

  const getStatusBadge = (service) => {
    const rawStatus = (service.status || service.active || '').toLowerCase();
    if (rawStatus.includes('running') || rawStatus.includes('active')) {
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-pills bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
          activo
        </span>
      );
    }
    if (rawStatus.includes('failed') || rawStatus.includes('error')) {
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-pills bg-rose-500/10 text-rose-400 border border-rose-500/20 inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          fallido
        </span>
      );
    }
    return (
      <span className="text-[10px] font-mono px-2 py-0.5 rounded-pills bg-white/5 text-fog-text border border-white/10 inline-flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-fog-text" />
        inactivo
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-void-base/85 backdrop-blur-sm">
      <div className="bg-elevated-surface rounded-cards-lg w-full max-w-4xl border border-border-smoke flex flex-col h-[85vh] max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-border-smoke/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-nodes bg-white/5 border border-electric-cyan/30 flex items-center justify-center text-electric-cyan shadow-[0_0_10px_rgba(23,186,237,0.2)]">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-medium text-cloud-white">Servicios del Sistema (systemd)</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-pills bg-white/5 border border-white/10 text-electric-cyan">
                  {server.name}
                </span>
              </div>
              <p className="text-xs font-mono text-fog-text">
                Supervisión, inicio, parada y reinicio de servicios unitarios
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadServices}
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

        {/* Filter Bar */}
        <div className="px-4 py-2.5 border-b border-border-smoke/70 bg-deep-panel flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-fog-text" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filtrar por nombre de servicio o descripción..."
              className="w-full bg-void-base border border-border-smoke rounded-pills pl-8 pr-3 py-1.5 text-xs font-mono text-cloud-white placeholder:text-fog-text focus:outline-none focus:border-electric-cyan"
            />
          </div>
          <span className="text-xs font-mono text-fog-text whitespace-nowrap">
            {filteredServices.length} de {services.length}
          </span>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1">
          {loading && services.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-fog-text gap-2 text-xs font-mono">
              <RefreshCw className="w-4 h-4 animate-spin text-electric-cyan" />
              <span>Consultando servicios systemd en el VPS...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-cards bg-rose-500/10 border border-rose-500/20 text-rose-300 font-mono text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="text-center py-12 text-fog-text text-xs font-mono">
              <Server className="w-8 h-8 mx-auto mb-2 opacity-40 text-electric-cyan" />
              <p>No se encontraron servicios que coincidan con la búsqueda.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredServices.map((s, idx) => {
                const currentAction = actionLoading[s.name];
                const isBusy = Boolean(currentAction);
                const rawStatus = (s.status || s.active || '').toLowerCase();
                const isActive = rawStatus.includes('running') || rawStatus.includes('active');

                return (
                  <div
                    key={s.name || idx}
                    className="p-3 rounded-cards bg-deep-panel border border-border-smoke/60 hover:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-semibold text-cloud-white truncate">
                          {s.name}
                        </span>
                        {getStatusBadge(s)}
                      </div>
                      {s.description && (
                        <p className="text-[11px] font-sans text-fog-text mt-0.5 truncate max-w-xl" title={s.description}>
                          {s.description}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0 self-end sm:self-center">
                      {isActive ? (
                        <button
                          type="button"
                          onClick={() => handleAction(s.name, 'stop')}
                          disabled={isBusy}
                          className="btn-cyan-secondary px-2.5 py-1 text-xs text-rose-300 hover:text-rose-200 inline-flex items-center gap-1"
                          title="Detener servicio"
                        >
                          {currentAction === 'stop' ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Square className="w-3 h-3 fill-current" />
                          )}
                          <span className="text-[11px]">Stop</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAction(s.name, 'start')}
                          disabled={isBusy}
                          className="btn-cyan-primary px-2.5 py-1 text-xs inline-flex items-center gap-1"
                          title="Iniciar servicio"
                        >
                          {currentAction === 'start' ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Play className="w-3 h-3 fill-current" />
                          )}
                          <span className="text-[11px]">Start</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleAction(s.name, 'restart')}
                        disabled={isBusy}
                        className="btn-cyan-secondary px-2.5 py-1 text-xs inline-flex items-center gap-1"
                        title="Reiniciar servicio"
                      >
                        <RotateCw className={`w-3 h-3 ${currentAction === 'restart' ? 'animate-spin text-electric-cyan' : ''}`} />
                        <span className="text-[11px]">Reiniciar</span>
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

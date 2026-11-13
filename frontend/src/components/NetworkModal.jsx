import React, { useState, useEffect } from 'react';
import {
  X,
  Network,
  RefreshCw,
  Search,
  Download,
  AlertCircle,
  Activity,
  Globe,
  Route
} from 'lucide-react';
import { fetchNetworkInfo } from '../services/api';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const b = Number(bytes);
  if (b >= 1e9) return (b / 1e9).toFixed(2) + ' GB';
  if (b >= 1e6) return (b / 1e6).toFixed(2) + ' MB';
  if (b >= 1e3) return (b / 1e3).toFixed(2) + ' KB';
  return b + ' B';
}

function stateColor(state) {
  if (!state) return 'text-fog-text';
  const s = state.toUpperCase();
  if (s === 'LISTEN') return 'text-electric-cyan';
  if (s === 'ESTABLISHED') return 'text-emerald-400';
  if (s.includes('WAIT') || s === 'CLOSE_WAIT') return 'text-gray-400';
  return 'text-ash-text';
}

function stateBg(state) {
  if (!state) return '';
  const s = state.toUpperCase();
  if (s === 'LISTEN') return 'bg-electric-cyan/10 border-electric-cyan/20 text-electric-cyan';
  if (s === 'ESTABLISHED') return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300';
  if (s.includes('WAIT') || s === 'CLOSE_WAIT') return 'bg-white/5 border-white/10 text-gray-400';
  return 'bg-white/5 border-white/10 text-ash-text';
}

export default function NetworkModal({ server, isOpen, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connections, setConnections] = useState([]);
  const [interfaces, setInterfaces] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [filter, setFilter] = useState('');

  const loadNetwork = async () => {
    if (!server) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchNetworkInfo(server.id);
      setConnections(data.connections || []);
      setInterfaces(data.interfaces || []);
      setRoutes(data.routes || []);
    } catch (err) {
      setError(err.message || 'Error al consultar información de red');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && server) {
      setFilter('');
      loadNetwork();
    }
  }, [isOpen, server?.id]);

  if (!isOpen || !server) return null;

  const filteredConns = connections.filter((c) => {
    if (!filter) return true;
    const f = filter.toLowerCase();
    return (
      (c.localAddr || '').toLowerCase().includes(f) ||
      (c.process || '').toLowerCase().includes(f) ||
      (c.state || '').toLowerCase().includes(f) ||
      (c.proto || '').toLowerCase().includes(f)
    );
  });

  const maxBytes = Math.max(...interfaces.map((i) => Math.max(i.rxBytes || 0, i.txBytes || 0)), 1);

  const handleExport = () => {
    const lines = [
      `=== Red del servidor: ${server.name} ===`,
      '',
      '-- Conexiones Activas --',
      ...connections.map(
        (c) => `${c.proto || ''}\t${c.localAddr || ''}\t${c.state || ''}\t${c.process || ''}`
      ),
      '',
      '-- Interfaces --',
      ...interfaces.map((i) => `${i.name}  RX: ${formatBytes(i.rxBytes)}  TX: ${formatBytes(i.txBytes)}`),
      '',
      '-- Rutas --',
      ...routes
    ].join('\n');

    const blob = new Blob([lines], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `network-${server.name}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-void-base/85 backdrop-blur-sm">
      <div className="bg-elevated-surface rounded-cards-lg w-full max-w-4xl border border-border-smoke flex flex-col h-[85vh] max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-border-smoke/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-nodes bg-white/5 border border-electric-cyan/30 flex items-center justify-center text-electric-cyan shadow-[0_0_10px_rgba(23,186,237,0.2)]">
              <Network className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-medium text-cloud-white">Monitor de Red</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-pills bg-white/5 border border-white/10 text-electric-cyan">
                  {server.name}
                </span>
              </div>
              <p className="text-xs font-mono text-fog-text">Conexiones activas, interfaces y tabla de rutas</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={loading}
              className="btn-cyan-secondary px-2.5 py-1.5 text-xs flex items-center gap-1.5"
              title="Exportar como texto"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exportar</span>
            </button>
            <button
              onClick={loadNetwork}
              disabled={loading}
              className="btn-cyan-icon p-2"
              title="Refrescar"
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

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3 rounded-cards bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center gap-2 text-xs font-mono text-fog-text py-16 justify-center">
              <RefreshCw className="w-4 h-4 animate-spin text-electric-cyan" />
              Consultando información de red...
            </div>
          ) : (
            <>
              {/* Section 1: Active Connections */}
              <section>
                <div className="flex items-center justify-between mb-2 gap-2">
                  <h3 className="text-xs font-mono font-semibold text-ash-text uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-electric-cyan" />
                    Conexiones Activas ({filteredConns.length})
                  </h3>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-fog-text pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Filtrar por puerto, proceso..."
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      className="bg-void-base border border-border-smoke rounded-inputs pl-8 pr-3 py-1.5 text-xs font-mono text-cloud-white focus:outline-none focus:border-electric-cyan w-48"
                    />
                  </div>
                </div>

                {filteredConns.length === 0 ? (
                  <div className="text-center py-6 text-fog-text text-xs font-mono bg-deep-panel rounded-cards border border-border-smoke/60">
                    {filter ? 'Sin coincidencias para el filtro' : 'No hay conexiones activas detectadas'}
                  </div>
                ) : (
                  <div className="rounded-cards border border-border-smoke/60 overflow-hidden">
                    <table className="w-full text-xs font-mono">
                      <thead>
                        <tr className="bg-deep-panel border-b border-border-smoke/60">
                          <th className="text-left px-3 py-2 text-fog-text font-normal">Proto</th>
                          <th className="text-left px-3 py-2 text-fog-text font-normal">Dirección Local</th>
                          <th className="text-left px-3 py-2 text-fog-text font-normal">Estado</th>
                          <th className="text-left px-3 py-2 text-fog-text font-normal">Proceso</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredConns.map((c, i) => (
                          <tr
                            key={i}
                            className="border-b border-border-smoke/40 hover:bg-white/[0.02] transition"
                          >
                            <td className="px-3 py-2 text-ash-text">{c.proto || '-'}</td>
                            <td className="px-3 py-2 text-cloud-white">{c.localAddr || '-'}</td>
                            <td className="px-3 py-2">
                              {c.state ? (
                                <span
                                  className={`px-2 py-0.5 rounded-pills border text-[10px] ${stateBg(c.state)}`}
                                >
                                  {c.state}
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="px-3 py-2 text-fog-text truncate max-w-[140px]">{c.process || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Section 2: Network Interfaces */}
              {interfaces.length > 0 && (
                <section>
                  <h3 className="text-xs font-mono font-semibold text-ash-text uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-electric-cyan" />
                    Interfaces de Red
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {interfaces.map((iface, i) => {
                      const rxPct = Math.round(((iface.rxBytes || 0) / maxBytes) * 100);
                      const txPct = Math.round(((iface.txBytes || 0) / maxBytes) * 100);
                      return (
                        <div
                          key={i}
                          className="p-3.5 rounded-cards bg-deep-panel border border-border-smoke/60 hover:border-white/10 transition space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-cloud-white">{iface.name}</span>
                          </div>
                          <div className="space-y-1.5">
                            <div>
                              <div className="flex justify-between text-[10px] font-mono text-fog-text mb-0.5">
                                <span>RX</span>
                                <span className="text-ash-text">{formatBytes(iface.rxBytes)}</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-electric-cyan/60 transition-all"
                                  style={{ width: `${rxPct}%` }}
                                />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-[10px] font-mono text-fog-text mb-0.5">
                                <span>TX</span>
                                <span className="text-ash-text">{formatBytes(iface.txBytes)}</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-emerald-400/60 transition-all"
                                  style={{ width: `${txPct}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Section 3: Routes */}
              {routes.length > 0 && (
                <section>
                  <h3 className="text-xs font-mono font-semibold text-ash-text uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Route className="w-3.5 h-3.5 text-electric-cyan" />
                    Tabla de Rutas
                  </h3>
                  <div className="bg-void-base border border-border-smoke rounded-cards p-3 font-mono text-[11px] text-ash-text whitespace-pre leading-relaxed select-text">
                    {routes.join('\n')}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

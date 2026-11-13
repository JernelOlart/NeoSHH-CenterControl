import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Plus,
  Trash2,
  RefreshCw,
  ArrowRight,
  Lock,
  Unlock
} from 'lucide-react';
import { fetchFirewall, updateFirewallRule } from '../services/api';

export default function FirewallModal({ server, isOpen, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newPort, setNewPort] = useState('');
  const [newProto, setNewProto] = useState('tcp');
  const [actionLoading, setActionLoading] = useState(false);

  const loadFirewall = async () => {
    if (!server) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchFirewall(server.id);
      setData(res);
    } catch (err) {
      setError(err.message || 'Error al consultar UFW Firewall');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && server) {
      loadFirewall();
    }
  }, [isOpen, server?.id]);

  if (!isOpen || !server) return null;

  const handleAddRule = async (e) => {
    e.preventDefault();
    if (!newPort.trim()) return;
    setActionLoading(true);
    try {
      await updateFirewallRule(server.id, {
        port: newPort.trim(),
        proto: newProto,
        action: 'allow'
      });
      setNewPort('');
      await loadFirewall();
    } catch (err) {
      alert(`Error al abrir puerto: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRule = async (port, proto) => {
    if (!window.confirm(`¿Cerrar o eliminar regla para puerto ${port}/${proto}?`)) return;
    setActionLoading(true);
    try {
      await updateFirewallRule(server.id, {
        port,
        proto,
        action: 'delete'
      });
      await loadFirewall();
    } catch (err) {
      alert(`Error al eliminar regla: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const applyPreset = async (port) => {
    setNewPort(port.toString());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-void-base/85 backdrop-blur-sm">
      <div className="bg-elevated-surface rounded-cards-lg w-full max-w-2xl border border-border-smoke flex flex-col max-h-[85vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-border-smoke/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-nodes bg-white/5 border border-electric-cyan/30 flex items-center justify-center text-electric-cyan shadow-[0_0_10px_rgba(23,186,237,0.2)]">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-medium text-cloud-white">
                  Firewall & Control de Puertos (UFW)
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-pills bg-white/5 border border-white/10 text-electric-cyan">
                  {server.name}
                </span>
              </div>
              <p className="text-xs font-mono text-fog-text">
                Reglas de red, puertos entrantes y seguridad perimetral
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadFirewall}
              disabled={loading}
              className="btn-cyan-icon p-2 text-xs"
              title="Refrescar estado"
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
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-fog-text gap-2 font-mono text-xs">
              <RefreshCw className="w-4 h-4 animate-spin text-electric-cyan" />
              <span>Consultando reglas de firewall...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-cards bg-rose-500/10 border border-rose-500/20 text-rose-300 font-mono text-xs">
              {error}
            </div>
          ) : data ? (
            <>
              {/* Status Indicator Bar */}
              <div className="p-3.5 rounded-cards bg-deep-panel border border-border-smoke/70 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {data.isActive ? (
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <ShieldAlert className="w-5 h-5 text-amber-400" />
                  )}
                  <div>
                    <span className="font-mono text-xs text-cloud-white font-medium block">
                      Estado UFW: {data.isActive ? 'ACTIVO (Filtrando tráfico)' : 'INACTIVO o permisivo'}
                    </span>
                    <span className="text-[11px] font-mono text-fog-text">
                      {data.rules?.length || 0} reglas configuradas
                    </span>
                  </div>
                </div>

                <span
                  className={`text-[11px] font-mono px-2.5 py-0.5 rounded-pills border ${
                    data.isActive
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  }`}
                >
                  {data.isActive ? 'PROTEGIDO' : 'ABIERTO'}
                </span>
              </div>

              {/* Add New Port Form */}
              <form onSubmit={handleAddRule} className="p-3.5 rounded-cards bg-deep-panel border border-border-smoke/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-medium text-cloud-white">Abrir / Permitir Puerto</span>
                  {/* Presets */}
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-fog-text">
                    <span>Presets:</span>
                    <button type="button" onClick={() => applyPreset(80)} className="hover:text-electric-cyan underline">80 (HTTP)</button>
                    <button type="button" onClick={() => applyPreset(443)} className="hover:text-electric-cyan underline">443 (HTTPS)</button>
                    <button type="button" onClick={() => applyPreset(3000)} className="hover:text-electric-cyan underline">3000</button>
                    <button type="button" onClick={() => applyPreset(8080)} className="hover:text-electric-cyan underline">8080</button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    required
                    placeholder="Número de puerto (ej: 80, 443, 8080)"
                    value={newPort}
                    onChange={(e) => setNewPort(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-void-base border border-border-smoke rounded-pills font-mono text-xs text-ash-text focus:outline-none focus:border-electric-cyan/40"
                  />

                  <select
                    value={newProto}
                    onChange={(e) => setNewProto(e.target.value)}
                    className="bg-void-base border border-border-smoke rounded-pills text-xs font-mono text-ash-text px-3 py-1.5 focus:outline-none"
                  >
                    <option value="tcp">TCP</option>
                    <option value="udp">UDP</option>
                  </select>

                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="btn-cyan-primary px-4 py-1.5 text-xs font-semibold whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Permitir Puerto</span>
                  </button>
                </div>
              </form>

              {/* Rules List Table */}
              <div className="bg-deep-panel rounded-cards border border-border-smoke/60 overflow-hidden">
                <div className="p-3 border-b border-border-smoke/60 text-xs font-mono text-cloud-white font-medium">
                  Reglas Activas en el VPS
                </div>

                {data.rules && data.rules.length > 0 ? (
                  <div className="divide-y divide-border-smoke/30 max-h-60 overflow-y-auto">
                    {data.rules.map((rule, idx) => {
                      const portPart = rule.to ? rule.to.split('/')[0] : '';
                      const protoPart = rule.to && rule.to.includes('/') ? rule.to.split('/')[1] : 'tcp';

                      return (
                        <div key={idx} className="p-3 flex items-center justify-between text-xs font-mono hover:bg-void-base/40">
                          <div className="flex items-center gap-2.5">
                            <span className="w-5 text-fog-text">#{rule.number || idx + 1}</span>
                            <span className="font-bold text-cloud-white">{rule.to || rule.raw}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-pills bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                              {rule.action || 'ALLOW'}
                            </span>
                            <span className="text-fog-text text-[11px]">desde {rule.from || 'Anywhere'}</span>
                          </div>

                          {rule.to && (
                            <button
                              onClick={() => handleDeleteRule(portPart, protoPart)}
                              disabled={actionLoading}
                              className="text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-rose-500/10 transition"
                              title="Eliminar regla / cerrar puerto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs font-mono text-fog-text">
                    No hay reglas específicas configuradas en UFW.
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}


import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Package,
  RefreshCw,
  ArrowUpCircle,
  Search,
  Plus,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Terminal
} from 'lucide-react';
import { fetchPackages, runPackageCommand } from '../services/api';

const PM_BADGE = {
  apt: { label: 'APT (Debian/Ubuntu)', color: 'text-orange-300 border-orange-400/30 bg-orange-400/10' },
  yum: { label: 'YUM (RHEL/CentOS)', color: 'text-blue-300 border-blue-400/30 bg-blue-400/10' },
  apk: { label: 'APK (Alpine)', color: 'text-teal-300 border-teal-400/30 bg-teal-400/10' }
};

export default function PackageManagerModal({ server, isOpen, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [packageManager, setPackageManager] = useState('apt');
  const [installed, setInstalled] = useState([]);
  const [upgradable, setUpgradable] = useState([]);
  const [tab, setTab] = useState('installed');
  const [search, setSearch] = useState('');
  const [installInput, setInstallInput] = useState('');
  const [output, setOutput] = useState('');
  const [cmdLoading, setCmdLoading] = useState(false);
  const [showUpgradeConfirm, setShowUpgradeConfirm] = useState(false);
  const outputRef = useRef(null);

  const loadPackages = async () => {
    if (!server) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPackages(server.id);
      setPackageManager(data.packageManager || 'apt');
      setInstalled(data.installed || []);
      setUpgradable(data.upgradable || []);
    } catch (err) {
      setError(err.message || 'Error al consultar paquetes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && server) {
      setTab('installed');
      setSearch('');
      setOutput('');
      setInstallInput('');
      setShowUpgradeConfirm(false);
      loadPackages();
    }
  }, [isOpen, server?.id]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  if (!isOpen || !server) return null;

  const runCmd = async (action, packageName = '') => {
    setCmdLoading(true);
    setOutput(`$ ${action}${packageName ? ' ' + packageName : ''}\n`);
    try {
      const data = await runPackageCommand(server.id, action, packageName);
      setOutput((o) => o + (data.output || 'Operación completada.'));
      if (action === 'update' || action === 'upgrade') await loadPackages();
    } catch (err) {
      setOutput((o) => o + `\nError: ${err.message}`);
    } finally {
      setCmdLoading(false);
      setShowUpgradeConfirm(false);
    }
  };

  const handleInstall = (e) => {
    e.preventDefault();
    if (!installInput.trim()) return;
    runCmd('install', installInput.trim());
    setInstallInput('');
  };

  const pmBadge = PM_BADGE[packageManager] || PM_BADGE.apt;

  const filteredInstalled = installed.filter((p) =>
    p.toLowerCase().includes(search.toLowerCase())
  );
  const filteredUpgradable = upgradable.filter((p) =>
    p.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-void-base/85 backdrop-blur-sm">
      <div className="bg-elevated-surface rounded-cards-lg w-full max-w-4xl border border-border-smoke flex flex-col h-[85vh] max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-border-smoke/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-nodes bg-white/5 border border-electric-cyan/30 flex items-center justify-center text-electric-cyan shadow-[0_0_10px_rgba(23,186,237,0.2)]">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-medium text-cloud-white">Gestor de Paquetes</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-pills bg-white/5 border border-white/10 text-electric-cyan">
                  {server.name}
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-pills border ${pmBadge.color}`}>
                  {pmBadge.label}
                </span>
              </div>
              <p className="text-xs font-mono text-fog-text">Instala, actualiza y gestiona paquetes del sistema</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadPackages}
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

        {/* Quick install + action bar */}
        <div className="px-4 py-3 border-b border-border-smoke/70 flex flex-wrap items-center gap-2 bg-deep-panel">
          <form onSubmit={handleInstall} className="flex items-center gap-2 flex-1 min-w-[200px]">
            <div className="relative flex-1">
              <Plus className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-fog-text pointer-events-none" />
              <input
                type="text"
                placeholder="Instalar paquete (ej: htop)"
                value={installInput}
                onChange={(e) => setInstallInput(e.target.value)}
                className="w-full bg-void-base border border-border-smoke rounded-inputs pl-8 pr-3 py-1.5 text-xs font-mono text-cloud-white focus:outline-none focus:border-electric-cyan"
              />
            </div>
            <button
              type="submit"
              disabled={cmdLoading || !installInput.trim()}
              className="btn-cyan-primary px-3 py-1.5 text-xs flex items-center gap-1.5"
            >
              <Plus className="w-3 h-3" />
              Instalar
            </button>
          </form>

          <button
            onClick={() => runCmd('update')}
            disabled={cmdLoading}
            className="btn-cyan-secondary px-3 py-1.5 text-xs flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3 h-3 ${cmdLoading ? 'animate-spin text-electric-cyan' : ''}`} />
            Actualizar lista
          </button>

          <button
            onClick={() => setShowUpgradeConfirm(true)}
            disabled={cmdLoading}
            className="btn-cyan-secondary px-3 py-1.5 text-xs flex items-center gap-1.5 text-amber-300 border-amber-500/30 hover:border-amber-400/60"
          >
            <ArrowUpCircle className="w-3 h-3" />
            Actualizar todo
          </button>
        </div>

        {/* Upgrade confirm */}
        {showUpgradeConfirm && (
          <div className="px-4 py-3 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-mono text-amber-200">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Esto actualizará todos los paquetes del sistema. Esta acción puede tardar varios minutos.</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setShowUpgradeConfirm(false)}
                className="btn-cyan-secondary px-3 py-1 text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={() => runCmd('upgrade')}
                className="btn-cyan-primary px-3 py-1 text-xs flex items-center gap-1.5"
              >
                <ArrowUpCircle className="w-3 h-3" />
                Confirmar
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-border-smoke/70 bg-deep-panel px-4 gap-2 pt-2 text-xs font-mono">
          <button
            onClick={() => setTab('installed')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-2 transition ${
              tab === 'installed'
                ? 'border-electric-cyan text-electric-cyan font-semibold'
                : 'border-transparent text-fog-text hover:text-cloud-white'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            Instalados ({installed.length})
          </button>
          <button
            onClick={() => setTab('upgradable')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-2 transition ${
              tab === 'upgradable'
                ? 'border-electric-cyan text-electric-cyan font-semibold'
                : 'border-transparent text-fog-text hover:text-cloud-white'
            }`}
          >
            <ArrowUpCircle className="w-3.5 h-3.5" />
            Actualizaciones ({upgradable.length})
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="p-4 flex-1 overflow-y-auto space-y-3">
            {error && (
              <div className="p-3 rounded-cards bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-fog-text pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar paquete..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-void-base border border-border-smoke rounded-inputs pl-8 pr-3 py-1.5 text-xs font-mono text-cloud-white focus:outline-none focus:border-electric-cyan"
              />
            </div>

            {loading ? (
              <div className="flex items-center gap-2 text-xs font-mono text-fog-text py-8 justify-center">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-electric-cyan" />
                Consultando paquetes...
              </div>
            ) : tab === 'installed' ? (
              filteredInstalled.length === 0 ? (
                <div className="text-center py-8 text-fog-text text-xs font-mono">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-40 text-electric-cyan" />
                  <p>{search ? 'Sin resultados para la búsqueda' : 'No hay paquetes instalados detectados'}</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredInstalled.map((pkg, i) => (
                    <div
                      key={i}
                      className="px-3 py-2 rounded-cards bg-deep-panel border border-border-smoke/50 hover:border-white/10 font-mono text-xs text-ash-text flex items-center justify-between transition"
                    >
                      <span>{pkg}</span>
                    </div>
                  ))}
                </div>
              )
            ) : (
              filteredUpgradable.length === 0 ? (
                <div className="text-center py-8 text-fog-text text-xs font-mono">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-40 text-emerald-400" />
                  <p>{search ? 'Sin resultados' : 'Todos los paquetes están actualizados'}</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredUpgradable.map((pkg, i) => (
                    <div
                      key={i}
                      className="px-3 py-2 rounded-cards bg-deep-panel border border-amber-500/20 hover:border-amber-400/40 font-mono text-xs text-amber-200 flex items-center justify-between transition"
                    >
                      <span>{pkg}</span>
                      <ArrowUpCircle className="w-3 h-3 text-amber-400 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              )
            )}
          </div>

          {/* Output console */}
          {output && (
            <div className="border-t border-border-smoke/70 p-3 flex flex-col gap-1">
              <div className="flex items-center gap-2 text-[10px] font-mono text-fog-text mb-1">
                <Terminal className="w-3 h-3 text-electric-cyan" />
                <span>Salida del comando</span>
                {cmdLoading && <RefreshCw className="w-3 h-3 animate-spin text-electric-cyan ml-1" />}
              </div>
              <div
                ref={outputRef}
                className="bg-void-base border border-border-smoke rounded-cards p-3 font-mono text-[11px] text-cloud-white max-h-32 overflow-y-auto whitespace-pre leading-relaxed select-text"
              >
                {output}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

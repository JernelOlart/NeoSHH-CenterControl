import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  RefreshCw,
  Globe,
  FileText,
  Save,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  ChevronRight,
  FolderOpen
} from 'lucide-react';
import { fetchNginxSites, getNginxSiteContent, saveNginxSite } from '../services/api';

export default function NginxModal({ server, isOpen, onClose }) {
  const [loading, setLoading] = useState(false);
  const [hasNginx, setHasNginx] = useState(true);
  const [sitesEnabled, setSitesEnabled] = useState([]);
  const [confD, setConfD] = useState([]);
  const [error, setError] = useState(null);

  const [selectedSite, setSelectedSite] = useState(null);
  const [siteContent, setSiteContent] = useState('');
  const [siteLoading, setSiteLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [validation, setValidation] = useState(null); // { valid, output }

  const [reloading, setReloading] = useState(false);
  const [reloadMsg, setReloadMsg] = useState(null);

  const loadSites = useCallback(async () => {
    if (!server) return;
    setLoading(true);
    setError(null);
    setSelectedSite(null);
    setSiteContent('');
    setValidation(null);
    try {
      const data = await fetchNginxSites(server.id);
      setHasNginx(data.hasNginx !== false);
      const rawSites = data.sitesEnabled || data.sites || [];
      const rawConf = data.confD || data.confFiles || [];
      setSitesEnabled(rawSites.map(s => typeof s === 'string' ? { name: s, path: `/etc/nginx/sites-enabled/${s}` } : s));
      setConfD(rawConf.map(s => typeof s === 'string' ? { name: s, path: `/etc/nginx/conf.d/${s}` } : s));
    } catch (err) {
      setError(err.message || 'Error al consultar Nginx');
    } finally {
      setLoading(false);
    }
  }, [server]);

  useEffect(() => {
    if (isOpen && server) {
      loadSites();
    }
  }, [isOpen, server?.id]);

  if (!isOpen || !server) return null;

  const handleSelectSite = async (site) => {
    setSelectedSite(site);
    setValidation(null);
    setSiteLoading(true);
    try {
      const data = await getNginxSiteContent(server.id, site.name);
      setSiteContent(data.content || '');
    } catch (err) {
      setSiteContent(`# Error al cargar: ${err.message}`);
    } finally {
      setSiteLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedSite) return;
    setSaving(true);
    setValidation(null);
    try {
      const data = await saveNginxSite(server.id, selectedSite.path, siteContent);
      setValidation({ valid: data.valid, output: data.output || '' });
    } catch (err) {
      setValidation({ valid: false, output: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleReload = async () => {
    setReloading(true);
    setReloadMsg(null);
    try {
      const res = await fetch(`/api/servers/${server.id}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'nginx -s reload' })
      });
      const data = await res.json();
      setReloadMsg({ ok: res.ok, text: data.output || (res.ok ? 'Nginx recargado correctamente' : 'Error al recargar') });
    } catch (err) {
      setReloadMsg({ ok: false, text: err.message });
    } finally {
      setReloading(false);
      setTimeout(() => setReloadMsg(null), 4000);
    }
  };

  const allSites = [
    ...sitesEnabled.map(s => ({ ...s, group: 'sites-enabled' })),
    ...confD.map(s => ({ ...s, group: 'conf.d' }))
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-void-base/85 backdrop-blur-sm">
      <div className="bg-elevated-surface rounded-cards-lg w-full max-w-4xl border border-border-smoke flex flex-col h-[85vh] max-h-[90vh] overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="p-4 border-b border-border-smoke/70 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-nodes bg-white/5 border border-electric-cyan/30 flex items-center justify-center text-electric-cyan shadow-[0_0_10px_rgba(23,186,237,0.2)]">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-medium text-cloud-white">Gestor Nginx</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-pills bg-white/5 border border-white/10 text-electric-cyan">
                  {server.name}
                </span>
              </div>
              <p className="text-xs font-mono text-fog-text">Edita sitios habilitados y configuraciones</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasNginx && (
              <button
                onClick={handleReload}
                disabled={reloading}
                className="btn-cyan-secondary px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
                title="Recargar Nginx"
              >
                <RotateCw className={`w-3.5 h-3.5 ${reloading ? 'animate-spin text-electric-cyan' : ''}`} />
                <span>Recargar Nginx</span>
              </button>
            )}
            <button
              onClick={loadSites}
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

        {/* Reload message */}
        {reloadMsg && (
          <div className={`mx-4 mt-3 flex-shrink-0 p-2.5 rounded-inputs text-xs font-mono flex items-center gap-2 ${
            reloadMsg.ok
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
          }`}>
            {reloadMsg.ok ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />}
            <span>{reloadMsg.text}</span>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-fog-text gap-2 text-xs font-mono">
              <RefreshCw className="w-4 h-4 animate-spin text-electric-cyan" />
              <span>Consultando configuración Nginx...</span>
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
              <p className="text-xs font-mono text-rose-300">{error}</p>
            </div>
          ) : !hasNginx ? (
            <div className="p-8 text-center rounded-cards bg-deep-panel border border-border-smoke/60 m-4">
              <Globe className="w-10 h-10 text-fog-text mx-auto mb-3 opacity-40" />
              <h3 className="text-sm font-medium text-cloud-white mb-1">Nginx no detectado</h3>
              <p className="text-xs text-fog-text">Nginx no detectado en este servidor</p>
            </div>
          ) : (
            <div className="flex flex-1 overflow-hidden min-h-0">
              {/* Sidebar: site list */}
              <div className="w-56 sm:w-60 flex-shrink-0 border-r border-border-smoke/70 overflow-y-auto bg-deep-panel p-3 space-y-3">
                {allSites.length === 0 ? (
                  <p className="text-xs text-fog-text font-mono px-1">Sin archivos de configuración encontrados.</p>
                ) : (
                  ['sites-enabled', 'conf.d'].map(group => {
                    const items = allSites.filter(s => s.group === group);
                    if (!items.length) return null;
                    return (
                      <div key={group}>
                        <div className="flex items-center gap-1 text-[10px] font-mono text-fog-text uppercase tracking-widest mb-1.5 px-1">
                          <FolderOpen className="w-3 h-3" />
                          <span>{group}</span>
                        </div>
                        <div className="space-y-0.5">
                          {items.map(site => (
                            <button
                              key={site.name}
                              onClick={() => handleSelectSite(site)}
                              className={`w-full text-left flex items-center gap-1.5 px-2 py-1.5 rounded-inputs text-[11px] font-mono transition ${
                                selectedSite?.name === site.name
                                  ? 'bg-electric-cyan/10 border border-electric-cyan/30 text-electric-cyan font-medium'
                                  : 'text-ash-text hover:text-cloud-white hover:bg-white/5'
                              }`}
                            >
                              <FileText className="w-3 h-3 flex-shrink-0 opacity-70" />
                              <span className="truncate">{site.name}</span>
                              {selectedSite?.name === site.name && (
                                <ChevronRight className="w-3 h-3 ml-auto flex-shrink-0" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Editor pane */}
              <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                {!selectedSite ? (
                  <div className="flex-1 flex items-center justify-center text-xs text-fog-text font-mono">
                    <div className="text-center">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-30 text-electric-cyan" />
                      <p>Selecciona un sitio para editar</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col flex-1 overflow-hidden p-3 sm:p-4 gap-3 min-h-0">
                    <div className="flex items-center justify-between flex-shrink-0">
                      <span className="text-xs font-mono text-electric-cyan truncate">{selectedSite.path || selectedSite.name}</span>
                      <button
                        onClick={handleSave}
                        disabled={saving || siteLoading}
                        className="btn-cyan-primary px-4 py-1.5 text-xs inline-flex items-center gap-1.5 flex-shrink-0"
                      >
                        {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        <span>{saving ? 'Guardando...' : 'Guardar'}</span>
                      </button>
                    </div>

                    {siteLoading ? (
                      <div className="flex-1 flex items-center justify-center text-xs text-fog-text font-mono gap-2">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-electric-cyan" />
                        <span>Cargando configuración...</span>
                      </div>
                    ) : (
                      <textarea
                        className="flex-1 w-full bg-void-base border border-border-smoke rounded-inputs p-3 font-mono text-xs text-cloud-white resize-none focus:outline-none focus:border-electric-cyan leading-relaxed"
                        value={siteContent}
                        onChange={e => setSiteContent(e.target.value)}
                        spellCheck={false}
                      />
                    )}

                    {validation && (
                      <div className={`flex-shrink-0 p-2.5 rounded-inputs text-xs font-mono flex items-start gap-2 ${
                        validation.valid
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
                      }`}>
                        {validation.valid
                          ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                          : <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
                        <pre className="whitespace-pre-wrap break-all leading-relaxed">
                          {validation.valid ? 'nginx -t: configuración válida' : validation.output}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

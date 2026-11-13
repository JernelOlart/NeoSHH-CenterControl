import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  FileText,
  RefreshCw,
  Copy,
  Check,
  Download,
  Search,
  Filter
} from 'lucide-react';
import { fetchSystemLogs } from '../services/api';

const SOURCES = [
  { id: 'syslog', label: 'Syslog' },
  { id: 'journal', label: 'Journal' },
  { id: 'nginx', label: 'Nginx' },
  { id: 'apache', label: 'Apache' }
];

const LINE_OPTIONS = [50, 100, 200, 500];

export default function LiveLogsModal({ server, isOpen, onClose }) {
  const [source, setSource] = useState('syslog');
  const [lines, setLines] = useState(100);
  const [filter, setFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [copied, setCopied] = useState(false);

  const logContainerRef = useRef(null);
  const timerRef = useRef(null);

  const loadLogs = useCallback(
    async (silent = false) => {
      if (!server) return;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const data = await fetchSystemLogs(server.id, source, lines, activeFilter);
        setLogs(data.logs || '(Sin registros disponibles para esta fuente)');
      } catch (err) {
        setError(err.message || 'Error al obtener registros de logs');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [server, source, lines, activeFilter]
  );

  // Initial load or when dependencies change
  useEffect(() => {
    if (isOpen && server) {
      loadLogs();
    }
  }, [isOpen, server?.id, source, lines, activeFilter, loadLogs]);

  // Auto-scroll to bottom on logs update
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Auto-refresh interval (10 seconds)
  useEffect(() => {
    if (isOpen && autoRefresh) {
      timerRef.current = setInterval(() => {
        loadLogs(true);
      }, 10000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isOpen, autoRefresh, loadLogs]);

  if (!isOpen || !server) return null;

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setActiveFilter(filter.trim());
  };

  const handleCopy = async () => {
    if (!logs) return;
    try {
      await navigator.clipboard.writeText(logs);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownload = () => {
    if (!logs) return;
    const blob = new Blob([logs], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${server.name || 'server'}-${source}-logs-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-void-base/85 backdrop-blur-sm">
      <div className="bg-elevated-surface rounded-cards-lg w-full max-w-4xl border border-border-smoke flex flex-col h-[85vh] max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-border-smoke/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-nodes bg-white/5 border border-electric-cyan/30 flex items-center justify-center text-electric-cyan shadow-[0_0_10px_rgba(23,186,237,0.2)]">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-medium text-cloud-white">Visor de Logs del Sistema</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-pills bg-white/5 border border-white/10 text-electric-cyan">
                  {server.name}
                </span>
              </div>
              <p className="text-xs font-mono text-fog-text">
                Transmisión y filtrado de registros de servicios y núcleo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadLogs(false)}
              disabled={loading}
              className="btn-cyan-icon p-2 text-xs"
              title="Refrescar logs"
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

        {/* Source Selector Tabs */}
        <div className="flex border-b border-border-smoke/70 bg-deep-panel px-4 gap-2 pt-2 text-xs font-mono">
          {SOURCES.map((s) => (
            <button
              key={s.id}
              onClick={() => setSource(s.id)}
              className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition ${
                source === s.id
                  ? 'border-electric-cyan text-electric-cyan font-semibold'
                  : 'border-transparent text-fog-text hover:text-cloud-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        {/* Controls / Filter Bar */}
        <div className="p-3 border-b border-border-smoke/70 bg-deep-panel flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          {/* Search/Filter input */}
          <form onSubmit={handleFilterSubmit} className="flex items-center gap-2 flex-1 min-w-[200px]">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-fog-text" />
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filtrar logs en servidor (grep)..."
                className="w-full bg-void-base border border-border-smoke rounded-pills pl-8 pr-3 py-1.5 text-xs font-mono text-cloud-white placeholder:text-fog-text focus:outline-none focus:border-electric-cyan"
              />
            </div>
            <button
              type="submit"
              className="btn-cyan-secondary px-3 py-1.5 text-xs inline-flex items-center gap-1"
            >
              <Filter className="w-3 h-3 text-electric-cyan" />
              <span>Filtrar</span>
            </button>
            {activeFilter && (
              <button
                type="button"
                onClick={() => {
                  setFilter('');
                  setActiveFilter('');
                }}
                className="text-fog-text hover:text-rose-400 text-[11px] underline"
              >
                Limpiar filtro
              </button>
            )}
          </form>

          {/* Options & Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Lines count */}
            <div className="flex items-center gap-1">
              <span className="text-fog-text text-[11px]">Líneas:</span>
              <select
                value={lines}
                onChange={(e) => setLines(Number(e.target.value))}
                className="bg-void-base border border-border-smoke rounded-pills text-xs font-mono text-cloud-white px-2 py-1 focus:outline-none focus:border-electric-cyan"
              >
                {LINE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Auto-refresh toggle */}
            <button
              type="button"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-2.5 py-1 rounded-pills border text-xs font-mono flex items-center gap-1.5 transition ${
                autoRefresh
                  ? 'bg-electric-cyan/15 border-electric-cyan/40 text-electric-cyan font-medium'
                  : 'bg-void-base border-border-smoke text-fog-text hover:text-cloud-white'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  autoRefresh
                    ? 'bg-electric-cyan shadow-[0_0_6px_rgba(23,186,237,0.8)] animate-pulse'
                    : 'bg-fog-text'
                }`}
              />
              <span>Auto 10s</span>
            </button>

            {/* Copy button */}
            <button
              type="button"
              onClick={handleCopy}
              className="btn-cyan-secondary px-2.5 py-1 text-xs inline-flex items-center gap-1"
              title="Copiar logs al portapapeles"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-electric-cyan" />
                  <span>Copiar</span>
                </>
              )}
            </button>

            {/* Download button */}
            <button
              type="button"
              onClick={handleDownload}
              className="btn-cyan-secondary px-2.5 py-1 text-xs inline-flex items-center gap-1"
              title="Descargar archivo de texto con los logs"
            >
              <Download className="w-3 h-3 text-electric-cyan" />
              <span>Descargar</span>
            </button>
          </div>
        </div>

        {/* Content Body - Monospace Logs */}
        <div className="p-4 flex-1 flex flex-col min-h-0 bg-void-base/50">
          {error && (
            <div className="mb-3 p-3 rounded-cards bg-rose-500/10 border border-rose-500/20 text-rose-300 font-mono text-xs">
              {error}
            </div>
          )}

          <div
            ref={logContainerRef}
            className="flex-1 bg-void-base border border-border-smoke rounded-cards p-3 font-mono text-xs text-cloud-white overflow-y-auto whitespace-pre leading-relaxed select-text"
          >
            {loading && !logs ? (
              <div className="flex items-center justify-center py-16 text-fog-text gap-2 text-xs font-mono">
                <RefreshCw className="w-4 h-4 animate-spin text-electric-cyan" />
                <span>Obteniendo registros de {source}...</span>
              </div>
            ) : (
              logs || 'Sin contenido de logs.'
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

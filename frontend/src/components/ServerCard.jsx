import React, { useState } from 'react';
import {
  Terminal,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  MoreVertical,
  Edit2,
  Trash2,
  Info,
  HardDrive,
  Cpu,
  MemoryStick,
  FolderOpen,
  Box,
  Globe,
  Sliders,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';

export default function ServerCard({
  server,
  onConnectWeb,
  onOpenDetails,
  onOpenFiles,
  onOpenDocker,
  onEdit,
  onDelete,
  onRefresh,
  isRefreshing
}) {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const metrics = server.metrics;
  const isOnline = server.status === 'online';
  const isOffline = server.status === 'offline';

  const copyIp = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(server.host);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openMacTerminal = (e) => {
    e.stopPropagation();
    const sshUrl = `ssh://${server.username}@${server.host}:${server.port || 22}`;
    window.location.href = sshUrl;
  };

  const copySshCommand = (e) => {
    e.stopPropagation();
    const portFlag = server.port && server.port !== 22 ? `-p ${server.port} ` : '';
    const cmd = `ssh ${portFlag}${server.username}@${server.host}`;
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Check if web port is detected
  const hasWeb = metrics?.hasWeb || metrics?.services?.some(s => [80, 443, 8080, 3000, 8000].includes(s.port));
  const webPort = metrics?.webPort || metrics?.services?.find(s => [80, 443, 8080, 3000, 8000].includes(s.port))?.port || 80;
  const webUrl = `http://${server.host}${webPort === 80 ? '' : `:${webPort}`}`;

  const hasDocker = metrics?.hasDocker || (metrics?.dockerContainers && metrics.dockerContainers.length > 0);
  const activeContainersCount = metrics?.dockerContainers?.filter(c => c.running)?.length || 0;

  return (
    <div className="bg-elevated-surface rounded-cards p-4 sm:p-5 flex flex-col justify-between border border-border-smoke/80 hover:border-electric-cyan/40 transition-all duration-200 relative group shadow-sm hover:shadow-[0_0_24px_rgba(23,186,237,0.12)]">
      <div>
        {/* Header row: Status, Name, Provider, Actions */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {isOnline ? (
                <span className="flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded-pills bg-electric-cyan/10 border border-electric-cyan/30 text-electric-cyan">
                  <span className="w-1.5 h-1.5 rounded-full bg-electric-cyan shadow-[0_0_6px_rgba(23,186,237,0.9)]" />
                  <span>ONLINE</span>
                </span>
              ) : isOffline ? (
                <span className="flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded-pills bg-rose-500/10 border border-rose-500/30 text-rose-400">
                  <span>OFFLINE</span>
                </span>
              ) : (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-pills bg-white/5 border border-white/10 text-fog-text">
                  STANDBY
                </span>
              )}

              {server.provider && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-pills bg-white/5 border border-white/10 text-fog-text">
                  {server.provider}
                </span>
              )}

              {/* Web Badge if active */}
              {hasWeb && (
                <a
                  href={webUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-pills bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 transition"
                  title="Servicio Web detectado (clic para abrir)"
                >
                  <Globe className="w-3 h-3 text-emerald-400" />
                  <span>Web :{webPort}</span>
                </a>
              )}

              {/* Docker Badge if active */}
              {hasDocker && (
                <button
                  onClick={() => onOpenDocker(server)}
                  className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-pills bg-blue-500/10 border border-blue-500/30 text-blue-300 hover:bg-blue-500/20 transition"
                  title="Contenedores Docker activos"
                >
                  <Box className="w-3 h-3 text-blue-400" />
                  <span>Docker ({activeContainersCount})</span>
                </button>
              )}
            </div>

            <h3 className="font-sans font-medium text-base sm:text-lg text-cloud-white tracking-tight truncate" title={server.name}>
              {server.name}
            </h3>

            <div className="flex items-center gap-2 mt-0.5 text-xs font-mono text-fog-text">
              <span className="text-ash-text">{server.username}@{server.host}</span>
              {server.port && server.port !== 22 && (
                <span className="text-electric-cyan">:{server.port}</span>
              )}
              <button onClick={copyIp} title="Copiar IP" className="hover:text-electric-cyan transition">
                {copied ? <Check className="w-3 h-3 text-electric-cyan" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* Quick Refresh & 3-dot dropdown */}
          <div className="flex items-center gap-1 relative">
            <button
              onClick={() => onRefresh(server.id)}
              disabled={isRefreshing}
              title="Actualizar telemetría"
              className="p-1.5 rounded-pills text-fog-text hover:text-electric-cyan hover:bg-muted-shell transition disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-electric-cyan' : ''}`} />
            </button>

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-pills text-fog-text hover:text-cloud-white hover:bg-muted-shell transition"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 mt-1 top-full w-48 bg-deep-panel border border-border-smoke rounded-cards py-1 z-30 text-xs shadow-frosted font-sans">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenDetails(server);
                    }}
                    className="w-full text-left px-3 py-2 text-ash-text hover:bg-muted-shell hover:text-cloud-white flex items-center gap-2"
                  >
                    <Info className="w-3.5 h-3.5 text-electric-cyan" />
                    <span>Ver especificaciones y servicios</span>
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenFiles(server);
                    }}
                    className="w-full text-left px-3 py-2 text-ash-text hover:bg-muted-shell hover:text-cloud-white flex items-center gap-2"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-electric-cyan" />
                    <span>Gestor de archivos (SFTP)</span>
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenDocker(server);
                    }}
                    className="w-full text-left px-3 py-2 text-ash-text hover:bg-muted-shell hover:text-cloud-white flex items-center gap-2"
                  >
                    <Box className="w-3.5 h-3.5 text-blue-400" />
                    <span>Gestionar Docker</span>
                  </button>
                  {hasWeb && (
                    <a
                      href={webUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full text-left px-3 py-2 text-emerald-300 hover:bg-muted-shell flex items-center gap-2"
                    >
                      <Globe className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Abrir web en navegador</span>
                    </a>
                  )}
                  <button
                    onClick={(e) => {
                      setMenuOpen(false);
                      copySshCommand(e);
                    }}
                    className="w-full text-left px-3 py-2 text-ash-text hover:bg-muted-shell hover:text-cloud-white flex items-center gap-2"
                  >
                    <Copy className="w-3.5 h-3.5 text-fog-text" />
                    <span>Copiar comando SSH</span>
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit(server);
                    }}
                    className="w-full text-left px-3 py-2 text-ash-text hover:bg-muted-shell hover:text-cloud-white flex items-center gap-2"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-fog-text" />
                    <span>Editar servidor</span>
                  </button>
                  <div className="h-[1px] bg-border-smoke my-1" />
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete(server.id);
                    }}
                    className="w-full text-left px-3 py-2 text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tags */}
        {server.tags && server.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2.5">
            {server.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-mono px-2 py-0.5 rounded-pills bg-white/5 border border-white/10 text-fog-text"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Compact System Info Chips */}
        <div className="py-2 border-y border-border-smoke/60 flex items-center justify-between text-[11px] font-mono text-fog-text">
          <span className="truncate max-w-[150px] text-ash-text" title={metrics?.os || 'OS'}>
            {metrics?.os || 'OS Pendiente'}
          </span>
          <span className="truncate max-w-[120px]" title={metrics?.uptime || ''}>
            {metrics?.uptime || '--'}
          </span>
        </div>

        {/* Compact Telemetry Resource Bars */}
        <div className="mt-2.5 space-y-2">
          {/* RAM Progress */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono mb-1">
              <span className="text-fog-text flex items-center gap-1">
                <MemoryStick className="w-3 h-3 text-electric-cyan" />
                RAM
              </span>
              <span className="text-ash-text">
                {metrics?.memory
                  ? `${(metrics.memory.usedMb / 1024).toFixed(1)}GB / ${(metrics.memory.totalMb / 1024).toFixed(1)}GB (${metrics.memory.percent}%)`
                  : '--'}
              </span>
            </div>
            <div className="w-full bg-void-base h-1.5 rounded-pills overflow-hidden border border-white/5">
              <div
                className="h-full rounded-pills transition-all duration-300 bg-gradient-to-r from-cyan-500 to-electric-cyan"
                style={{ width: `${Math.min(metrics?.memory?.percent || 0, 100)}%` }}
              />
            </div>
          </div>

          {/* Disk Progress */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono mb-1">
              <span className="text-fog-text flex items-center gap-1">
                <HardDrive className="w-3 h-3 text-electric-cyan" />
                Disco (/)
              </span>
              <span className="text-ash-text">
                {metrics?.primaryDisk
                  ? `${metrics.primaryDisk.used} / ${metrics.primaryDisk.size} (${metrics.primaryDisk.percent}%)`
                  : '--'}
              </span>
            </div>
            <div className="w-full bg-void-base h-1.5 rounded-pills overflow-hidden border border-white/5">
              <div
                className="h-full rounded-pills transition-all duration-300 bg-gradient-to-r from-blue-500 to-cyan-400"
                style={{ width: `${Math.min(metrics?.primaryDisk?.percent || 0, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Error preview if offline */}
        {isOffline && server.lastError && (
          <div className="mt-2.5 p-2 rounded-inputs bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-rose-400" />
            <span className="truncate">{server.lastError}</span>
          </div>
        )}
      </div>

      {/* Action Buttons Toolbar: High-Density & Functional */}
      <div className="mt-4 pt-3 border-t border-border-smoke/60 flex flex-col gap-2">
        {/* Row 1: Primary Connect & Web/Mac */}
        <div className="flex items-center gap-2">
          {/* Web Terminal */}
          <button
            onClick={() => onConnectWeb(server)}
            className="btn-cyan-primary flex-1 py-1.5 px-3 text-xs"
            title="Abrir consola terminal interactiva"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Conectar</span>
            <ArrowRight className="w-3 h-3 opacity-80" />
          </button>

          {/* Web Browser button (if web detected) or Mac Terminal */}
          {hasWeb ? (
            <a
              href={webUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-cyan-secondary py-1.5 px-3 text-xs text-emerald-300 border-emerald-500/40 hover:border-emerald-400"
              title="Abrir web en el navegador"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>Web</span>
            </a>
          ) : (
            <button
              onClick={openMacTerminal}
              title="Lanzar en Terminal nativo de macOS"
              className="btn-cyan-secondary py-1.5 px-3 text-xs"
            >
              <ExternalLink className="w-3.5 h-3.5 text-electric-cyan" />
              <span>Mac</span>
            </button>
          )}
        </div>

        {/* Row 2: Secondary Quick Tools (Files, Docker, Specs) */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => onOpenFiles(server)}
            className="btn-cyan-secondary py-1 px-2 text-[11px] font-mono justify-center"
            title="Gestor de archivos SFTP"
          >
            <FolderOpen className="w-3 h-3 text-electric-cyan" />
            <span>Archivos</span>
          </button>

          <button
            onClick={() => onOpenDocker(server)}
            className="btn-cyan-secondary py-1 px-2 text-[11px] font-mono justify-center"
            title="Gestionar contenedores Docker"
          >
            <Box className="w-3 h-3 text-blue-400" />
            <span>Docker</span>
          </button>

          <button
            onClick={() => onOpenDetails(server)}
            className="btn-cyan-secondary py-1 px-2 text-[11px] font-mono justify-center"
            title="Ver servicios y telemetría completa"
          >
            <Sliders className="w-3 h-3 text-fog-text" />
            <span>Servicios</span>
          </button>
        </div>
      </div>
    </div>
  );
}

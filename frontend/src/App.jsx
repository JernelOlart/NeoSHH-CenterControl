import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import StatsSummary from './components/StatsSummary';
import ServerCard from './components/ServerCard';
import ServerModal from './components/ServerModal';
import TerminalModal from './components/TerminalModal';
import MetricsDetailModal from './components/MetricsDetailModal';
import FileManagerModal from './components/FileManagerModal';
import DockerManagerModal from './components/DockerManagerModal';
import GitManagerModal from './components/GitManagerModal';
import FirewallModal from './components/FirewallModal';
import LiveMetricsModal from './components/LiveMetricsModal';
import CommandRunnerModal from './components/CommandRunnerModal';
import SystemdModal from './components/SystemdModal';
import LiveLogsModal from './components/LiveLogsModal';
import CronModal from './components/CronModal';
import PackageManagerModal from './components/PackageManagerModal';
import NetworkModal from './components/NetworkModal';
import DockerComposeModal from './components/DockerComposeModal';
import DockerStatsModal from './components/DockerStatsModal';
import NginxModal from './components/NginxModal';
import NotesModal from './components/NotesModal';
import AlertsPanel from './components/AlertsPanel';
import EnvManagerModal from './components/EnvManagerModal';
import {
  fetchServers,
  createServer,
  updateServer,
  deleteServer,
  refreshServer,
  refreshAllServers,
  saveServerNotes
} from './services/api';
import { Server, Plus, RefreshCw, Terminal, ArrowRight, Globe, Github, ExternalLink } from 'lucide-react';

export default function App() {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  // Modals state
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState(null);
  const [detailsServer, setDetailsServer] = useState(null);
  const [filesServer, setFilesServer] = useState(null);
  const [dockerServer, setDockerServer] = useState(null);
  const [gitServer, setGitServer] = useState(null);
  const [firewallServer, setFirewallServer] = useState(null);
  const [liveMetricsServer, setLiveMetricsServer] = useState(null);
  const [commandServer, setCommandServer] = useState(null);
  const [systemdServer, setSystemdServer] = useState(null);
  const [logsServer, setLogsServer] = useState(null);
  const [cronServer, setCronServer] = useState(null);
  const [packagesServer, setPackagesServer] = useState(null);
  const [networkServer, setNetworkServer] = useState(null);
  const [composeServer, setComposeServer] = useState(null);
  const [dockerStatsServer, setDockerStatsServer] = useState(null);
  const [nginxServer, setNginxServer] = useState(null);
  const [notesServer, setNotesServer] = useState(null);
  const [envServer, setEnvServer] = useState(null);

  // Terminal Tabs state
  const [activeSessions, setActiveSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);

  // Refresh tracking
  const [refreshingIds, setRefreshingIds] = useState(new Set());
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);

  const loadServers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchServers();
      setServers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServers();
  }, []);

  const allTags = Array.from(
    new Set(servers.flatMap((s) => s.tags || []).filter(Boolean))
  );

  const handleSaveServer = async (serverData) => {
    if (editingServer) {
      const updated = await updateServer(editingServer.id, serverData);
      setServers((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } else {
      const created = await createServer(serverData);
      setServers((prev) => [...prev, created]);
      handleRefreshServer(created.id);
    }
  };

  const handleDeleteServer = async (id) => {
    if (!window.confirm('¿Deseas eliminar este servidor VPS del inventario?')) {
      return;
    }
    try {
      await deleteServer(id);
      setServers((prev) => prev.filter((s) => s.id !== id));
      handleCloseTerminalTab(id);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRefreshServer = async (id) => {
    setRefreshingIds((prev) => new Set(prev).add(id));
    try {
      const updated = await refreshServer(id);
      setServers((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      if (detailsServer && detailsServer.id === id) {
        setDetailsServer(updated);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleRefreshAll = async () => {
    setIsRefreshingAll(true);
    try {
      const updated = await refreshAllServers();
      setServers(updated);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsRefreshingAll(false);
    }
  };

  // Terminal Tab Management
  const handleConnectWeb = (server) => {
    setActiveSessions((prev) => {
      const exists = prev.some((s) => s.id === server.id);
      if (!exists) {
        return [...prev, server];
      }
      return prev;
    });
    setActiveSessionId(server.id);
  };

  const handleCloseTerminalTab = (serverId) => {
    setActiveSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== serverId);
      if (activeSessionId === serverId) {
        setActiveSessionId(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
      }
      return remaining;
    });
  };

  const handleCloseAllTerminals = () => {
    setActiveSessions([]);
    setActiveSessionId(null);
  };

  const filteredServers = servers.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.host.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.provider && s.provider.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.tags && s.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase())));

    const matchesTag = selectedTag ? s.tags?.includes(selectedTag) : true;
    return matchesSearch && matchesTag;
  });

  return (
    <div className="min-h-screen bg-void-base text-ash-text flex flex-col font-sans relative selection:bg-electric-cyan/30 selection:text-cloud-white">
      {/* Sticky Top Nav */}
      <Navbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedTag={selectedTag}
        setSelectedTag={setSelectedTag}
        allTags={allTags}
        onAddServer={() => {
          setEditingServer(null);
          setIsServerModalOpen(true);
        }}
        onRefreshAll={handleRefreshAll}
        isRefreshingAll={isRefreshingAll}
      />

      {/* Main Container - Compact & Space-Efficient */}
      <main className="flex-1 max-w-[1240px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Compact Hero Banner (Space-efficient, no huge empty areas) */}
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-smoke/60 pb-3">
          <div>
            <h1 className="font-sans text-xl sm:text-2xl text-cloud-white font-medium tracking-tight">
              Panel de Servidores VPS
            </h1>
            <p className="text-xs text-fog-text mt-0.5">
              Supervisión de hardware, terminal SSH, gestor de archivos SFTP y contenedores Docker
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditingServer(null);
                setIsServerModalOpen(true);
              }}
              className="btn-cyan-primary px-3.5 py-1.5 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo VPS</span>
              <ArrowRight className="w-3 h-3 opacity-80" />
            </button>
            <button
              onClick={handleRefreshAll}
              disabled={isRefreshingAll}
              className="btn-cyan-secondary px-3.5 py-1.5 text-xs disabled:opacity-40"
              title="Actualizar métricas de todos los VPS"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingAll ? 'animate-spin text-electric-cyan' : ''}`} />
              <span className="hidden sm:inline">Refrescar</span>
            </button>
          </div>
        </div>

        {/* Stats Summary Row (Compact) */}
        {servers.length > 0 && <StatsSummary servers={servers} />}

        {/* Content State: Cards or Empty State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-fog-text">
            <RefreshCw className="w-8 h-8 animate-spin text-electric-cyan mb-3" />
            <p className="text-xs font-mono">Cargando catálogo de servidores...</p>
          </div>
        ) : error ? (
          <div className="bg-elevated-surface rounded-cards p-6 text-center border border-border-smoke max-w-lg mx-auto">
            <h3 className="text-sm font-medium text-cloud-white">Error de comunicación</h3>
            <p className="text-xs font-mono text-fog-text mt-1">{error}</p>
            <button
              onClick={loadServers}
              className="mt-4 btn-cyan-primary px-4 py-1.5 text-xs"
            >
              Reintentar
            </button>
          </div>
        ) : servers.length === 0 ? (
          /* Empty State */
          <div className="bg-deep-panel rounded-cards-lg p-8 sm:p-12 text-center max-w-lg mx-auto my-6 border border-border-smoke/70 card-inset-glow">
            <div className="w-12 h-12 rounded-nodes bg-white/5 border border-electric-cyan/30 flex items-center justify-center mx-auto mb-3 text-electric-cyan shadow-[0_0_16px_rgba(23,186,237,0.25)]">
              <Server className="w-6 h-6" />
            </div>
            <h2 className="font-sans text-xl text-cloud-white font-medium">
              No tienes servidores registrados
            </h2>
            <p className="text-fog-text text-xs mt-2 leading-relaxed max-w-sm mx-auto">
              Agrega tu primer servidor VPS para acceder a la terminal con 1 clic, explorar archivos SFTP, ver contenedores Docker y servicios montados.
            </p>
            <button
              onClick={() => {
                setEditingServer(null);
                setIsServerModalOpen(true);
              }}
              className="mt-5 btn-cyan-primary inline-flex items-center gap-2 px-5 py-2 text-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar mi primer VPS</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-80" />
            </button>
          </div>
        ) : filteredServers.length === 0 ? (
          <div className="text-center py-12 text-fog-text font-mono text-xs">
            No se encontraron servidores que coincidan con la búsqueda.
          </div>
        ) : (
          /* High-Density Responsive Cards Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {filteredServers.map((server) => (
              <ServerCard
                key={server.id}
                server={server}
                onConnectWeb={handleConnectWeb}
                onOpenDetails={setDetailsServer}
                onOpenFiles={setFilesServer}
                onOpenDocker={setDockerServer}
                onOpenGit={setGitServer}
                onOpenFirewall={setFirewallServer}
                onOpenLiveMetrics={setLiveMetricsServer}
                onOpenCommandRunner={setCommandServer}
                onOpenSystemd={setSystemdServer}
                onOpenLogs={setLogsServer}
                onOpenCron={setCronServer}
                onOpenPackages={setPackagesServer}
                onOpenNetwork={setNetworkServer}
                onOpenCompose={setComposeServer}
                onOpenDockerStats={setDockerStatsServer}
                onOpenNginx={setNginxServer}
                onOpenNotes={setNotesServer}
                onOpenEnv={setEnvServer}
                onEdit={(s) => {
                  setEditingServer(s);
                  setIsServerModalOpen(true);
                }}
                onDelete={handleDeleteServer}
                onRefresh={handleRefreshServer}
                isRefreshing={refreshingIds.has(server.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer & Credits */}
      <footer className="w-full mt-auto py-5 px-4 sm:px-6 lg:px-8 border-t border-border-smoke/60 bg-void-base">
        <div className="max-w-[1240px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Brand info */}
          <div className="flex flex-col sm:flex-row items-center gap-2 text-[11px] font-mono text-fog-text text-center sm:text-left">
            <div className="flex items-center gap-2">
              <span className="text-cloud-white font-semibold">NeoShh Control</span>
              <span>•</span>
              <span className="text-electric-cyan">VPS Command Center</span>
            </div>
            <span className="hidden sm:inline">•</span>
            <div>Terminal SSH • SFTP • Docker • Git • Firewall UFW</div>
          </div>

          {/* Credit Buttons */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <span className="text-[11px] font-mono text-fog-text mr-1">Créditos:</span>

            {/* Jernel Systems */}
            <a
              href="https://www.jernelsystems.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-cyan-secondary px-3 py-1.5 text-xs font-mono inline-flex items-center gap-1.5 hover:border-electric-cyan/60 hover:text-cloud-white transition group"
              title="Visitar www.jernelsystems.com"
            >
              <Globe className="w-3.5 h-3.5 text-electric-cyan group-hover:scale-110 transition-transform" />
              <span>jernelsystems.com</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </a>

            {/* Neotech Solutions */}
            <a
              href="https://neotechsolutions.mx"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-cyan-secondary px-3 py-1.5 text-xs font-mono inline-flex items-center gap-1.5 hover:border-electric-cyan/60 hover:text-cloud-white transition group"
              title="Visitar neotechsolutions.mx"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span>neotechsolutions.mx</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </a>

            {/* GitHub JernelOlart */}
            <a
              href="https://github.com/JernelOlart"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-cyan-secondary px-3 py-1.5 text-xs font-mono inline-flex items-center gap-1.5 hover:border-electric-cyan/60 hover:text-cloud-white transition group"
              title="GitHub @JernelOlart"
            >
              <Github className="w-3.5 h-3.5 text-electric-cyan group-hover:scale-110 transition-transform" />
              <span>@JernelOlart</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </a>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <ServerModal
        isOpen={isServerModalOpen}
        onClose={() => {
          setIsServerModalOpen(false);
          setEditingServer(null);
        }}
        onSave={handleSaveServer}
        editingServer={editingServer}
      />

      <MetricsDetailModal
        server={detailsServer}
        isOpen={Boolean(detailsServer)}
        onClose={() => setDetailsServer(null)}
        onConnectWeb={handleConnectWeb}
        onRefresh={handleRefreshServer}
        isRefreshing={detailsServer ? refreshingIds.has(detailsServer.id) : false}
      />

      <FileManagerModal
        server={filesServer}
        isOpen={Boolean(filesServer)}
        onClose={() => setFilesServer(null)}
      />

      <DockerManagerModal
        server={dockerServer}
        isOpen={Boolean(dockerServer)}
        onClose={() => setDockerServer(null)}
        onOpenTerminal={handleConnectWeb}
      />

      <GitManagerModal
        server={gitServer}
        isOpen={Boolean(gitServer)}
        onClose={() => setGitServer(null)}
      />

      <FirewallModal
        server={firewallServer}
        isOpen={Boolean(firewallServer)}
        onClose={() => setFirewallServer(null)}
      />

      <LiveMetricsModal
        server={liveMetricsServer}
        isOpen={Boolean(liveMetricsServer)}
        onClose={() => setLiveMetricsServer(null)}
      />

      <CommandRunnerModal
        server={commandServer}
        isOpen={Boolean(commandServer)}
        onClose={() => setCommandServer(null)}
      />

      <SystemdModal
        server={systemdServer}
        isOpen={Boolean(systemdServer)}
        onClose={() => setSystemdServer(null)}
      />

      <LiveLogsModal
        server={logsServer}
        isOpen={Boolean(logsServer)}
        onClose={() => setLogsServer(null)}
      />

      <CronModal
        server={cronServer}
        isOpen={Boolean(cronServer)}
        onClose={() => setCronServer(null)}
      />

      <PackageManagerModal
        server={packagesServer}
        isOpen={Boolean(packagesServer)}
        onClose={() => setPackagesServer(null)}
      />

      <NetworkModal
        server={networkServer}
        isOpen={Boolean(networkServer)}
        onClose={() => setNetworkServer(null)}
      />

      <DockerComposeModal
        server={composeServer}
        isOpen={Boolean(composeServer)}
        onClose={() => setComposeServer(null)}
      />

      <DockerStatsModal
        server={dockerStatsServer}
        isOpen={Boolean(dockerStatsServer)}
        onClose={() => setDockerStatsServer(null)}
      />

      <NginxModal
        server={nginxServer}
        isOpen={Boolean(nginxServer)}
        onClose={() => setNginxServer(null)}
      />

      <NotesModal
        server={notesServer}
        isOpen={Boolean(notesServer)}
        onClose={() => setNotesServer(null)}
        onSave={async (id, notes) => {
          try {
            await saveServerNotes(id, notes);
            setServers(prev => prev.map(s => s.id === id ? { ...s, notes } : s));
          } catch (e) {
            alert(e.message);
          }
        }}
      />

      <EnvManagerModal
        server={envServer}
        isOpen={Boolean(envServer)}
        onClose={() => setEnvServer(null)}
      />

      {/* Floating System Alerts (offline, disk >80%, RAM >90%) */}
      <AlertsPanel servers={servers} />

      <TerminalModal
        activeSessions={activeSessions}
        activeSessionId={activeSessionId}
        onSelectTab={setActiveSessionId}
        onCloseTab={handleCloseTerminalTab}
        onCloseAll={handleCloseAllTerminals}
      />
    </div>
  );
}

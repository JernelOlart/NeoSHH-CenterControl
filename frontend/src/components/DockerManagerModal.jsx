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
  Plus,
  Trash2,
  FileText,
  ArrowRight,
  Layers,
  CheckCircle2
} from 'lucide-react';
import {
  fetchDockerContainers,
  dockerAction,
  fetchDockerLogs,
  runDockerContainer,
  removeDockerContainer
} from '../services/api';

export default function DockerManagerModal({ server, isOpen, onClose, onOpenTerminal }) {
  const [tab, setTab] = useState('list'); // 'list' | 'run' | 'logs'
  const [containers, setContainers] = useState([]);
  const [hasDocker, setHasDocker] = useState(true);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState(null);

  // Logs state
  const [selectedContainerLogs, setSelectedContainerLogs] = useState(null);
  const [logsText, setLogsText] = useState('');
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Run container form state
  const [runForm, setRunForm] = useState({
    image: '',
    name: '',
    ports: '',
    env: '',
    restartPolicy: 'unless-stopped'
  });
  const [runLoading, setRunLoading] = useState(false);
  const [runSuccess, setRunSuccess] = useState(null);

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
      setTab('list');
      setSelectedContainerLogs(null);
      setLogsText('');
      setRunSuccess(null);
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

  const handleRemove = async (containerId, containerName) => {
    if (!window.confirm(`¿Seguro que deseas eliminar el contenedor "${containerName || containerId}"?`)) {
      return;
    }
    setActionLoading((prev) => ({ ...prev, [containerId]: 'remove' }));
    try {
      await removeDockerContainer(server.id, containerId);
      await loadContainers();
    } catch (err) {
      alert(`Error al eliminar contenedor: ${err.message}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [containerId]: null }));
    }
  };

  const handleOpenLogs = async (container) => {
    setSelectedContainerLogs(container);
    setTab('logs');
    setLoadingLogs(true);
    try {
      const data = await fetchDockerLogs(server.id, container.id);
      setLogsText(data.logs || 'Sin registros recientes.');
    } catch (err) {
      setLogsText(`Error al obtener logs: ${err.message}`);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleRunSubmit = async (e) => {
    e.preventDefault();
    if (!runForm.image.trim()) {
      alert('Debes indicar la imagen de Docker (ej: nginx:alpine)');
      return;
    }
    setRunLoading(true);
    setRunSuccess(null);
    try {
      const res = await runDockerContainer(server.id, runForm);
      setRunSuccess(`Contenedor iniciado correctamente: ${res.output?.slice(0, 12) || 'OK'}`);
      setRunForm({
        image: '',
        name: '',
        ports: '',
        env: '',
        restartPolicy: 'unless-stopped'
      });
      await loadContainers();
      setTimeout(() => {
        setTab('list');
        setRunSuccess(null);
      }, 1500);
    } catch (err) {
      alert(`Error al correr contenedor: ${err.message}`);
    } finally {
      setRunLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-void-base/85 backdrop-blur-sm">
      <div className="bg-elevated-surface rounded-cards-lg w-full max-w-3xl border border-border-smoke flex flex-col max-h-[88vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-border-smoke/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-nodes bg-white/5 border border-electric-cyan/30 flex items-center justify-center text-electric-cyan shadow-[0_0_10px_rgba(23,186,237,0.2)]">
              <Box className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-medium text-cloud-white">
                  Gestor de Contenedores Docker
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-pills bg-white/5 border border-white/10 text-electric-cyan">
                  {server.name}
                </span>
              </div>
              <p className="text-xs font-mono text-fog-text">
                Monitorea, inicia, detén, crea y analiza logs de tus contenedores
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

        {/* Navigation Tabs */}
        {hasDocker && (
          <div className="flex border-b border-border-smoke/70 bg-deep-panel px-4 gap-2 pt-2 text-xs font-mono">
            <button
              onClick={() => setTab('list')}
              className={`pb-2.5 px-3 border-b-2 flex items-center gap-2 transition ${
                tab === 'list'
                  ? 'border-electric-cyan text-electric-cyan font-semibold'
                  : 'border-transparent text-fog-text hover:text-cloud-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Contenedores ({containers.length})</span>
            </button>

            <button
              onClick={() => setTab('run')}
              className={`pb-2.5 px-3 border-b-2 flex items-center gap-2 transition ${
                tab === 'run'
                  ? 'border-electric-cyan text-electric-cyan font-semibold'
                  : 'border-transparent text-fog-text hover:text-cloud-white'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Lanzar Contenedor</span>
            </button>

            {selectedContainerLogs && (
              <button
                onClick={() => setTab('logs')}
                className={`pb-2.5 px-3 border-b-2 flex items-center gap-2 transition ${
                  tab === 'logs'
                    ? 'border-electric-cyan text-electric-cyan font-semibold'
                    : 'border-transparent text-fog-text hover:text-cloud-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Logs ({selectedContainerLogs.names || selectedContainerLogs.id.slice(0, 8)})</span>
              </button>
            )}
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {loading && tab === 'list' ? (
            <div className="flex items-center justify-center py-16 text-fog-text gap-2 text-xs font-mono">
              <RefreshCw className="w-4 h-4 animate-spin text-electric-cyan" />
              <span>Consultando contenedores Docker en el servidor...</span>
            </div>
          ) : !hasDocker ? (
            <div className="p-6 text-center rounded-cards bg-deep-panel border border-border-smoke/60">
              <AlertCircle className="w-10 h-10 text-fog-text mx-auto mb-2 opacity-60" />
              <h3 className="text-sm font-medium text-cloud-white">Docker no detectado</h3>
              <p className="text-xs text-fog-text mt-1 max-w-md mx-auto">
                No se detectó el motor Docker en este servidor VPS o el usuario configurado carece de permisos para acceder a docker.sock.
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
          ) : tab === 'list' ? (
            containers.length === 0 ? (
              <div className="text-center py-12 text-fog-text text-xs font-mono">
                <Box className="w-8 h-8 mx-auto mb-2 opacity-40 text-electric-cyan" />
                <p>No hay contenedores registrados en este servidor.</p>
                <button
                  onClick={() => setTab('run')}
                  className="mt-4 btn-cyan-primary px-4 py-1.5 text-xs inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Crear mi primer contenedor</span>
                </button>
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
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-pills bg-white/5 border border-white/10 text-fog-text truncate max-w-[200px]" title={c.image}>
                            {c.image}
                          </span>
                        </div>

                        <div className="mt-1 flex items-center gap-3 text-[11px] font-mono text-fog-text flex-wrap">
                          <span className="text-ash-text">{c.status}</span>
                          {c.ports && (
                            <span className="text-electric-cyan truncate max-w-[240px]" title={c.ports}>
                              {c.ports}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 flex-shrink-0 self-end sm:self-center flex-wrap">
                        {/* Logs */}
                        <button
                          onClick={() => handleOpenLogs(c)}
                          className="btn-cyan-secondary px-2.5 py-1.5 text-xs text-ash-text hover:text-cloud-white"
                          title="Ver logs en vivo"
                        >
                          <FileText className="w-3 h-3 text-electric-cyan" />
                          <span className="hidden sm:inline">Logs</span>
                        </button>

                        {/* Start/Stop */}
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

                        {/* Restart */}
                        <button
                          onClick={() => handleAction(c.id, 'restart')}
                          disabled={isBusy}
                          className="btn-cyan-secondary px-2.5 py-1.5 text-xs"
                          title="Reiniciar contenedor"
                        >
                          <RotateCw className={`w-3 h-3 ${isBusy ? 'animate-spin text-electric-cyan' : ''}`} />
                          <span className="hidden sm:inline">Reiniciar</span>
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleRemove(c.id, c.names)}
                          disabled={isBusy}
                          className="p-1.5 rounded-pills text-fog-text hover:text-rose-400 hover:bg-rose-500/10 transition"
                          title="Eliminar contenedor"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : tab === 'run' ? (
            /* Run Form */
            <form onSubmit={handleRunSubmit} className="p-4 rounded-cards bg-deep-panel border border-border-smoke/60 space-y-4">
              <div className="flex items-center gap-2 text-cloud-white text-sm font-medium">
                <Box className="w-4 h-4 text-electric-cyan" />
                <span>Desplegar nuevo contenedor Docker</span>
              </div>

              {runSuccess && (
                <div className="p-3 rounded-inputs bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-mono flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{runSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-fog-text mb-1">
                    Imagen de Docker * (ej: nginx:alpine, redis:latest)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="nginx:alpine"
                    value={runForm.image}
                    onChange={(e) => setRunForm({ ...runForm, image: e.target.value })}
                    className="w-full bg-void-base border border-border-smoke rounded-inputs px-3 py-2 text-xs font-mono text-cloud-white focus:outline-none focus:border-electric-cyan"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-fog-text mb-1">
                    Nombre del contenedor (opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="mi-app-web"
                    value={runForm.name}
                    onChange={(e) => setRunForm({ ...runForm, name: e.target.value })}
                    className="w-full bg-void-base border border-border-smoke rounded-inputs px-3 py-2 text-xs font-mono text-cloud-white focus:outline-none focus:border-electric-cyan"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-fog-text mb-1">
                    Mapeo de Puertos (ej: 8080:80)
                  </label>
                  <input
                    type="text"
                    placeholder="8080:80"
                    value={runForm.ports}
                    onChange={(e) => setRunForm({ ...runForm, ports: e.target.value })}
                    className="w-full bg-void-base border border-border-smoke rounded-inputs px-3 py-2 text-xs font-mono text-cloud-white focus:outline-none focus:border-electric-cyan"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-fog-text mb-1">
                    Restart Policy
                  </label>
                  <select
                    value={runForm.restartPolicy}
                    onChange={(e) => setRunForm({ ...runForm, restartPolicy: e.target.value })}
                    className="w-full bg-void-base border border-border-smoke rounded-inputs px-3 py-2 text-xs font-mono text-cloud-white focus:outline-none focus:border-electric-cyan"
                  >
                    <option value="unless-stopped">unless-stopped</option>
                    <option value="always">always</option>
                    <option value="on-failure">on-failure</option>
                    <option value="no">no</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-fog-text mb-1">
                  Variables de entorno (ej: NODE_ENV=production,PORT=3000)
                </label>
                <input
                  type="text"
                  placeholder="ENV_VAR=valor,OTRA=123"
                  value={runForm.env}
                  onChange={(e) => setRunForm({ ...runForm, env: e.target.value })}
                  className="w-full bg-void-base border border-border-smoke rounded-inputs px-3 py-2 text-xs font-mono text-cloud-white focus:outline-none focus:border-electric-cyan"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTab('list')}
                  className="btn-cyan-secondary px-4 py-2 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={runLoading}
                  className="btn-cyan-primary px-5 py-2 text-xs inline-flex items-center gap-2"
                >
                  {runLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  <span>{runLoading ? 'Lanzando...' : 'Lanzar Contenedor'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* Logs View */
            <div className="flex flex-col h-full space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-fog-text">
                <div className="flex items-center gap-2">
                  <span className="text-cloud-white font-medium">{selectedContainerLogs?.names || selectedContainerLogs?.id}</span>
                  <span>•</span>
                  <span>Últimas 100 líneas</span>
                </div>
                <button
                  onClick={() => handleOpenLogs(selectedContainerLogs)}
                  disabled={loadingLogs}
                  className="btn-cyan-secondary px-2.5 py-1 text-xs inline-flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingLogs ? 'animate-spin text-electric-cyan' : ''}`} />
                  <span>Refrescar</span>
                </button>
              </div>

              <div className="bg-void-base border border-border-smoke rounded-cards p-3 font-mono text-[11px] text-cloud-white max-h-[400px] overflow-y-auto whitespace-pre leading-relaxed select-text">
                {loadingLogs ? 'Cargando logs...' : logsText}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

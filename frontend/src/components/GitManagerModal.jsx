import React, { useState, useEffect } from 'react';
import {
  X,
  GitBranch,
  GitPullRequest,
  Download,
  FolderGit2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  GitCommit,
  Archive,
  Zap,
  RotateCcw,
  Copy,
  Check,
  Play,
  Terminal,
  AlertTriangle,
  FolderOpen,
  Tag
} from 'lucide-react';
import {
  detectGitRepos,
  fetchGitStatus,
  gitPull,
  gitClone,
  downloadRepoZip,
  gitCheckout,
  gitFetch,
  gitReset,
  gitStash,
  fetchWebhookConfig,
  saveWebhookConfig,
  regenerateWebhookToken,
  triggerManualDeploy
} from '../services/api';

export default function GitManagerModal({ server, isOpen, onClose }) {
  const [tab, setTab] = useState('repos'); // 'repos' | 'webhook' | 'clone'
  const [detectedRepos, setDetectedRepos] = useState([]);
  const [selectedRepoPath, setSelectedRepoPath] = useState('');
  const [customPath, setCustomPath] = useState('');
  const [repoStatus, setRepoStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // 'pull' | 'fetch' | 'checkout' | 'reset' | 'stash'
  const [downloading, setDownloading] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [statusMessageType, setStatusMessageType] = useState('info'); // 'info' | 'success' | 'error'
  const [error, setError] = useState(null);

  // Branch switcher
  const [targetBranch, setTargetBranch] = useState('');
  const [isCustomTarget, setIsCustomTarget] = useState(false);

  // Clone form
  const [repoUrl, setRepoUrl] = useState('');
  const [targetDir, setTargetDir] = useState('/var/www/');
  const [branch, setBranch] = useState('');

  // Webhook CI/CD Tab States
  const [webhookConfig, setWebhookConfig] = useState(null);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookSaving, setWebhookSaving] = useState(false);
  const [webhookDeploying, setWebhookDeploying] = useState(false);
  const [webhookCopied, setWebhookCopied] = useState(false);
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [webhookBranch, setWebhookBranch] = useState('main');
  const [webhookRepoPath, setWebhookRepoPath] = useState('');
  const [webhookScript, setWebhookScript] = useState('');
  const [webhookDeployOutput, setWebhookDeployOutput] = useState('');
  const [copiedHash, setCopiedHash] = useState(null);

  const loadRepos = async () => {
    if (!server) return;
    setLoading(true);
    setError(null);
    try {
      const data = await detectGitRepos(server.id);
      setDetectedRepos(data.repos || []);
      if (data.repos?.length > 0) {
        const initial = selectedRepoPath || data.repos[0];
        setSelectedRepoPath(initial);
        loadRepoInfo(initial);
      }
    } catch (err) {
      setError(err.message || 'Error al buscar repositorios');
    } finally {
      setLoading(false);
    }
  };

  const loadRepoInfo = async (path) => {
    if (!path) return;
    setLoading(true);
    setError(null);
    setStatusMessage(null);
    try {
      const data = await fetchGitStatus(server.id, path);
      setRepoStatus(data);
      if (data.branch) {
        setTargetBranch(data.branch);
      }
    } catch (err) {
      setError(err.message || 'Error al consultar repositorio');
      setRepoStatus(null);
    } finally {
      setLoading(false);
    }
  };

  // Webhook loader
  const loadWebhookConfig = async () => {
    if (!server) return;
    setWebhookLoading(true);
    try {
      const data = await fetchWebhookConfig(server.id);
      setWebhookConfig(data);
      setWebhookEnabled(Boolean(data.enabled));
      setWebhookBranch(data.branch || 'main');
      setWebhookRepoPath(data.repoPath || selectedRepoPath || '');
      setWebhookScript(data.script || '');
    } catch (err) {
      console.error('Error al cargar webhook:', err);
    } finally {
      setWebhookLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && server) {
      loadRepos();
      setStatusMessage(null);
    }
  }, [isOpen, server?.id]);

  useEffect(() => {
    if (tab === 'webhook' && server) {
      loadWebhookConfig();
    }
  }, [tab, server?.id]);

  if (!isOpen || !server) return null;

  const handleSelectRepo = (path) => {
    setSelectedRepoPath(path);
    loadRepoInfo(path);
  };

  const handleCustomPathSubmit = (e) => {
    e.preventDefault();
    if (customPath.trim()) {
      setSelectedRepoPath(customPath.trim());
      loadRepoInfo(customPath.trim());
    }
  };

  // Git Actions
  const handlePull = async () => {
    if (!selectedRepoPath) return;
    setActionLoading('pull');
    setStatusMessage(null);
    try {
      const res = await gitPull(server.id, selectedRepoPath);
      setStatusMessageType(res.success ? 'success' : 'error');
      setStatusMessage(res.output || 'Git pull completado');
      await loadRepoInfo(selectedRepoPath);
    } catch (err) {
      setStatusMessageType('error');
      setStatusMessage(`Error en git pull: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleFetch = async () => {
    if (!selectedRepoPath) return;
    setActionLoading('fetch');
    setStatusMessage(null);
    try {
      const res = await gitFetch(server.id, selectedRepoPath);
      setStatusMessageType('success');
      setStatusMessage(res.output || 'Referencias remotas sincronizadas (git fetch --all)');
      await loadRepoInfo(selectedRepoPath);
    } catch (err) {
      setStatusMessageType('error');
      setStatusMessage(`Error en git fetch: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCheckout = async (target) => {
    const branchToCheckout = target || targetBranch;
    if (!selectedRepoPath || !branchToCheckout) return;
    setActionLoading('checkout');
    setStatusMessage(null);
    try {
      const res = await gitCheckout(server.id, selectedRepoPath, branchToCheckout);
      setStatusMessageType(res.success ? 'success' : 'error');
      setStatusMessage(res.output || `Cambiado exitosamente a: ${branchToCheckout}`);
      await loadRepoInfo(selectedRepoPath);
    } catch (err) {
      setStatusMessageType('error');
      setStatusMessage(`Error al cambiar a ${branchToCheckout}: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetHard = async () => {
    if (!selectedRepoPath) return;
    if (!window.confirm('¿Estás seguro de descartar TODOS los cambios locales no commiteados? (git reset --hard HEAD && git clean -fd) Esta acción no se puede deshacer.')) {
      return;
    }
    setActionLoading('reset');
    setStatusMessage(null);
    try {
      const res = await gitReset(server.id, selectedRepoPath);
      setStatusMessageType('success');
      setStatusMessage(res.output || 'Árbol de trabajo limpiado con éxito');
      await loadRepoInfo(selectedRepoPath);
    } catch (err) {
      setStatusMessageType('error');
      setStatusMessage(`Error al descartar cambios: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStash = async (action = 'push') => {
    if (!selectedRepoPath) return;
    setActionLoading('stash');
    setStatusMessage(null);
    try {
      const res = await gitStash(server.id, selectedRepoPath, action);
      setStatusMessageType('success');
      setStatusMessage(res.output || `Git stash (${action}) completado`);
      await loadRepoInfo(selectedRepoPath);
    } catch (err) {
      setStatusMessageType('error');
      setStatusMessage(`Error en git stash: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadZip = async (repoPath = selectedRepoPath) => {
    if (!repoPath) return;
    setDownloading(true);
    try {
      await downloadRepoZip(server.id, repoPath);
    } catch (err) {
      alert(`Error al descargar repositorio: ${err.message}`);
    } finally {
      setDownloading(false);
    }
  };

  const handleClone = async (e) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;
    setCloning(true);
    setError(null);
    try {
      const res = await gitClone(server.id, {
        repoUrl: repoUrl.trim(),
        targetDir: targetDir.trim(),
        branch: branch.trim()
      });
      alert(res.output || 'Repositorio clonado con éxito');
      setTab('repos');
      await loadRepos();
    } catch (err) {
      setError(err.message || 'Error al clonar repositorio');
    } finally {
      setCloning(false);
    }
  };

  // Webhook handlers
  const handleSaveWebhook = async () => {
    setWebhookSaving(true);
    try {
      const updated = await saveWebhookConfig(server.id, {
        enabled: webhookEnabled,
        branch: webhookBranch,
        repoPath: webhookRepoPath,
        script: webhookScript
      });
      setWebhookConfig(updated.webhook);
      alert('Configuración de Webhook guardada exitosamente');
    } catch (err) {
      alert(`Error al guardar webhook: ${err.message}`);
    } finally {
      setWebhookSaving(false);
    }
  };

  const handleManualDeploy = async () => {
    setWebhookDeploying(true);
    setWebhookDeployOutput('Iniciando despliegue manual por SSH...\n');
    try {
      const res = await triggerManualDeploy(server.id, {
        branch: webhookBranch,
        repoPath: webhookRepoPath,
        script: webhookScript
      });
      const log = res.deployLog || res;
      setWebhookDeployOutput(
        `=== RESULTADO DEL DESPLIEGUE ===\n` +
        `Estado: ${log.status === 'success' ? 'EXITOSO' : 'FALLIDO'}\n` +
        `Duración: ${log.durationMs}ms\n` +
        `Rama: ${log.branch || webhookBranch}\n\n` +
        `--- SALIDA DEL SERVIDOR ---\n` +
        (log.output || log.error || 'Sin salida.')
      );
    } catch (err) {
      setWebhookDeployOutput(`Error al ejecutar despliegue: ${err.message}`);
    } finally {
      setWebhookDeploying(false);
    }
  };

  const handleCopyWebhookUrl = () => {
    if (!webhookConfig?.url) return;
    navigator.clipboard.writeText(webhookConfig.url);
    setWebhookCopied(true);
    setTimeout(() => setWebhookCopied(false), 2000);
  };

  const handleCopyHash = (hash) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 1500);
  };

  const goToWebhookWithRepo = () => {
    setWebhookRepoPath(selectedRepoPath);
    if (repoStatus?.branch) setWebhookBranch(repoStatus.branch);
    setTab('webhook');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-void-base/85 backdrop-blur-sm">
      <div className="bg-elevated-surface rounded-cards-lg w-full max-w-4xl border border-border-smoke flex flex-col h-[85vh] max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-border-smoke/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-nodes bg-white/5 border border-electric-cyan/30 flex items-center justify-center text-electric-cyan shadow-[0_0_10px_rgba(23,186,237,0.2)]">
              <FolderGit2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-medium text-cloud-white">
                  Control de Versiones (Git)
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-pills bg-white/5 border border-white/10 text-electric-cyan">
                  {server.name}
                </span>
              </div>
              <p className="text-xs font-mono text-fog-text">
                Gestión de ramas, commits, despliegue manual y Webhook CI/CD
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-pills hover:bg-muted-shell text-fog-text hover:text-cloud-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="bg-deep-panel px-4 py-2 border-b border-border-smoke/60 flex items-center gap-2">
          <button
            onClick={() => setTab('repos')}
            className={`px-3 py-1 text-xs font-mono rounded-pills transition flex items-center gap-1.5 ${
              tab === 'repos'
                ? 'bg-electric-cyan text-dark-teal font-semibold shadow-[0_0_10px_rgba(23,186,237,0.3)]'
                : 'text-fog-text hover:text-cloud-white'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Repositorios & Ramas</span>
          </button>

          <button
            onClick={() => setTab('webhook')}
            className={`px-3 py-1 text-xs font-mono rounded-pills transition flex items-center gap-1.5 ${
              tab === 'webhook'
                ? 'bg-electric-cyan text-dark-teal font-semibold shadow-[0_0_10px_rgba(23,186,237,0.3)]'
                : 'text-fog-text hover:text-cloud-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Auto-Deploy (CI/CD)</span>
          </button>

          <button
            onClick={() => setTab('clone')}
            className={`px-3 py-1 text-xs font-mono rounded-pills transition flex items-center gap-1.5 ${
              tab === 'clone'
                ? 'bg-electric-cyan text-dark-teal font-semibold shadow-[0_0_10px_rgba(23,186,237,0.3)]'
                : 'text-fog-text hover:text-cloud-white'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Clonar Repositorio</span>
          </button>
        </div>

        {/* Tab 1: Repositories & Branch Management */}
        {tab === 'repos' && (
          <div className="p-4 overflow-y-auto space-y-4">
            {/* Repo selector & custom path input */}
            <div className="space-y-2">
              <label className="block text-xs font-mono text-fog-text">
                Repositorios Detectados en el Servidor
              </label>

              {detectedRepos.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {detectedRepos.map((path) => (
                    <button
                      key={path}
                      onClick={() => handleSelectRepo(path)}
                      className={`px-3 py-1.5 rounded-pills text-xs font-mono border transition truncate max-w-[320px] ${
                        selectedRepoPath === path
                          ? 'bg-void-base border-electric-cyan text-cloud-white font-medium shadow-[0_0_8px_rgba(23,186,237,0.25)]'
                          : 'bg-deep-panel border-border-smoke/60 text-fog-text hover:text-ash-text'
                      }`}
                    >
                      {path}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-mono text-fog-text">No se detectaron carpetas .git automáticas.</p>
              )}

              {/* Custom path input */}
              <form onSubmit={handleCustomPathSubmit} className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="O escribe una ruta absoluta (ej: /var/www/mi-sitio)"
                  value={customPath}
                  onChange={(e) => setCustomPath(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-void-base border border-border-smoke rounded-pills text-xs font-mono text-ash-text focus:outline-none focus:border-electric-cyan/40"
                />
                <button type="submit" className="btn-cyan-secondary px-3 py-1.5 text-xs font-mono">
                  Explorar
                </button>
              </form>
            </div>

            {/* Selected Repo Details */}
            {loading ? (
              <div className="flex items-center justify-center py-12 text-fog-text gap-2 text-xs font-mono">
                <RefreshCw className="w-4 h-4 animate-spin text-electric-cyan" />
                <span>Consultando estado de Git y ramas...</span>
              </div>
            ) : error ? (
              <div className="p-3.5 rounded-cards bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono">
                {error}
              </div>
            ) : repoStatus && (
              <div className="space-y-3">
                {/* Branch Switcher & Quick Actions Card */}
                <div className="p-4 rounded-cards bg-deep-panel border border-border-smoke/70 space-y-3">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* Active Branch & Path */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <GitBranch className="w-4 h-4 text-electric-cyan" />
                        <span className="text-xs font-mono text-fog-text">Rama Activa:</span>
                        <span className="text-xs font-mono font-bold text-cloud-white bg-void-base px-2.5 py-0.5 rounded border border-electric-cyan/40 shadow-[0_0_8px_rgba(23,186,237,0.2)]">
                          {repoStatus.branch || 'HEAD desacoplado'}
                        </span>
                        {repoStatus.remoteUrl && (
                          <span className="text-[10px] font-mono text-ash-text bg-white/5 px-2 py-0.5 rounded truncate max-w-xs" title={repoStatus.remoteUrl}>
                            {repoStatus.remoteUrl}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-fog-text mt-1 truncate">
                        Ruta: {selectedRepoPath}
                      </p>
                    </div>

                    {/* Quick Git Operation Buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={handlePull}
                        disabled={actionLoading === 'pull'}
                        className="btn-cyan-primary px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5"
                        title="git pull origin (actualizar cambios)"
                      >
                        <Download className={`w-3.5 h-3.5 ${actionLoading === 'pull' ? 'animate-bounce' : ''}`} />
                        <span>{actionLoading === 'pull' ? 'Actualizando...' : 'Git Pull'}</span>
                      </button>

                      <button
                        onClick={handleFetch}
                        disabled={actionLoading === 'fetch'}
                        className="btn-cyan-secondary px-3 py-1.5 text-xs font-mono flex items-center gap-1.5"
                        title="git fetch --all --prune (sincronizar referencias remotas sin mergear)"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${actionLoading === 'fetch' ? 'animate-spin' : ''}`} />
                        <span>{actionLoading === 'fetch' ? 'Sincronizando...' : 'Git Fetch'}</span>
                      </button>

                      <button
                        onClick={() => handleDownloadZip(selectedRepoPath)}
                        disabled={downloading}
                        className="btn-cyan-secondary px-3 py-1.5 text-xs font-mono text-electric-cyan flex items-center gap-1.5 hover:border-electric-cyan/60"
                        title="Descargar código completo empaquetado en .zip"
                      >
                        <Archive className={`w-3.5 h-3.5 ${downloading ? 'animate-spin' : ''}`} />
                        <span>{downloading ? 'Empaquetando...' : 'Descargar ZIP'}</span>
                      </button>

                      <button
                        onClick={goToWebhookWithRepo}
                        className="btn-cyan-secondary px-3 py-1.5 text-xs font-mono text-amber-300 border-amber-500/30 hover:border-amber-500/60 flex items-center gap-1.5"
                        title="Configurar Auto-Deploy Webhook para este repositorio"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>Auto-Deploy</span>
                      </button>
                    </div>
                  </div>

                  {/* Switch Branch Bar */}
                  <div className="pt-2 border-t border-border-smoke/40 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <span className="text-xs font-mono text-fog-text flex items-center gap-1 flex-shrink-0">
                      <GitPullRequest className="w-3.5 h-3.5 text-electric-cyan" />
                      <span>Cambiar Rama:</span>
                    </span>

                    {!isCustomTarget && repoStatus.branches && repoStatus.branches.length > 0 ? (
                      <div className="flex-1 flex items-center gap-2">
                        <select
                          value={targetBranch}
                          onChange={(e) => setTargetBranch(e.target.value)}
                          className="flex-1 px-3 py-1 bg-void-base border border-border-smoke rounded-pills text-xs font-mono text-cloud-white focus:outline-none focus:border-electric-cyan/40"
                        >
                          {repoStatus.branches.map((b) => (
                            <option key={b} value={b}>
                              {b} {b === repoStatus.branch ? '(actual)' : ''}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setIsCustomTarget(true)}
                          className="text-[11px] font-mono text-fog-text hover:text-electric-cyan underline whitespace-nowrap"
                        >
                          Manual
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Nombre de rama, tag o commit hash"
                          value={targetBranch}
                          onChange={(e) => setTargetBranch(e.target.value)}
                          className="flex-1 px-3 py-1 bg-void-base border border-border-smoke rounded-pills text-xs font-mono text-cloud-white focus:outline-none focus:border-electric-cyan/40"
                        />
                        {repoStatus.branches?.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setIsCustomTarget(false)}
                            className="text-[11px] font-mono text-fog-text hover:text-electric-cyan underline whitespace-nowrap"
                          >
                            Lista
                          </button>
                        )}
                      </div>
                    )}

                    <button
                      onClick={() => handleCheckout(targetBranch)}
                      disabled={actionLoading === 'checkout' || !targetBranch || targetBranch === repoStatus.branch}
                      className="btn-cyan-secondary px-3.5 py-1 text-xs font-mono text-cloud-white hover:border-electric-cyan/60 disabled:opacity-40"
                      title="git checkout <rama>"
                    >
                      {actionLoading === 'checkout' ? 'Cambiando...' : 'Hacer Checkout'}
                    </button>
                  </div>
                </div>

                {/* Status Message Notification */}
                {statusMessage && (
                  <div
                    className={`p-3 rounded-inputs text-xs font-mono border ${
                      statusMessageType === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : statusMessageType === 'error'
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                        : 'bg-white/5 border-white/10 text-ash-text'
                    }`}
                  >
                    <pre className="whitespace-pre-wrap">{statusMessage}</pre>
                  </div>
                )}

                {/* Git Status (Modified files / Working tree) */}
                {repoStatus.status ? (
                  <div className="p-3.5 rounded-cards bg-deep-panel border border-amber-500/30">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-mono text-amber-300 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Archivos Modificados en el Servidor (git status -s)</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleStash('push')}
                          disabled={actionLoading === 'stash'}
                          className="px-2 py-0.5 rounded bg-white/5 border border-white/10 hover:border-amber-500/40 text-[11px] font-mono text-fog-text hover:text-cloud-white"
                          title="Guardar cambios temporales con git stash"
                        >
                          Stash
                        </button>
                        <button
                          onClick={handleResetHard}
                          disabled={actionLoading === 'reset'}
                          className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-[11px] font-mono text-rose-300"
                          title="Descartar todos los cambios locales (git reset --hard HEAD)"
                        >
                          Descartar Cambios
                        </button>
                      </div>
                    </div>
                    <pre className="p-2.5 rounded bg-void-base border border-white/5 font-mono text-[11px] text-amber-200/90 whitespace-pre-wrap max-h-36 overflow-y-auto">
                      {repoStatus.status}
                    </pre>
                  </div>
                ) : (
                  <div className="px-3.5 py-2 rounded-cards bg-deep-panel/50 border border-border-smoke/40 flex items-center gap-2 text-xs font-mono text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Árbol de trabajo limpio (sin cambios locales pendientes)</span>
                  </div>
                )}

                {/* Recent Commits with Checkout button */}
                <div className="p-3.5 rounded-cards bg-deep-panel border border-border-smoke/60">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs font-mono text-cloud-white font-medium">
                      <Clock className="w-3.5 h-3.5 text-electric-cyan" />
                      <span>Últimos Commits (Historial)</span>
                    </div>
                    <span className="text-[11px] font-mono text-fog-text">
                      Haz clic en "Checkout" para viajar a un commit previo
                    </span>
                  </div>

                  <div className="space-y-1.5 font-mono text-xs">
                    {repoStatus.commits && repoStatus.commits.length > 0 ? (
                      repoStatus.commits.map((c, i) => {
                        const hash = typeof c === 'object' ? c.hash : c.split(' ')[0];
                        const subject = typeof c === 'object' ? c.subject : c.substring(hash.length + 1);
                        const author = typeof c === 'object' ? c.author : '';
                        const time = typeof c === 'object' ? c.time : '';

                        return (
                          <div
                            key={i}
                            className="p-2 rounded bg-void-base border border-white/5 flex items-center justify-between gap-3 group hover:border-electric-cyan/30 transition"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <button
                                onClick={() => handleCopyHash(hash)}
                                className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-electric-cyan/20 text-electric-cyan text-[11px] font-bold flex items-center gap-1"
                                title="Copiar Hash"
                              >
                                {copiedHash === hash ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <GitCommit className="w-3 h-3" />
                                )}
                                <span>{hash}</span>
                              </button>

                              <span className="text-ash-text truncate group-hover:text-cloud-white transition">
                                {subject || '(sin mensaje)'}
                              </span>

                              {(author || time) && (
                                <span className="hidden sm:inline text-[10px] text-fog-text flex-shrink-0">
                                  {author} {time ? `• ${time}` : ''}
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() => handleCheckout(hash)}
                              disabled={actionLoading === 'checkout'}
                              className="px-2 py-0.5 rounded bg-white/5 border border-white/10 hover:border-electric-cyan/50 text-[10px] text-fog-text hover:text-electric-cyan whitespace-nowrap transition"
                              title={`Hacer checkout a este commit (${hash})`}
                            >
                              Checkout
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-fog-text">Sin commits registrados.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Auto-Deploy Webhook (CI/CD) */}
        {tab === 'webhook' && (
          <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
            {webhookLoading ? (
              <div className="flex items-center justify-center py-12 text-fog-text gap-2 text-xs font-mono">
                <RefreshCw className="w-4 h-4 animate-spin text-electric-cyan" />
                <span>Cargando configuración de Webhook...</span>
              </div>
            ) : (
              <>
                {/* Banner & Switch */}
                <div className="p-4 rounded-cards bg-deep-panel border border-border-smoke/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <h3 className="font-sans font-medium text-cloud-white text-sm">
                        Webhook para Auto-Deploy (GitHub / GitLab)
                      </h3>
                    </div>
                    <p className="text-xs font-mono text-fog-text mt-1">
                      Despliega tu código automáticamente al hacer <code className="text-electric-cyan">git push</code>.
                    </p>
                  </div>

                  {/* Toggle Switch */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-fog-text">
                      {webhookEnabled ? (
                        <span className="text-emerald-400 font-semibold">ACTIVO</span>
                      ) : (
                        <span className="text-fog-text">DESACTIVADO</span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => setWebhookEnabled(!webhookEnabled)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        webhookEnabled ? 'bg-electric-cyan' : 'bg-white/10'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-void-base shadow ring-0 transition duration-200 ease-in-out ${
                          webhookEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Webhook URL Endpoint */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono text-fog-text">
                    Endpoint del Webhook (Pégalo en GitHub o GitLab):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={webhookConfig?.url || 'Guardando para generar URL...'}
                      className="flex-1 px-3 py-2 bg-void-base border border-border-smoke rounded-pills text-xs font-mono text-cloud-white truncate focus:outline-none"
                    />
                    <button
                      onClick={handleCopyWebhookUrl}
                      disabled={!webhookConfig?.url}
                      className="btn-cyan-secondary px-3.5 py-2 text-xs font-mono flex items-center gap-1.5"
                    >
                      {webhookCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{webhookCopied ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>

                {/* Branch Selection & Repo Path */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono text-fog-text mb-1">
                      Rama Activa a Desplegar *
                    </label>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      {['main', 'master', 'develop', '*'].map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setWebhookBranch(b)}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono border transition ${
                            webhookBranch === b
                              ? 'bg-electric-cyan/20 border-electric-cyan text-cloud-white font-bold'
                              : 'bg-white/5 border-white/10 text-fog-text hover:text-ash-text'
                          }`}
                        >
                          {b === '*' ? 'Cualquiera (*)' : b}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={webhookBranch}
                      onChange={(e) => setWebhookBranch(e.target.value)}
                      placeholder="main"
                      className="w-full px-3 py-2 bg-void-base border border-border-smoke rounded-pills text-xs font-mono text-cloud-white focus:outline-none focus:border-electric-cyan/40"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-fog-text mb-1">
                      Ruta del Repositorio en el Servidor *
                    </label>
                    <input
                      type="text"
                      value={webhookRepoPath}
                      onChange={(e) => setWebhookRepoPath(e.target.value)}
                      placeholder="/root/mi-proyecto o /var/www/mi-app"
                      className="w-full px-3 py-2 bg-void-base border border-border-smoke rounded-pills text-xs font-mono text-cloud-white focus:outline-none focus:border-electric-cyan/40"
                    />
                    {selectedRepoPath && webhookRepoPath !== selectedRepoPath && (
                      <button
                        type="button"
                        onClick={() => setWebhookRepoPath(selectedRepoPath)}
                        className="text-[10px] font-mono text-electric-cyan hover:underline mt-1 block"
                      >
                        Usar repositorio activo: {selectedRepoPath}
                      </button>
                    )}
                  </div>
                </div>

                {/* Custom Post-Deploy Script */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-mono text-fog-text">
                      Script Posterior (Opcional - Docker, build, reinicio):
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setWebhookScript('docker compose up -d --build')}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-fog-text hover:text-electric-cyan"
                      >
                        + Docker Compose
                      </button>
                      <button
                        type="button"
                        onClick={() => setWebhookScript('npm install && npm run build && pm2 restart all')}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-fog-text hover:text-electric-cyan"
                      >
                        + Node/PM2
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={3}
                    value={webhookScript}
                    onChange={(e) => setWebhookScript(e.target.value)}
                    placeholder="docker compose down && docker compose up -d --build"
                    className="w-full p-2.5 bg-void-base border border-border-smoke rounded-inputs font-mono text-xs text-ash-text placeholder-fog-text focus:outline-none focus:border-electric-cyan/40"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleManualDeploy}
                    disabled={webhookDeploying || !webhookRepoPath}
                    className="btn-cyan-secondary px-4 py-2 text-xs font-mono flex items-center gap-1.5 hover:border-emerald-500/50 text-emerald-300"
                    title="Ejecutar despliegue manual ahora mismo por SSH"
                  >
                    <Play className={`w-3.5 h-3.5 ${webhookDeploying ? 'animate-spin' : ''}`} />
                    <span>{webhookDeploying ? 'Desplegando...' : 'Desplegar Ahora (Manual)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveWebhook}
                    disabled={webhookSaving}
                    className="btn-cyan-primary px-5 py-2 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{webhookSaving ? 'Guardando...' : 'Guardar Configuración'}</span>
                  </button>
                </div>

                {/* Output terminal for manual deploy */}
                {webhookDeployOutput && (
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center gap-2 text-xs font-mono text-fog-text">
                      <Terminal className="w-3.5 h-3.5 text-electric-cyan" />
                      <span>Registro de Despliegue en Vivo:</span>
                    </div>
                    <pre className="p-3 rounded-inputs bg-void-base border border-border-smoke font-mono text-xs text-ash-text whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {webhookDeployOutput}
                    </pre>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Tab 3: Clone Form */}
        {tab === 'clone' && (
          <form onSubmit={handleClone} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
            {error && (
              <div className="p-3 rounded-pills bg-rose-500/10 border border-rose-500/20 text-rose-300 font-mono text-xs">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-mono text-fog-text mb-1">
                URL del Repositorio Git *
              </label>
              <input
                type="text"
                required
                placeholder="https://github.com/usuario/mi-proyecto.git"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="w-full px-3.5 py-2 bg-void-base border border-border-smoke rounded-pills font-mono text-ash-text placeholder-fog-text focus:outline-none focus:border-electric-cyan/40"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-fog-text mb-1">
                  Carpeta de Destino en el VPS
                </label>
                <input
                  type="text"
                  placeholder="/var/www/mi-app"
                  value={targetDir}
                  onChange={(e) => setTargetDir(e.target.value)}
                  className="w-full px-3.5 py-2 bg-void-base border border-border-smoke rounded-pills font-mono text-ash-text placeholder-fog-text focus:outline-none focus:border-electric-cyan/40"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-fog-text mb-1">
                  Rama específica (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="main o master"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full px-3.5 py-2 bg-void-base border border-border-smoke rounded-pills font-mono text-ash-text placeholder-fog-text focus:outline-none focus:border-electric-cyan/40"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={cloning}
                className="btn-cyan-primary px-5 py-2.5 text-xs sm:text-sm font-semibold"
              >
                <Download className="w-4 h-4" />
                <span>{cloning ? 'Clonando repositorio...' : 'Clonar Repositorio en VPS'}</span>
                <ArrowRight className="w-4 h-4 opacity-80" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

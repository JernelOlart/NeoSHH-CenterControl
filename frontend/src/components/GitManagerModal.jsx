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
  Archive
} from 'lucide-react';
import { detectGitRepos, fetchGitStatus, gitPull, gitClone, downloadRepoZip } from '../services/api';

export default function GitManagerModal({ server, isOpen, onClose }) {
  const [tab, setTab] = useState('repos'); // 'repos' | 'clone'
  const [detectedRepos, setDetectedRepos] = useState([]);
  const [selectedRepoPath, setSelectedRepoPath] = useState('');
  const [customPath, setCustomPath] = useState('');
  const [repoStatus, setRepoStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [pullMessage, setPullMessage] = useState(null);
  const [error, setError] = useState(null);

  // Clone form
  const [repoUrl, setRepoUrl] = useState('');
  const [targetDir, setTargetDir] = useState('/var/www/');
  const [branch, setBranch] = useState('');

  const loadRepos = async () => {
    if (!server) return;
    setLoading(true);
    setError(null);
    try {
      const data = await detectGitRepos(server.id);
      setDetectedRepos(data.repos || []);
      if (data.repos?.length > 0 && !selectedRepoPath) {
        setSelectedRepoPath(data.repos[0]);
        loadRepoInfo(data.repos[0]);
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
    setPullMessage(null);
    try {
      const data = await fetchGitStatus(server.id, path);
      setRepoStatus(data);
    } catch (err) {
      setError(err.message || 'Error al consultar repositorio');
      setRepoStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && server) {
      loadRepos();
      setPullMessage(null);
    }
  }, [isOpen, server?.id]);

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

  const handlePull = async () => {
    if (!selectedRepoPath) return;
    setPulling(true);
    setPullMessage(null);
    try {
      const res = await gitPull(server.id, selectedRepoPath);
      setPullMessage(res.output || 'Git pull completado con éxito');
      await loadRepoInfo(selectedRepoPath);
    } catch (err) {
      alert(`Error al ejecutar git pull: ${err.message}`);
    } finally {
      setPulling(false);
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
                Clonación, ramas y despliegue rápido con git pull
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
            className={`px-3 py-1 text-xs font-mono rounded-pills transition ${
              tab === 'repos'
                ? 'bg-electric-cyan text-dark-teal font-semibold shadow-[0_0_10px_rgba(23,186,237,0.3)]'
                : 'text-fog-text hover:text-cloud-white'
            }`}
          >
            Repositorios en el VPS
          </button>
          <button
            onClick={() => setTab('clone')}
            className={`px-3 py-1 text-xs font-mono rounded-pills transition ${
              tab === 'clone'
                ? 'bg-electric-cyan text-dark-teal font-semibold shadow-[0_0_10px_rgba(23,186,237,0.3)]'
                : 'text-fog-text hover:text-cloud-white'
            }`}
          >
            Clonar Nuevo Repositorio
          </button>
        </div>

        {/* Tab 1: Repositories */}
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
                      className={`px-3 py-1.5 rounded-pills text-xs font-mono border transition truncate max-w-[280px] ${
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
                <span>Consultando estado de Git...</span>
              </div>
            ) : error ? (
              <div className="p-3.5 rounded-cards bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono">
                {error}
              </div>
            ) : repoStatus && (
              <div className="space-y-3">
                {/* Branch & Pull Action Card */}
                <div className="p-3.5 rounded-cards bg-deep-panel border border-border-smoke/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-electric-cyan" />
                      <span className="text-xs font-mono text-fog-text">Rama Activa:</span>
                      <span className="text-xs font-mono font-bold text-cloud-white bg-void-base px-2 py-0.5 rounded border border-white/10">
                        {repoStatus.branch || 'main'}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-fog-text mt-1 truncate max-w-md">
                      Ruta: {selectedRepoPath}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
                    <button
                      onClick={handlePull}
                      disabled={pulling}
                      className="btn-cyan-primary px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5"
                      title="Ejecutar git pull en el servidor"
                    >
                      <Download className={`w-3.5 h-3.5 ${pulling ? 'animate-bounce' : ''}`} />
                      <span>{pulling ? 'Actualizando...' : 'Git Pull'}</span>
                    </button>

                    <button
                      onClick={() => handleDownloadZip(selectedRepoPath)}
                      disabled={downloading}
                      className="btn-cyan-secondary px-3.5 py-2 text-xs font-semibold text-electric-cyan flex items-center gap-1.5 hover:border-electric-cyan/60"
                      title="Descargar repositorio completo empaquetado en .zip directamente a tu máquina"
                    >
                      <Archive className={`w-3.5 h-3.5 ${downloading ? 'animate-spin' : ''}`} />
                      <span>{downloading ? 'Empaquetando...' : 'Descargar ZIP'}</span>
                    </button>
                  </div>
                </div>

                {/* Pull result notification */}
                {pullMessage && (
                  <div className="p-3 rounded-inputs bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
                    <pre className="whitespace-pre-wrap">{pullMessage}</pre>
                  </div>
                )}

                {/* Recent Commits */}
                <div className="p-3.5 rounded-cards bg-deep-panel border border-border-smoke/60">
                  <div className="flex items-center gap-2 mb-2 text-xs font-mono text-cloud-white font-medium">
                    <Clock className="w-3.5 h-3.5 text-electric-cyan" />
                    <span>Últimos Commits</span>
                  </div>
                  <div className="space-y-1.5 font-mono text-xs">
                    {repoStatus.commits && repoStatus.commits.length > 0 ? (
                      repoStatus.commits.map((c, i) => (
                        <div key={i} className="p-2 rounded bg-void-base border border-white/5 flex items-center gap-2">
                          <GitCommit className="w-3.5 h-3.5 text-fog-text flex-shrink-0" />
                          <span className="text-ash-text truncate">{c}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-fog-text">Sin commits registrados.</p>
                    )}
                  </div>
                </div>

                {/* Git Status output */}
                {repoStatus.status && (
                  <div className="p-3.5 rounded-cards bg-deep-panel border border-border-smoke/60">
                    <span className="text-xs font-mono text-fog-text block mb-1">Archivos modificados (git status -s):</span>
                    <pre className="p-2 rounded bg-void-base border border-white/5 font-mono text-[11px] text-ash-text whitespace-pre-wrap">
                      {repoStatus.status}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Clone Form */}
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


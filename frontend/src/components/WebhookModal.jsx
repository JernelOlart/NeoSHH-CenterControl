import React, { useState, useEffect } from 'react';
import {
  X,
  Zap,
  GitBranch,
  Copy,
  Check,
  RefreshCw,
  Play,
  Terminal,
  AlertTriangle,
  CheckCircle2,
  FolderGit2,
  ExternalLink,
  ShieldCheck,
  Clock,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import {
  fetchWebhookConfig,
  saveWebhookConfig,
  regenerateWebhookToken,
  triggerManualDeploy,
  fetchDetectedRepos
} from '../services/api';

export default function WebhookModal({ server, isOpen, onClose }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [deployOutput, setDeployOutput] = useState('');
  const [detectedRepos, setDetectedRepos] = useState([]);
  const [detectingRepos, setDetectingRepos] = useState(false);
  const [activeTab, setActiveTab] = useState('config'); // 'config' | 'logs' | 'github-help'

  // Form states
  const [enabled, setEnabled] = useState(false);
  const [branch, setBranch] = useState('main');
  const [repoPath, setRepoPath] = useState('');
  const [script, setScript] = useState('');
  const [secret, setSecret] = useState('');

  const loadConfig = async () => {
    if (!server) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWebhookConfig(server.id);
      setConfig(data);
      setEnabled(Boolean(data.enabled));
      setBranch(data.branch || 'main');
      setRepoPath(data.repoPath || '');
      setScript(data.script || '');
      setSecret(data.secret || '');
      if (data.lastDeploy?.output) {
        setDeployOutput(data.lastDeploy.output);
      }
    } catch (err) {
      setError(err.message || 'Error al cargar configuración de webhook');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && server) {
      loadConfig();
      setSuccessMsg(null);
      setError(null);
      setCopied(false);
    }
  }, [isOpen, server?.id]);

  if (!isOpen || !server) return null;

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.host}/api/webhooks/deploy/${config?.token || ''}`
    : `/api/webhooks/deploy/${config?.token || ''}`;

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const updated = await saveWebhookConfig(server.id, {
        enabled,
        branch,
        repoPath,
        script,
        secret
      });
      setConfig(updated);
      setSuccessMsg('Configuración guardada exitosamente.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateToken = async () => {
    if (!window.confirm('¿Regenerar el token? La URL anterior dejará de funcionar en GitHub/GitLab inmediatamente.')) {
      return;
    }
    setLoading(true);
    try {
      const res = await regenerateWebhookToken(server.id);
      setConfig((prev) => ({ ...prev, token: res.token }));
      setSuccessMsg('Nuevo token generado y activado.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err.message || 'Error al regenerar token');
    } finally {
      setLoading(false);
    }
  };

  const handleManualDeploy = async () => {
    if (!repoPath) {
      setError('Debes especificar la ruta del repositorio en el servidor antes de desplegar.');
      return;
    }
    setDeploying(true);
    setError(null);
    setSuccessMsg(null);
    setDeployOutput('Iniciando despliegue en el servidor remoto por SSH...\n');
    try {
      const result = await triggerManualDeploy(server.id, {
        repoPath,
        branch,
        script
      });
      setDeployOutput(result.output || 'Despliegue finalizado sin salida.');
      if (result.status === 'success') {
        setSuccessMsg('¡Despliegue ejecutado con éxito!');
      } else {
        setError('El despliegue finalizó con errores. Revisa la salida de la terminal.');
      }
      // Reload config to get history
      const freshConfig = await fetchWebhookConfig(server.id);
      setConfig(freshConfig);
    } catch (err) {
      setError(err.message || 'Error al ejecutar despliegue');
      setDeployOutput((prev) => prev + `\n[ERROR]: ${err.message}`);
    } finally {
      setDeploying(false);
    }
  };

  const handleDetectRepos = async () => {
    setDetectingRepos(true);
    try {
      const data = await fetchDetectedRepos(server.id);
      setDetectedRepos(data.repos || []);
      if (!data.repos || data.repos.length === 0) {
        setSuccessMsg('No se detectaron carpetas .git en /var/www, /root o /home');
      }
    } catch (err) {
      setError(err.message || 'Error al detectar repositorios');
    } finally {
      setDetectingRepos(false);
    }
  };

  const applyPreset = (presetScript) => {
    setScript(presetScript);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-void-base/85 backdrop-blur-sm">
      <div className="bg-elevated-surface rounded-cards-lg w-full max-w-4xl border border-border-smoke flex flex-col h-[85vh] max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-border-smoke/70 flex items-center justify-between gap-3 flex-shrink-0 bg-deep-panel/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-nodes bg-white/5 border border-electric-cyan/30 flex items-center justify-center text-electric-cyan shadow-[0_0_12px_rgba(23,186,237,0.25)]">
              <Zap className="w-5 h-5 text-electric-cyan" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-cloud-white">Auto-Deploy Webhook (CI/CD)</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-pills bg-white/5 border border-white/10 text-electric-cyan">
                  {server.name}
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-pills flex items-center gap-1 font-semibold ${
                    enabled
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                      : 'bg-white/5 border border-white/10 text-fog-text'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${enabled ? 'bg-emerald-400 animate-pulse' : 'bg-fog-text'}`} />
                  {enabled ? 'ACTIVO' : 'DESACTIVADO'}
                </span>
              </div>
              <p className="text-xs font-mono text-fog-text">
                Despliegue automático continuo con GitHub / GitLab al hacer push
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

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-4 border-b border-border-smoke/60 bg-deep-panel/30 text-xs font-mono">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('config')}
              className={`py-2.5 px-3 border-b-2 font-medium transition ${
                activeTab === 'config'
                  ? 'border-electric-cyan text-electric-cyan'
                  : 'border-transparent text-fog-text hover:text-cloud-white'
              }`}
            >
              Configuración & Rama
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`py-2.5 px-3 border-b-2 font-medium flex items-center gap-1.5 transition ${
                activeTab === 'logs'
                  ? 'border-electric-cyan text-electric-cyan'
                  : 'border-transparent text-fog-text hover:text-cloud-white'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Salida de Despliegue</span>
              {config?.lastDeploy && (
                <span
                  className={`w-2 h-2 rounded-full ${
                    config.lastDeploy.status === 'success' ? 'bg-emerald-400' : 'bg-rose-500'
                  }`}
                />
              )}
            </button>
            <button
              onClick={() => setActiveTab('github-help')}
              className={`py-2.5 px-3 border-b-2 font-medium transition ${
                activeTab === 'github-help'
                  ? 'border-electric-cyan text-electric-cyan'
                  : 'border-transparent text-fog-text hover:text-cloud-white'
              }`}
            >
              Guía de GitHub / GitLab
            </button>
          </div>

          <button
            onClick={handleManualDeploy}
            disabled={deploying || !repoPath}
            className="btn-cyan-primary px-3 py-1 text-xs inline-flex items-center gap-1.5 shadow-[0_0_10px_rgba(23,186,237,0.25)]"
            title="Ejecutar despliegue manual en este instante"
          >
            <Play className={`w-3.5 h-3.5 ${deploying ? 'animate-spin' : ''}`} />
            <span>{deploying ? 'Desplegando...' : 'Desplegar Ahora'}</span>
          </button>
        </div>

        {/* Global Notifications */}
        {successMsg && (
          <div className="mx-4 mt-3 flex-shrink-0 p-3 rounded-inputs bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {error && (
          <div className="mx-4 mt-3 flex-shrink-0 p-3 rounded-inputs bg-rose-500/10 border border-rose-500/20 text-rose-300 font-mono text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 min-h-0 space-y-4">
          {activeTab === 'config' && (
            <div className="space-y-4">
              {/* Main Switch Card */}
              <div className="p-4 rounded-cards bg-deep-panel border border-border-smoke/70 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-cloud-white">
                      Estado del Webhook de Despliegue
                    </span>
                    <span className="text-[10px] font-mono text-fog-text bg-white/5 px-2 py-0.5 rounded-pills border border-white/10">
                      Por defecto desactivado
                    </span>
                  </div>
                  <p className="text-xs text-fog-text leading-relaxed">
                    Cuando está activado, NeoShh Control recibirá las notificaciones de push desde GitHub/GitLab y ejecutará la actualización en el servidor.
                  </p>
                </div>

                {/* Big Animated Switch */}
                <button
                  type="button"
                  onClick={() => setEnabled(!enabled)}
                  className={`w-14 h-8 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out flex-shrink-0 border ${
                    enabled ? 'bg-electric-cyan/20 border-electric-cyan shadow-[0_0_12px_rgba(23,186,237,0.3)]' : 'bg-void-base border-border-smoke'
                  }`}
                >
                  <div
                    className={`bg-cloud-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                      enabled ? 'translate-x-6 bg-electric-cyan' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Webhook URL Input & Copy */}
              <div className="p-4 rounded-cards bg-deep-panel border border-border-smoke/70 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-cloud-white font-medium flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-electric-cyan" />
                    URL del Webhook (Payload URL para GitHub / GitLab)
                  </span>
                  <button
                    onClick={handleRegenerateToken}
                    className="text-[11px] text-fog-text hover:text-rose-400 transition"
                    title="Regenerar token de seguridad"
                  >
                    Regenerar token
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={webhookUrl}
                    className="flex-1 bg-void-base border border-border-smoke rounded-inputs px-3 py-2 font-mono text-xs text-electric-cyan select-all focus:outline-none"
                  />
                  <button
                    onClick={copyWebhookUrl}
                    className="btn-cyan-secondary px-3.5 py-2 text-xs inline-flex items-center gap-1.5 flex-shrink-0"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-electric-cyan" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copiado' : 'Copiar URL'}</span>
                  </button>
                </div>
                <p className="text-[11px] font-mono text-fog-text">
                  Pega esta URL en la configuración de Webhooks de tu repositorio en GitHub o GitLab.
                </p>
              </div>

              {/* Branch & Path Configuration Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Branch Selection */}
                <div className="p-4 rounded-cards bg-deep-panel border border-border-smoke/70 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-cloud-white font-medium flex items-center gap-1.5">
                      <GitBranch className="w-3.5 h-3.5 text-purple-400" />
                      Rama Activa para Despliegue
                    </span>
                    <span className="text-[10px] text-fog-text">Filtro de Push</span>
                  </div>

                  <div className="flex gap-1.5">
                    {['main', 'master', 'develop'].map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setBranch(b)}
                        className={`px-2.5 py-1 text-xs font-mono rounded-inputs transition ${
                          branch === b
                            ? 'bg-electric-cyan/15 border border-electric-cyan/40 text-electric-cyan font-semibold'
                            : 'bg-void-base border border-border-smoke/60 text-fog-text hover:text-cloud-white'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setBranch('*')}
                      className={`px-2 py-1 text-[11px] font-mono rounded-inputs transition ${
                        branch === '*'
                          ? 'bg-purple-500/15 border border-purple-500/40 text-purple-300 font-semibold'
                          : 'bg-void-base border border-border-smoke/60 text-fog-text hover:text-cloud-white'
                      }`}
                      title="Desplegar en cualquier push a cualquier rama"
                    >
                      * (Cualquiera)
                    </button>
                  </div>

                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="Ej: main, production, v2.0"
                    className="w-full bg-void-base border border-border-smoke rounded-inputs px-3 py-1.5 font-mono text-xs text-cloud-white focus:outline-none focus:border-electric-cyan"
                  />
                  <p className="text-[10px] font-mono text-fog-text">
                    Solo los pushes hacia esta rama activarán el auto-deploy (otros eventos serán ignorados de forma segura).
                  </p>
                </div>

                {/* Repository Path on Server */}
                <div className="p-4 rounded-cards bg-deep-panel border border-border-smoke/70 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-cloud-white font-medium flex items-center gap-1.5">
                      <FolderGit2 className="w-3.5 h-3.5 text-electric-cyan" />
                      Ruta del Repositorio en el Servidor
                    </span>
                    <button
                      type="button"
                      onClick={handleDetectRepos}
                      disabled={detectingRepos}
                      className="text-[11px] text-electric-cyan hover:underline inline-flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${detectingRepos ? 'animate-spin' : ''}`} />
                      <span>Escanear repos</span>
                    </button>
                  </div>

                  <input
                    type="text"
                    value={repoPath}
                    onChange={(e) => setRepoPath(e.target.value)}
                    placeholder="Ej: /var/www/mi-proyecto o /home/ubuntu/app"
                    className="w-full bg-void-base border border-border-smoke rounded-inputs px-3 py-1.5 font-mono text-xs text-cloud-white focus:outline-none focus:border-electric-cyan"
                  />

                  {/* Detected Repos Dropdown/Pills */}
                  {detectedRepos.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[10px] font-mono text-fog-text">Detectados:</span>
                      {detectedRepos.slice(0, 4).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setRepoPath(p)}
                          className="text-[10px] font-mono bg-white/5 border border-white/10 hover:border-electric-cyan/40 px-1.5 py-0.5 rounded text-ash-text hover:text-electric-cyan truncate max-w-[140px]"
                          title={p}
                        >
                          {p.split('/').pop() || p}
                        </button>
                      ))}
                    </div>
                  )}

                  <p className="text-[10px] font-mono text-fog-text">
                    Directorio absoluto donde está clonado tu proyecto en este VPS.
                  </p>
                </div>
              </div>

              {/* Custom Deploy Script / Commands */}
              <div className="p-4 rounded-cards bg-deep-panel border border-border-smoke/70 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                  <span className="text-cloud-white font-medium flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                    Comandos de Construcción & Despliegue (Opcional)
                  </span>

                  {/* Presets */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[10px] text-fog-text mr-1">Presets:</span>
                    <button
                      type="button"
                      onClick={() => applyPreset('docker compose up -d --build')}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 hover:bg-electric-cyan/15 text-ash-text hover:text-electric-cyan border border-white/10"
                    >
                      Docker Compose
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('npm install --omit=dev && npm run build')}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 hover:bg-emerald-500/15 text-ash-text hover:text-emerald-400 border border-white/10"
                    >
                      Node / Vite
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('git status')}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 hover:bg-purple-500/15 text-ash-text hover:text-purple-300 border border-white/10"
                    >
                      Solo Pull
                    </button>
                  </div>
                </div>

                <textarea
                  rows={4}
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  placeholder="Ej: docker compose up -d --build&#10;o: npm install && pm2 reload app"
                  className="w-full bg-void-base border border-border-smoke rounded-inputs p-3 font-mono text-xs text-cloud-white resize-y focus:outline-none focus:border-electric-cyan leading-relaxed"
                />
                <p className="text-[11px] font-mono text-fog-text">
                  Si se deja vacío, el sistema automáticamente detectará <code>docker-compose.yml</code> o <code>package.json</code> y ejecutará el build estándar.
                </p>
              </div>

              {/* Save Bar */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-cyan-primary px-5 py-2 text-xs font-semibold inline-flex items-center gap-2"
                >
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>{saving ? 'Guardando...' : 'Guardar Configuración'}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-4">
              {/* Last Deploy Status Card */}
              {config?.lastDeploy && (
                <div className="p-4 rounded-cards bg-deep-panel border border-border-smoke/70 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-nodes flex items-center justify-center ${
                        config.lastDeploy.status === 'success'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {config.lastDeploy.status === 'success' ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <AlertTriangle className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 font-medium text-cloud-white">
                        <span>Estado: {config.lastDeploy.status === 'success' ? 'Completado con Éxito' : 'Falló'}</span>
                        <span className="text-[10px] text-fog-text px-2 py-0.5 rounded-pills bg-white/5 border border-white/10">
                          {config.lastDeploy.triggeredBy === 'webhook' ? 'Disparado por Webhook' : 'Disparo Manual'}
                        </span>
                      </div>
                      <div className="text-[11px] text-fog-text">
                        {config.lastDeploy.timestamp ? new Date(config.lastDeploy.timestamp).toLocaleString() : ''}
                        {config.lastDeploy.durationMs && ` • Duración: ${(config.lastDeploy.durationMs / 1000).toFixed(1)}s`}
                        {config.lastDeploy.branch && ` • Rama: ${config.lastDeploy.branch}`}
                      </div>
                    </div>
                  </div>

                  {config.lastDeploy.commit && (
                    <div className="text-right text-[11px] font-mono text-fog-text bg-white/5 p-2 rounded-inputs border border-white/10">
                      <div className="text-electric-cyan font-semibold">
                        Commit: {config.lastDeploy.commit.id}
                      </div>
                      <div className="truncate max-w-[200px]" title={config.lastDeploy.commit.message}>
                        {config.lastDeploy.commit.message}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Terminal Output */}
              <div className="p-4 rounded-cards bg-void-base border border-border-smoke space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-fog-text">
                  <span className="flex items-center gap-1.5 text-electric-cyan font-semibold">
                    <Terminal className="w-3.5 h-3.5" />
                    Terminal de Ejecución
                  </span>
                  <button
                    onClick={() => setDeployOutput('')}
                    className="hover:text-cloud-white transition"
                  >
                    Limpiar vista
                  </button>
                </div>

                <pre className="text-[11px] font-mono text-cloud-white/90 whitespace-pre-wrap overflow-x-auto min-h-[220px] max-h-[360px] p-3 rounded bg-deep-panel/80 border border-border-smoke/50 leading-relaxed font-sans">
                  {deployOutput || 'Aún no se ha ejecutado ningún despliegue. Haz clic en "Desplegar Ahora" para probar.'}
                </pre>
              </div>

              {/* Previous History List */}
              {config?.history && config.history.length > 1 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-mono font-semibold text-cloud-white">
                    Historial de Despliegues Anteriores
                  </h4>
                  <div className="space-y-1.5">
                    {config.history.slice(1, 6).map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-inputs bg-deep-panel border border-border-smoke/60 flex items-center justify-between text-xs font-mono"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              item.status === 'success' ? 'bg-emerald-400' : 'bg-rose-500'
                            }`}
                          />
                          <span className="text-cloud-white">
                            {new Date(item.timestamp).toLocaleString()}
                          </span>
                          <span className="text-fog-text">({item.branch})</span>
                        </div>
                        <button
                          onClick={() => setDeployOutput(item.output || '')}
                          className="text-electric-cyan text-[11px] hover:underline"
                        >
                          Ver log
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'github-help' && (
            <div className="space-y-4 p-4 rounded-cards bg-deep-panel border border-border-smoke/70 text-xs font-mono leading-relaxed">
              <h3 className="text-sm font-semibold text-cloud-white flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-electric-cyan" />
                Cómo vincular este Webhook en GitHub
              </h3>

              <ol className="list-decimal pl-5 space-y-3 text-fog-text">
                <li>
                  Ve a tu repositorio en <span className="text-cloud-white font-semibold">GitHub</span> y haz clic en <span className="text-electric-cyan">Settings</span> &gt; <span className="text-electric-cyan">Webhooks</span>.
                </li>
                <li>
                  Haz clic en el botón <span className="text-emerald-400 font-semibold">Add webhook</span>.
                </li>
                <li>
                  En el campo <span className="text-cloud-white font-semibold">Payload URL</span>, pega tu URL de Webhook:
                  <div className="my-1.5 p-2 rounded bg-void-base border border-border-smoke text-electric-cyan break-all select-all">
                    {webhookUrl}
                  </div>
                </li>
                <li>
                  En <span className="text-cloud-white font-semibold">Content type</span>, selecciona obligatoriamente: <span className="text-amber-300 font-semibold">application/json</span>.
                </li>
                <li>
                  En <span className="text-cloud-white font-semibold">Which events would you like to trigger this webhook?</span>, selecciona <span className="text-emerald-400">Just the push event</span>.
                </li>
                <li>
                  Haz clic en <span className="text-emerald-400 font-semibold">Add webhook</span> para guardar. ¡Listo! A partir de ese momento, cada vez que hagas un <code>git push origin {branch}</code>, tu servidor se actualizará y reconstruirá de forma automática.
                </li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


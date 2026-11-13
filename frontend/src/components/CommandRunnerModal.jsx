import React, { useState } from 'react';
import {
  X,
  Terminal,
  Play,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  Cpu,
  Wifi,
  Server,
  Box,
  Package,
  FileText
} from 'lucide-react';
import { runCommand } from '../services/api';

const CATEGORIES = [
  {
    name: 'Sistema',
    icon: Cpu,
    commands: [
      { label: 'df -h', cmd: 'df -h' },
      { label: 'free -m', cmd: 'free -m' },
      { label: 'uptime', cmd: 'uptime' },
      { label: 'top (resumen)', cmd: 'top -bn1 | head -20' },
      { label: 'uname -a', cmd: 'uname -a' },
      { label: 'who', cmd: 'who' }
    ]
  },
  {
    name: 'Red',
    icon: Wifi,
    commands: [
      { label: 'ss -tulpn', cmd: 'ss -tulpn' },
      { label: 'ip addr', cmd: 'ip addr' },
      { label: 'ping 8.8.8.8', cmd: 'ping -c 4 8.8.8.8' },
      { label: 'netstat -rn', cmd: 'netstat -rn' }
    ]
  },
  {
    name: 'Servicios',
    icon: Server,
    commands: [
      { label: 'servicios activos', cmd: 'systemctl list-units --type=service --state=running' },
      { label: 'ps aux (top 20)', cmd: 'ps aux | head -20' }
    ]
  },
  {
    name: 'Docker',
    icon: Box,
    commands: [
      { label: 'docker ps', cmd: 'docker ps' },
      { label: 'docker images', cmd: 'docker images' },
      { label: 'docker stats', cmd: 'docker stats --no-stream' }
    ]
  },
  {
    name: 'Paquetes',
    icon: Package,
    commands: [
      { label: 'apt actualizables', cmd: 'apt list --upgradable 2>/dev/null' },
      { label: 'dpkg list', cmd: 'dpkg -l | head -30' }
    ]
  },
  {
    name: 'Logs',
    icon: FileText,
    commands: [
      { label: 'syslog (tail 50)', cmd: 'tail -50 /var/log/syslog' },
      { label: 'journalctl (tail 50)', cmd: 'journalctl -n 50 --no-pager' }
    ]
  }
];

export default function CommandRunnerModal({ server, isOpen, onClose }) {
  const [commandInput, setCommandInput] = useState('');
  const [output, setOutput] = useState('');
  const [executing, setExecuting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !server) return null;

  const handleExecute = async (cmdToRun) => {
    const cmd = (cmdToRun || commandInput).trim();
    if (!cmd) return;

    setExecuting(true);
    setError(null);
    try {
      const res = await runCommand(server.id, cmd);
      setOutput(res.output || res.stdout || res.stderr || '(Sin salida)');
    } catch (err) {
      setError(err.message || 'Error al ejecutar comando');
      setOutput(`Error: ${err.message}`);
    } finally {
      setExecuting(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleExecute();
  };

  const handlePaletteClick = (cmd) => {
    setCommandInput(cmd);
    handleExecute(cmd);
  };

  const handleCopy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleClear = () => {
    setOutput('');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-void-base/85 backdrop-blur-sm">
      <div className="bg-elevated-surface rounded-cards-lg w-full max-w-3xl border border-border-smoke flex flex-col max-h-[88vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-border-smoke/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-nodes bg-white/5 border border-electric-cyan/30 flex items-center justify-center text-electric-cyan shadow-[0_0_10px_rgba(23,186,237,0.2)]">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-medium text-cloud-white">Ejecutor de Comandos</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-pills bg-white/5 border border-white/10 text-electric-cyan">
                  {server.name}
                </span>
              </div>
              <p className="text-xs font-mono text-fog-text">
                Paleta de comandos rápidos y terminal interactiva remota
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-pills hover:bg-muted-shell text-fog-text hover:text-cloud-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Palette Categories */}
          <div className="space-y-3">
            <div className="text-xs font-mono text-fog-text font-medium">Paleta de Comandos Predefinidos</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <div
                    key={cat.name}
                    className="p-3 rounded-cards bg-deep-panel border border-border-smoke/60 space-y-2"
                  >
                    <div className="flex items-center gap-2 text-xs font-mono text-cloud-white font-medium">
                      <Icon className="w-3.5 h-3.5 text-electric-cyan" />
                      <span>{cat.name}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {cat.commands.map((c) => (
                        <button
                          key={c.cmd}
                          type="button"
                          disabled={executing}
                          onClick={() => handlePaletteClick(c.cmd)}
                          className="px-2 py-1 rounded-pills bg-void-base border border-border-smoke hover:border-electric-cyan/50 text-[11px] font-mono text-ash-text hover:text-cloud-white transition disabled:opacity-50"
                          title={c.cmd}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Command Input */}
          <form onSubmit={handleFormSubmit} className="space-y-2">
            <label className="block text-xs font-mono text-fog-text">
              Comando personalizado
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-electric-cyan font-mono text-xs select-none">
                  $
                </span>
                <input
                  type="text"
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  placeholder="uptime, ls -la /var/log, docker ps..."
                  className="w-full bg-void-base border border-border-smoke rounded-inputs pl-7 pr-3 py-2 text-xs font-mono text-cloud-white focus:outline-none focus:border-electric-cyan"
                  disabled={executing}
                />
              </div>
              <button
                type="submit"
                disabled={executing || !commandInput.trim()}
                className="btn-cyan-primary px-4 py-2 text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
              >
                {executing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
                <span>{executing ? 'Ejecutando...' : 'Ejecutar'}</span>
              </button>
            </div>
          </form>

          {/* Output Panel */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-fog-text">
              <div className="flex items-center gap-2">
                <span>Salida</span>
                {executing && (
                  <span className="flex items-center gap-1 text-electric-cyan text-[11px]">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    En ejecución en el servidor...
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {output && (
                  <>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="btn-cyan-secondary px-2.5 py-1 text-xs inline-flex items-center gap-1.5"
                      title="Copiar salida"
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
                    <button
                      type="button"
                      onClick={handleClear}
                      className="p-1 rounded hover:bg-white/5 text-fog-text hover:text-rose-400 transition"
                      title="Limpiar salida"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="bg-void-base border border-border-smoke rounded-cards p-3 font-mono text-xs text-cloud-white max-h-64 overflow-y-auto whitespace-pre select-text">
              {output || (
                <span className="text-fog-text/60 italic">
                  Selecciona un comando predefinido o escribe uno para ver el resultado.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

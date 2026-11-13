import React, { useState, useEffect } from 'react';
import {
  X,
  Power,
  RotateCw,
  Trash2,
  Cpu,
  HardDrive,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Server,
  Terminal,
  Activity,
  ShieldAlert
} from 'lucide-react';
import {
  rebootServer,
  poweroffServer,
  dropServerCaches,
  cleanServerDisk,
  refreshServer
} from '../services/api';

export default function PowerManagementModal({ server, isOpen, onClose, onServerUpdated }) {
  const [activeAction, setActiveAction] = useState(null); // 'reboot' | 'shutdown' | 'caches' | 'disk'
  const [confirmStep, setConfirmStep] = useState(null); // 'confirm-reboot' | 'confirm-shutdown'
  const [confirmInput, setConfirmInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultMsg, setResultMsg] = useState(null);
  const [actionOutput, setActionOutput] = useState('');
  const [rebooting, setRebooting] = useState(false);
  const [rebootSeconds, setRebootSeconds] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setActiveAction(null);
      setConfirmStep(null);
      setConfirmInput('');
      setLoading(false);
      setResultMsg(null);
      setActionOutput('');
      setRebooting(false);
      setRebootSeconds(0);
    }
  }, [isOpen]);

  // Reboot polling timer
  useEffect(() => {
    let timer = null;
    let pollInterval = null;

    if (rebooting && server) {
      timer = setInterval(() => {
        setRebootSeconds((s) => s + 1);
      }, 1000);

      // Start probing server after 15 seconds
      pollInterval = setInterval(async () => {
        try {
          const res = await refreshServer(server.id);
          if (res && res.metrics) {
            setRebooting(false);
            setResultMsg({ ok: true, text: '¡El servidor ha vuelto a estar en línea exitosamente!' });
            if (onServerUpdated) onServerUpdated();
          }
        } catch {
          // Still rebooting
        }
      }, 5000);
    }

    return () => {
      if (timer) clearInterval(timer);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [rebooting, server, onServerUpdated]);

  if (!isOpen || !server) return null;

  const handleReboot = async () => {
    setLoading(true);
    setResultMsg(null);
    setActionOutput('');
    try {
      const res = await rebootServer(server.id);
      setRebooting(true);
      setRebootSeconds(0);
      setConfirmStep(null);
      setResultMsg({ ok: true, text: res.message || 'Orden de reinicio enviada.' });
    } catch (err) {
      setResultMsg({ ok: false, text: err.message || 'Error al reiniciar el servidor' });
    } finally {
      setLoading(false);
    }
  };

  const handleShutdown = async () => {
    setLoading(true);
    setResultMsg(null);
    setActionOutput('');
    try {
      const res = await poweroffServer(server.id);
      setConfirmStep(null);
      setResultMsg({ ok: true, text: res.message || 'Orden de apagado enviada.' });
      if (onServerUpdated) onServerUpdated();
    } catch (err) {
      setResultMsg({ ok: false, text: err.message || 'Error al apagar el servidor' });
    } finally {
      setLoading(false);
    }
  };

  const handleDropCaches = async () => {
    setLoading(true);
    setActiveAction('caches');
    setResultMsg(null);
    setActionOutput('');
    try {
      const res = await dropServerCaches(server.id);
      setResultMsg({ ok: true, text: res.message || 'Memoria caché liberada con éxito.' });
      setActionOutput(res.output || '');
      if (onServerUpdated) onServerUpdated();
    } catch (err) {
      setResultMsg({ ok: false, text: err.message || 'Error al liberar memoria' });
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  };

  const handleCleanDisk = async () => {
    setLoading(true);
    setActiveAction('disk');
    setResultMsg(null);
    setActionOutput('');
    try {
      const res = await cleanServerDisk(server.id);
      setResultMsg({ ok: true, text: res.message || 'Limpieza de logs y paquetes completada.' });
      setActionOutput(res.output || '');
      if (onServerUpdated) onServerUpdated();
    } catch (err) {
      setResultMsg({ ok: false, text: err.message || 'Error al limpiar disco' });
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-void-base/85 backdrop-blur-sm">
      <div className="bg-elevated-surface rounded-cards-lg w-full max-w-4xl border border-border-smoke flex flex-col h-[85vh] max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-border-smoke/70 flex items-center justify-between gap-3 flex-shrink-0 bg-deep-panel/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-nodes bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.2)]">
              <Power className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-cloud-white">Control de Energía & Mantenimiento</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-pills bg-white/5 border border-white/10 text-electric-cyan">
                  {server.name}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-pills bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                  {server.metrics?.uptime ? `Uptime: ${server.metrics.uptime}` : 'En línea'}
                </span>
              </div>
              <p className="text-xs font-mono text-fog-text">
                Reinicio, apagado, purga de memoria RAM y optimización de disco
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

        {/* Global status notice / result banner */}
        {resultMsg && (
          <div
            className={`mx-4 mt-3 flex-shrink-0 p-3 rounded-inputs text-xs font-mono flex items-center gap-2 ${
              resultMsg.ok
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
            }`}
          >
            {resultMsg.ok ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            )}
            <span>{resultMsg.text}</span>
          </div>
        )}

        {/* Rebooting status tracker */}
        {rebooting && (
          <div className="mx-4 mt-3 p-4 rounded-cards bg-amber-500/10 border border-amber-500/30 text-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <RotateCw className="w-5 h-5 animate-spin text-amber-400" />
              <div>
                <p className="text-xs font-mono font-semibold text-amber-300">
                  Servidor reiniciándose... ({rebootSeconds}s transcurridos)
                </p>
                <p className="text-[11px] font-mono text-amber-200/70">
                  Esperando que los servicios de red y el daemon SSH vuelvan a responder.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono bg-amber-400/20 px-2.5 py-1 rounded-pills text-amber-300 animate-pulse">
              Reconectando...
            </span>
          </div>
        )}

        {/* Confirmation Overlay Modal for Reboot or Shutdown */}
        {confirmStep && (
          <div className="p-4 mx-4 mt-3 rounded-cards bg-rose-950/40 border border-rose-500/40 text-xs font-mono">
            <div className="flex items-start gap-3 mb-3">
              <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-rose-200">
                  {confirmStep === 'confirm-reboot' ? '¿Confirmar Reinicio del Servidor?' : '¿Confirmar Apagado del Servidor?'}
                </h4>
                <p className="text-xs text-fog-text mt-1">
                  {confirmStep === 'confirm-reboot'
                    ? 'Se cerrarán las conexiones y sesiones activas. El servidor volverá a estar disponible en aproximadamente 1 a 2 minutos.'
                    : '¡ADVERTENCIA! El servidor se apagará por completo. Para volver a encenderlo, deberás acceder a la consola o panel web de tu proveedor de VPS.'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-smoke/40">
              <button
                onClick={() => { setConfirmStep(null); setConfirmInput(''); }}
                className="px-3 py-1.5 rounded-inputs border border-border-smoke text-fog-text hover:text-cloud-white hover:bg-white/5 transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmStep === 'confirm-reboot' ? handleReboot : handleShutdown}
                disabled={loading}
                className="btn-cyan-primary px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center gap-2 border-rose-500 shadow-[0_0_12px_rgba(225,29,72,0.4)]"
              >
                <Power className="w-3.5 h-3.5" />
                <span>
                  {loading ? 'Procesando...' : confirmStep === 'confirm-reboot' ? 'Sí, Reiniciar Servidor' : 'Sí, Apagar Servidor'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Body Grid of Operations */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Reiniciar Servidor */}
            <div className="p-4 rounded-cards bg-deep-panel border border-border-smoke/70 flex flex-col justify-between hover:border-amber-500/40 transition">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-nodes bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <RotateCw className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-sm font-semibold text-cloud-white">Reiniciar Servidor</h3>
                  </div>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-pills">
                    Graceful Reboot
                  </span>
                </div>
                <p className="text-xs text-fog-text leading-relaxed font-sans mb-4">
                  Envía la señal ordenada de reinicio al sistema operativo (<code>systemctl reboot</code>). Los servicios y contenedores se detendrán de forma limpia antes de reiniciar la máquina.
                </p>
              </div>

              <div className="pt-3 border-t border-border-smoke/40 flex items-center justify-between">
                <span className="text-[10px] font-mono text-fog-text">Tiempo estimado: ~60s</span>
                <button
                  onClick={() => setConfirmStep('confirm-reboot')}
                  disabled={loading || rebooting}
                  className="px-3.5 py-1.5 rounded-inputs bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 hover:border-amber-400 font-mono text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Reiniciar</span>
                </button>
              </div>
            </div>

            {/* Card 2: Apagar Servidor */}
            <div className="p-4 rounded-cards bg-deep-panel border border-border-smoke/70 flex flex-col justify-between hover:border-rose-500/40 transition">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-nodes bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                      <Power className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-sm font-semibold text-cloud-white">Apagar Servidor</h3>
                  </div>
                  <span className="text-[10px] font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-pills">
                    Shutdown
                  </span>
                </div>
                <p className="text-xs text-fog-text leading-relaxed font-sans mb-4">
                  Apaga por completo la instancia (<code>systemctl poweroff</code>). Ten en cuenta que para volver a encenderlo requerirás acceso al panel de control de tu proveedor de VPS.
                </p>
              </div>

              <div className="pt-3 border-t border-border-smoke/40 flex items-center justify-between">
                <span className="text-[10px] font-mono text-rose-400/80">Requiere panel de proveedor</span>
                <button
                  onClick={() => setConfirmStep('confirm-shutdown')}
                  disabled={loading || rebooting}
                  className="px-3.5 py-1.5 rounded-inputs bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 hover:border-rose-400 font-mono text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>Apagar</span>
                </button>
              </div>
            </div>

            {/* Card 3: Liberar Memoria RAM & Caché */}
            <div className="p-4 rounded-cards bg-deep-panel border border-border-smoke/70 flex flex-col justify-between hover:border-emerald-500/40 transition">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-nodes bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <Cpu className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-sm font-semibold text-cloud-white">Liberar Memoria RAM</h3>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-pills">
                    Drop Caches
                  </span>
                </div>
                <p className="text-xs text-fog-text leading-relaxed font-sans mb-4">
                  Sincroniza escrituras en disco y libera buffers inactivos (PageCache, dentries e inodes) retenidos por el kernel de Linux. 100% seguro, sin interrumpir procesos.
                </p>
              </div>

              <div className="pt-3 border-t border-border-smoke/40 flex items-center justify-between">
                <span className="text-[10px] font-mono text-fog-text">sync && drop_caches</span>
                <button
                  onClick={handleDropCaches}
                  disabled={loading || rebooting}
                  className="btn-cyan-primary px-3.5 py-1.5 text-xs inline-flex items-center gap-1.5"
                >
                  {activeAction === 'caches' && loading ? (
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Cpu className="w-3.5 h-3.5" />
                  )}
                  <span>Liberar RAM</span>
                </button>
              </div>
            </div>

            {/* Card 4: Limpieza de Disco y Logs */}
            <div className="p-4 rounded-cards bg-deep-panel border border-border-smoke/70 flex flex-col justify-between hover:border-electric-cyan/40 transition">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-nodes bg-electric-cyan/10 border border-electric-cyan/30 flex items-center justify-center text-electric-cyan">
                      <HardDrive className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-sm font-semibold text-cloud-white">Limpiar Disco & Logs</h3>
                  </div>
                  <span className="text-[10px] font-mono text-electric-cyan bg-electric-cyan/10 border border-electric-cyan/20 px-2 py-0.5 rounded-pills">
                    Journal & Package Clean
                  </span>
                </div>
                <p className="text-xs text-fog-text leading-relaxed font-sans mb-4">
                  Vacía logs acumulados de <code>systemd-journald</code> anteriores a 3 días y purga la caché de paquetes de <code>apt/yum</code> para liberar espacio de almacenamiento.
                </p>
              </div>

              <div className="pt-3 border-t border-border-smoke/40 flex items-center justify-between">
                <span className="text-[10px] font-mono text-fog-text">journalctl vacuum + apt clean</span>
                <button
                  onClick={handleCleanDisk}
                  disabled={loading || rebooting}
                  className="btn-cyan-secondary px-3.5 py-1.5 text-xs inline-flex items-center gap-1.5"
                >
                  {activeAction === 'disk' && loading ? (
                    <RotateCw className="w-3.5 h-3.5 animate-spin text-electric-cyan" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>Limpiar Disco</span>
                </button>
              </div>
            </div>
          </div>

          {/* Action Output Console */}
          {actionOutput && (
            <div className="mt-4 p-4 rounded-cards bg-void-base border border-border-smoke space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-fog-text">
                <span className="flex items-center gap-1.5 text-electric-cyan font-semibold">
                  <Terminal className="w-3.5 h-3.5" />
                  Resultado de la ejecución
                </span>
                <button
                  onClick={() => setActionOutput('')}
                  className="hover:text-cloud-white transition"
                >
                  Limpiar salida
                </button>
              </div>
              <pre className="text-[11px] font-mono text-cloud-white/90 whitespace-pre-wrap overflow-x-auto max-h-48 p-2 rounded bg-deep-panel/60 border border-border-smoke/40 leading-relaxed">
                {actionOutput}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

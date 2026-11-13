import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  Plus,
  Trash2,
  RefreshCw,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { fetchCronJobs, saveCronJob } from '../services/api';

const PRESETS = [
  { label: 'Cada hora', value: '0 * * * *' },
  { label: 'Cada día a medianoche', value: '0 0 * * *' },
  { label: 'Cada semana (lunes)', value: '0 0 * * 1' },
  { label: 'Cada mes', value: '0 0 1 * *' }
];

const MINUTES = ['*', ...Array.from({ length: 60 }, (_, i) => String(i))];
const HOURS = ['*', ...Array.from({ length: 24 }, (_, i) => String(i))];
const DAYS = ['*', ...Array.from({ length: 31 }, (_, i) => String(i + 1))];
const MONTHS = ['*', ...Array.from({ length: 12 }, (_, i) => String(i + 1))];
const WEEKDAYS = ['*', '0 (Dom)', '1 (Lun)', '2 (Mar)', '3 (Mié)', '4 (Jue)', '5 (Vie)', '6 (Sáb)'];

function getNextRunPreview(expr) {
  try {
    const parts = expr.trim().split(/\s+/);
    if (parts.length !== 5) return null;
    const [min, hr, dom, mon, dow] = parts;
    const now = new Date();
    // Simple human-readable display — not a full cron parser
    if (expr === '0 * * * *') return 'Próxima hora en punto';
    if (expr === '0 0 * * *') return 'Mañana a medianoche';
    if (expr === '0 0 * * 1') return 'Próximo lunes a medianoche';
    if (expr === '0 0 1 * *') return 'El día 1 del próximo mes';
    const hrStr = hr === '*' ? 'cada hora' : `las ${hr}:${min === '*' ? '00' : min.padStart(2, '0')}`;
    const dayStr = dom === '*' && dow === '*' ? 'todos los días' : dom !== '*' ? `el día ${dom}` : '';
    return `Se ejecuta ${hrStr} ${dayStr}`.trim();
  } catch {
    return null;
  }
}

export default function CronModal({ server, isOpen, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userCrons, setUserCrons] = useState([]);
  const [systemCrons, setSystemCrons] = useState([]);
  const [actionLoading, setActionLoading] = useState({});
  const [success, setSuccess] = useState(null);

  // Form state
  const [manualExpr, setManualExpr] = useState('');
  const [command, setCommand] = useState('');
  const [useVisual, setUseVisual] = useState(true);
  const [visual, setVisual] = useState({ min: '*', hr: '*', dom: '*', mon: '*', dow: '*' });
  const [formLoading, setFormLoading] = useState(false);

  const cronExpr = useVisual
    ? `${visual.min} ${visual.hr} ${visual.dom} ${visual.mon} ${visual.dow.split(' ')[0]}`
    : manualExpr;

  const loadCrons = async () => {
    if (!server) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCronJobs(server.id);
      setUserCrons(data.userCrons || []);
      setSystemCrons(data.systemCrons || []);
    } catch (err) {
      setError(err.message || 'Error al consultar cron jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && server) {
      setSuccess(null);
      setError(null);
      setCommand('');
      setManualExpr('');
      setVisual({ min: '*', hr: '*', dom: '*', mon: '*', dow: '*' });
      loadCrons();
    }
  }, [isOpen, server?.id]);

  if (!isOpen || !server) return null;

  const applyPreset = (expr) => {
    setManualExpr(expr);
    setUseVisual(false);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!cronExpr.trim() || !command.trim()) return;
    setFormLoading(true);
    setSuccess(null);
    try {
      await saveCronJob(server.id, {
        cronExpression: cronExpr,
        command: command.trim(),
        operation: 'add'
      });
      setSuccess('Cron job añadido correctamente');
      setCommand('');
      setManualExpr('');
      setVisual({ min: '*', hr: '*', dom: '*', mon: '*', dow: '*' });
      await loadCrons();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message || 'Error al guardar cron job');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (cron) => {
    const key = cron.raw;
    setActionLoading((prev) => ({ ...prev, [key]: true }));
    try {
      await saveCronJob(server.id, { operation: 'delete', originalLine: cron.raw });
      await loadCrons();
    } catch (err) {
      alert(`Error al eliminar: ${err.message}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const preview = getNextRunPreview(cronExpr);

  const selectClass =
    'bg-void-base border border-border-smoke rounded-inputs px-2 py-1.5 text-xs font-mono text-cloud-white focus:outline-none focus:border-electric-cyan';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-void-base/85 backdrop-blur-sm">
      <div className="bg-elevated-surface rounded-cards-lg w-full max-w-3xl border border-border-smoke flex flex-col max-h-[88vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-border-smoke/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-nodes bg-white/5 border border-electric-cyan/30 flex items-center justify-center text-electric-cyan shadow-[0_0_10px_rgba(23,186,237,0.2)]">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-medium text-cloud-white">Gestor de Cron Jobs</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-pills bg-white/5 border border-white/10 text-electric-cyan">
                  {server.name}
                </span>
              </div>
              <p className="text-xs font-mono text-fog-text">Programa tareas automáticas en el servidor</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadCrons}
              disabled={loading}
              className="btn-cyan-icon p-2 text-xs"
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

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-cards bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="p-3 rounded-cards bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* User Crons */}
          <section>
            <h3 className="text-xs font-mono font-semibold text-ash-text uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-electric-cyan" />
              Cron Jobs del Usuario
            </h3>
            {loading ? (
              <div className="flex items-center gap-2 text-xs font-mono text-fog-text py-4 justify-center">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-electric-cyan" />
                Cargando cron jobs...
              </div>
            ) : userCrons.length === 0 ? (
              <div className="text-xs font-mono text-fog-text py-4 text-center bg-deep-panel rounded-cards border border-border-smoke/60">
                No hay cron jobs configurados para el usuario
              </div>
            ) : (
              <div className="space-y-1.5">
                {userCrons.map((cron, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-cards bg-deep-panel border border-border-smoke/60 flex items-center gap-3 hover:border-white/10 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded-pills bg-electric-cyan/10 border border-electric-cyan/20 text-electric-cyan">
                          {cron.minute} {cron.hour} {cron.dom} {cron.month} {cron.dow}
                        </span>
                        <span className="font-mono text-xs text-ash-text truncate max-w-[300px]" title={cron.command}>
                          {cron.command}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(cron)}
                      disabled={actionLoading[cron.raw]}
                      className="p-1.5 rounded-pills text-fog-text hover:text-rose-400 hover:bg-rose-500/10 transition flex-shrink-0"
                      title="Eliminar"
                    >
                      {actionLoading[cron.raw] ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-electric-cyan" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* System Crons */}
          {systemCrons.length > 0 && (
            <section>
              <h3 className="text-xs font-mono font-semibold text-ash-text uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ChevronRight className="w-3.5 h-3.5 text-fog-text" />
                Cron del Sistema (/etc/cron.d/)
              </h3>
              <div className="space-y-1">
                {systemCrons.map((name, i) => (
                  <div
                    key={i}
                    className="px-3 py-2 rounded-cards bg-deep-panel border border-border-smoke/40 font-mono text-xs text-fog-text"
                  >
                    {name}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Add New Cron Form */}
          <section className="p-4 rounded-cards bg-deep-panel border border-border-smoke/60 space-y-3">
            <div className="flex items-center gap-2 text-cloud-white text-sm font-medium">
              <Plus className="w-4 h-4 text-electric-cyan" />
              <span>Nuevo Cron Job</span>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => applyPreset(p.value)}
                  className="px-2.5 py-1 rounded-pills text-[10px] font-mono bg-white/5 border border-white/10 text-ash-text hover:border-electric-cyan/40 hover:text-electric-cyan transition"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Toggle visual/manual */}
            <div className="flex items-center gap-2 text-xs font-mono text-fog-text">
              <button
                type="button"
                onClick={() => setUseVisual(true)}
                className={`px-2.5 py-1 rounded-pills border transition ${
                  useVisual
                    ? 'border-electric-cyan/40 text-electric-cyan bg-electric-cyan/10'
                    : 'border-white/10 text-fog-text hover:text-cloud-white'
                }`}
              >
                Visual
              </button>
              <button
                type="button"
                onClick={() => setUseVisual(false)}
                className={`px-2.5 py-1 rounded-pills border transition ${
                  !useVisual
                    ? 'border-electric-cyan/40 text-electric-cyan bg-electric-cyan/10'
                    : 'border-white/10 text-fog-text hover:text-cloud-white'
                }`}
              >
                Manual
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-3">
              {useVisual ? (
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { key: 'min', label: 'Min', opts: MINUTES },
                    { key: 'hr', label: 'Hora', opts: HOURS },
                    { key: 'dom', label: 'Día mes', opts: DAYS },
                    { key: 'mon', label: 'Mes', opts: MONTHS },
                    { key: 'dow', label: 'Semana', opts: WEEKDAYS }
                  ].map(({ key, label, opts }) => (
                    <div key={key}>
                      <label className="block text-[10px] font-mono text-fog-text mb-1">{label}</label>
                      <select
                        value={visual[key]}
                        onChange={(e) => setVisual((v) => ({ ...v, [key]: e.target.value }))}
                        className={selectClass + ' w-full'}
                      >
                        {opts.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-mono text-fog-text mb-1">
                    Expresión cron (min hora día-mes mes día-semana)
                  </label>
                  <input
                    type="text"
                    placeholder="0 * * * *"
                    value={manualExpr}
                    onChange={(e) => setManualExpr(e.target.value)}
                    className="w-full bg-void-base border border-border-smoke rounded-inputs px-3 py-2 text-xs font-mono text-cloud-white focus:outline-none focus:border-electric-cyan"
                  />
                </div>
              )}

              {/* Preview */}
              {preview && (
                <p className="text-[10px] font-mono text-electric-cyan/80 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  {preview} —{' '}
                  <span className="text-fog-text">
                    {cronExpr}
                  </span>
                </p>
              )}

              <div>
                <label className="block text-xs font-mono text-fog-text mb-1">Comando a ejecutar</label>
                <input
                  type="text"
                  required
                  placeholder="/usr/bin/php /var/www/artisan schedule:run"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  className="w-full bg-void-base border border-border-smoke rounded-inputs px-3 py-2 text-xs font-mono text-cloud-white focus:outline-none focus:border-electric-cyan"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={formLoading || !command.trim()}
                  className="btn-cyan-primary px-5 py-2 text-xs inline-flex items-center gap-2"
                >
                  {formLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>{formLoading ? 'Guardando...' : 'Añadir Cron Job'}</span>
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

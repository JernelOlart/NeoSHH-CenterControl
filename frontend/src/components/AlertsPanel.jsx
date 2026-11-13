import React, { useState } from 'react';
import {
  WifiOff,
  HardDrive,
  MemoryStick,
  X,
  Bell,
  ChevronDown,
  AlertTriangle
} from 'lucide-react';
import { useAlerts } from '../hooks/useAlerts';

export default function AlertsPanel({ servers = [] }) {
  const { alerts, dismissAlert, clearAlerts } = useAlerts(servers);
  const [isMinimized, setIsMinimized] = useState(false);

  if (!alerts || alerts.length === 0) return null;

  const visibleAlerts = alerts.slice(0, 5);
  const overflowCount = Math.max(0, alerts.length - 5);

  // If user has minimized the panel, show floating badge button with count
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-[100]">
        <button
          onClick={() => setIsMinimized(false)}
          className="relative bg-deep-panel border border-rose-500/50 hover:border-rose-400 p-3 rounded-full text-cloud-white shadow-2xl flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 group"
          title={`${alerts.length} alertas activas`}
        >
          <Bell className="w-5 h-5 text-rose-400 group-hover:animate-bounce" />
          <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-mono text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border border-void-base shadow-md">
            {alerts.length > 9 ? '9+' : alerts.length}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {/* Header controls for alert stack */}
      <div className="flex items-center justify-between px-1 pointer-events-auto">
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-fog-text">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          <span>Alertas ({alerts.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 rounded text-fog-text hover:text-cloud-white hover:bg-white/5 transition"
            title="Minimizar panel"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={clearAlerts}
            className="text-[10px] font-mono text-fog-text hover:text-rose-300 px-1 py-0.5 rounded transition"
            title="Descartar todas las alertas"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Alert cards stack (max 5 visible) */}
      {visibleAlerts.map((alert) => {
        let borderClass = 'border-rose-500/40';
        let textAccentClass = 'text-rose-400';
        let IconComponent = WifiOff;

        if (alert.type === 'offline') {
          borderClass = 'border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.15)]';
          textAccentClass = 'text-rose-400';
          IconComponent = WifiOff;
        } else if (alert.type === 'disk') {
          borderClass = 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]';
          textAccentClass = 'text-amber-400';
          IconComponent = HardDrive;
        } else if (alert.type === 'ram') {
          borderClass = 'border-yellow-400/50 shadow-[0_0_15px_rgba(250,204,21,0.15)]';
          textAccentClass = 'text-yellow-400';
          IconComponent = MemoryStick;
        }

        return (
          <div
            key={alert.id}
            className={`pointer-events-auto bg-deep-panel border ${borderClass} rounded-cards p-3 text-xs font-mono text-cloud-white shadow-lg min-w-[280px] max-w-[340px] flex items-start justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200`}
          >
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <div className={`mt-0.5 flex-shrink-0 ${textAccentClass}`}>
                <IconComponent className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-tight text-cloud-white break-words">
                  {alert.message}
                </p>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-fog-text">
                  <span className="truncate">{alert.serverName}</span>
                  <span>•</span>
                  <span>hace un momento</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => dismissAlert(alert.id)}
              className="flex-shrink-0 p-1 -mr-1 -mt-1 rounded hover:bg-white/10 text-fog-text hover:text-cloud-white transition"
              title="Cerrar alerta"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}

      {/* Overflow badge if more than 5 alerts */}
      {overflowCount > 0 && (
        <div className="pointer-events-auto self-end">
          <button
            onClick={() => setIsMinimized(true)}
            className="text-[10px] font-mono px-2 py-0.5 rounded-pills bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30 transition flex items-center gap-1"
          >
            <span>+{overflowCount} más en cola</span>
          </button>
        </div>
      )}
    </div>
  );
}

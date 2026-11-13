import React from 'react';
import { X, RefreshCw, Terminal, ExternalLink, HardDrive, Cpu, MemoryStick, Clock, ArrowRight } from 'lucide-react';

export default function MetricsDetailModal({
  server,
  isOpen,
  onClose,
  onConnectWeb,
  onRefresh,
  isRefreshing
}) {
  if (!isOpen || !server) return null;

  const metrics = server.metrics;

  const openMacTerminal = () => {
    const sshUrl = `ssh://${server.username}@${server.host}:${server.port || 22}`;
    window.location.href = sshUrl;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-void-base/85 backdrop-blur-sm">
      <div className="bg-elevated-surface rounded-cards-lg w-full max-w-2xl border border-border-smoke flex flex-col max-h-[92vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border-smoke/60 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-pills bg-electric-cyan/10 border border-electric-cyan/30 text-electric-cyan">
                TELEMETRÍA DE HARDWARE
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-pills bg-white/5 border border-white/10 text-fog-text">
                {server.provider || 'VPS'}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-medium text-cloud-white mt-1 truncate">
              {server.name}
            </h2>
            <p className="text-xs font-mono text-fog-text mt-0.5">
              {server.username}@{server.host}:{server.port || 22}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onRefresh(server.id)}
              disabled={isRefreshing}
              className="btn-cyan-icon p-2 disabled:opacity-40"
              title="Actualizar métricas"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-electric-cyan' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-pills text-fog-text hover:text-cloud-white hover:bg-muted-shell transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {!metrics ? (
            <div className="text-center py-10">
              <span className="text-xs font-mono px-3 py-1 rounded-pills bg-white/5 text-fog-text block max-w-fit mx-auto mb-3">
                SIN DATOS DE TELEMETRÍA
              </span>
              <p className="text-xs sm:text-sm text-fog-text max-w-md mx-auto leading-relaxed">
                No se han recopilado métricas aún. Haz clic en el botón para conectar por SSH y extraer información del sistema en tiempo real.
              </p>
              <button
                onClick={() => onRefresh(server.id)}
                disabled={isRefreshing}
                className="mt-6 btn-cyan-primary px-5 py-2.5 text-xs sm:text-sm"
              >
                <span>{isRefreshing ? 'Consultando...' : 'Obtener Telemetría Ahora'}</span>
                <ArrowRight className="w-4 h-4 opacity-80" />
              </button>
            </div>
          ) : (
            <>
              {/* Quick Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                <div className="bg-void-base p-3 rounded-nodes border border-white/5">
                  <span className="text-[10px] font-mono uppercase text-fog-text block">Sistema</span>
                  <span className="text-xs font-mono font-medium text-cloud-white mt-1 block truncate" title={metrics.os}>
                    {metrics.os}
                  </span>
                </div>
                <div className="bg-void-base p-3 rounded-nodes border border-white/5">
                  <span className="text-[10px] font-mono uppercase text-fog-text block">Kernel</span>
                  <span className="text-xs font-mono text-ash-text mt-1 block truncate" title={metrics.kernel}>
                    {metrics.kernel || '--'}
                  </span>
                </div>
                <div className="bg-void-base p-3 rounded-nodes border border-white/5">
                  <span className="text-[10px] font-mono uppercase text-fog-text block">Hostname</span>
                  <span className="text-xs font-mono font-medium text-cloud-white mt-1 block truncate" title={metrics.hostname}>
                    {metrics.hostname}
                  </span>
                </div>
                <div className="bg-void-base p-3 rounded-nodes border border-white/5">
                  <span className="text-[10px] font-mono uppercase text-fog-text block">Uptime</span>
                  <span className="text-xs font-mono text-cloud-white mt-1 block truncate" title={metrics.uptime}>
                    {metrics.uptime || '--'}
                  </span>
                </div>
              </div>

              {/* Hardware: CPU & RAM */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* CPU */}
                <div className="bg-deep-panel p-4 rounded-cards border border-border-smoke/60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono uppercase text-cloud-white">Procesador (CPU)</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-pills bg-white/5 text-cloud-white">
                      {metrics.cpuCores} {metrics.cpuCores === 1 ? 'core' : 'cores'}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-fog-text truncate mb-3" title={metrics.cpuModel}>
                    {metrics.cpuModel || 'CPU Genérica'}
                  </p>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-fog-text block mb-1">Carga promedio (Load Avg):</span>
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="px-2 py-1 bg-void-base border border-white/5 rounded text-cloud-white">
                        1m: {metrics.loadAvg?.[0] ?? '--'}
                      </span>
                      <span className="px-2 py-1 bg-void-base border border-white/5 rounded text-cloud-white">
                        5m: {metrics.loadAvg?.[1] ?? '--'}
                      </span>
                      <span className="px-2 py-1 bg-void-base border border-white/5 rounded text-cloud-white">
                        15m: {metrics.loadAvg?.[2] ?? '--'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* RAM */}
                <div className="bg-deep-panel p-4 rounded-cards border border-border-smoke/60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono uppercase text-cloud-white">Memoria RAM</span>
                    <span className="text-xs font-mono font-medium text-cloud-white">
                      {metrics.memory?.percent || 0}%
                    </span>
                  </div>
                  <div className="w-full bg-void-base h-2 rounded-pills overflow-hidden mb-3 border border-white/5">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-electric-cyan h-full transition-all duration-300"
                      style={{ width: `${metrics.memory?.percent || 0}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
                    <div className="bg-void-base p-2 rounded border border-white/5">
                      <span className="text-[10px] text-fog-text block">Total</span>
                      <span className="text-cloud-white font-medium">
                        {metrics.memory?.totalMb ? `${(metrics.memory.totalMb / 1024).toFixed(1)} GB` : '--'}
                      </span>
                    </div>
                    <div className="bg-void-base p-2 rounded border border-white/5">
                      <span className="text-[10px] text-fog-text block">En uso</span>
                      <span className="text-electric-cyan font-medium">
                        {metrics.memory?.usedMb ? `${(metrics.memory.usedMb / 1024).toFixed(1)} GB` : '--'}
                      </span>
                    </div>
                    <div className="bg-void-base p-2 rounded border border-white/5">
                      <span className="text-[10px] text-fog-text block">Libre</span>
                      <span className="text-cloud-white font-medium">
                        {metrics.memory?.availableMb ? `${(metrics.memory.availableMb / 1024).toFixed(1)} GB` : '--'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Particiones de Almacenamiento */}
              <div className="bg-deep-panel p-4 rounded-cards border border-border-smoke/60">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono uppercase text-cloud-white">
                    Particiones de Almacenamiento ({metrics.disks?.length || 0})
                  </span>
                </div>

                {metrics.disks && metrics.disks.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-xs">
                      <thead>
                        <tr className="border-b border-border-smoke/60 text-fog-text text-[10px] uppercase">
                          <th className="pb-2">Punto Montaje</th>
                          <th className="pb-2">Dispositivo</th>
                          <th className="pb-2">Tamaño</th>
                          <th className="pb-2">Usado</th>
                          <th className="pb-2">Disponible</th>
                          <th className="pb-2">Uso</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-smoke/30">
                        {metrics.disks.map((d, i) => (
                          <tr key={i} className="hover:bg-void-base/50">
                            <td className="py-2.5 text-cloud-white font-medium">{d.mount}</td>
                            <td className="py-2.5 text-fog-text truncate max-w-[120px]">{d.filesystem}</td>
                            <td className="py-2.5 text-ash-text">{d.size}</td>
                            <td className="py-2.5 text-electric-cyan">{d.used}</td>
                            <td className="py-2.5 text-fog-text">{d.avail}</td>
                            <td className="py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-14 bg-void-base h-1.5 rounded-pills overflow-hidden border border-white/5">
                                  <div
                                    className="bg-gradient-to-r from-cyan-600 to-electric-cyan h-full"
                                    style={{ width: `${d.percent}%` }}
                                  />
                                </div>
                                <span className="text-cloud-white">{d.percent}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs font-mono text-fog-text">No se detectaron particiones.</p>
                )}
              </div>

              {/* Servicios y Puertos Activos */}
              <div className="bg-deep-panel p-4 rounded-cards border border-border-smoke/60">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono uppercase text-cloud-white">
                    Servicios y Puertos en Escucha ({metrics.services?.length || 0})
                  </span>
                </div>

                {metrics.services && metrics.services.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {metrics.services.map((s, i) => {
                      const isWebPort = [80, 443, 8080, 3000, 8000].includes(s.port);
                      return (
                        <div
                          key={i}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-pills text-xs font-mono border ${
                            isWebPort
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                              : 'bg-void-base border-white/10 text-ash-text'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isWebPort ? 'bg-emerald-400' : 'bg-electric-cyan'}`} />
                          <span className="font-bold">:{s.port}</span>
                          <span className="text-fog-text text-[10px]">({s.process || s.proto})</span>
                          {isWebPort && (
                            <a
                              href={`http://${server.host}:${s.port}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-400 hover:underline text-[10px] ml-1"
                              title="Abrir servicio web"
                            >
                              ↗
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs font-mono text-fog-text">
                    No se detectaron puertos abiertos o el comando requiere privilegios sudo.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border-smoke/60 bg-void-base/60 flex items-center justify-between">
          <span className="text-[11px] font-mono text-fog-text truncate max-w-[200px] sm:max-w-none">
            Verificado: {server.lastChecked ? new Date(server.lastChecked).toLocaleString() : 'Nunca'}
          </span>
          <div className="flex items-center gap-2.5">
            <button
              onClick={openMacTerminal}
              className="btn-cyan-secondary px-4 py-2 text-xs"
            >
              <ExternalLink className="w-3.5 h-3.5 text-electric-cyan" />
              <span>Terminal Mac</span>
            </button>
            <button
              onClick={() => {
                onClose();
                onConnectWeb(server);
              }}
              className="btn-cyan-primary px-5 py-2 text-xs font-semibold"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Conectar Web</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-80" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

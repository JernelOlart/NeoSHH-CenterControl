import React from 'react';
import { Server, CheckCircle2, MemoryStick, HardDrive } from 'lucide-react';

export default function StatsSummary({ servers }) {
  const total = servers.length;
  const online = servers.filter((s) => s.status === 'online').length;
  const offline = servers.filter((s) => s.status === 'offline').length;

  let totalRamMb = 0;
  let totalDisks = 0;

  servers.forEach((s) => {
    if (s.metrics?.memory?.totalMb) totalRamMb += s.metrics.memory.totalMb;
    if (s.metrics?.disks?.length) totalDisks += s.metrics.disks.length;
  });

  const ramGb = (totalRamMb / 1024).toFixed(1);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mb-5">
      {/* Total VPS */}
      <div className="card-inset-glow rounded-cards p-3 sm:p-3.5 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono uppercase text-fog-text block">Total Servidores</span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="font-display-light text-xl sm:text-2xl text-cloud-white font-medium">
              {total}
            </span>
            <span className="text-[11px] text-fog-text">nodos</span>
          </div>
        </div>
        <div className="w-7 h-7 rounded-nodes bg-white/5 flex items-center justify-center text-fog-text">
          <Server className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Online Status */}
      <div className="card-inset-glow rounded-cards p-3 sm:p-3.5 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono uppercase text-fog-text block">Estado Online</span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="font-display-light text-xl sm:text-2xl text-electric-cyan font-medium">
              {online}
            </span>
            {offline > 0 ? (
              <span className="text-[10px] text-rose-400 font-mono">({offline} off)</span>
            ) : (
              <span className="text-[11px] text-fog-text">activos</span>
            )}
          </div>
        </div>
        <div className="w-7 h-7 rounded-nodes bg-electric-cyan/10 flex items-center justify-center text-electric-cyan">
          <span className="w-2 h-2 rounded-full bg-electric-cyan animate-pulse shadow-[0_0_8px_rgba(23,186,237,0.9)]" />
        </div>
      </div>

      {/* RAM Total */}
      <div className="card-inset-glow rounded-cards p-3 sm:p-3.5 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono uppercase text-fog-text block">RAM Asignada</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="font-display-light text-xl sm:text-2xl text-cloud-white font-medium">
              {ramGb > 0 ? ramGb : '--'}
            </span>
            <span className="text-[11px] text-fog-text">GB</span>
          </div>
        </div>
        <div className="w-7 h-7 rounded-nodes bg-white/5 flex items-center justify-center text-fog-text">
          <MemoryStick className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Discos / Particiones */}
      <div className="card-inset-glow rounded-cards p-3 sm:p-3.5 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono uppercase text-fog-text block">Almacenamiento</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="font-display-light text-xl sm:text-2xl text-cloud-white font-medium">
              {totalDisks > 0 ? totalDisks : '--'}
            </span>
            <span className="text-[11px] text-fog-text">particiones</span>
          </div>
        </div>
        <div className="w-7 h-7 rounded-nodes bg-white/5 flex items-center justify-center text-fog-text">
          <HardDrive className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
}

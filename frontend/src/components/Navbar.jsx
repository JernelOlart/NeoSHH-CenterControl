import React, { useState } from 'react';
import { Plus, RefreshCw, Search, Terminal, X, ArrowRight, Zap, Globe, Github, ExternalLink } from 'lucide-react';

export default function Navbar({
  searchTerm,
  setSearchTerm,
  selectedTag,
  setSelectedTag,
  allTags,
  onAddServer,
  onRefreshAll,
  isRefreshingAll
}) {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full bg-void-base/95 border-b border-border-smoke backdrop-blur-md">
      <div className="max-w-[1240px] mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-[66px] flex items-center justify-between gap-3 sm:gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-nodes bg-elevated-surface border border-electric-cyan/30 flex items-center justify-center relative overflow-hidden shadow-[0_0_12px_rgba(23,186,237,0.25)]">
            <Zap className="w-4 h-4 text-electric-cyan fill-electric-cyan" />
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-electric-cyan blur-[2px] rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-display-light text-xl sm:text-2xl text-cloud-white tracking-tight">
              NeoShh <span className="text-electric-cyan font-normal">Control</span>
            </span>
            <div className="hidden lg:flex items-center gap-1.5 ml-2 pl-3 border-l border-border-smoke/70">
              <a
                href="https://neotechsolutions.mx"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-mono text-fog-text hover:text-electric-cyan transition flex items-center gap-1"
                title="neotechsolutions.mx"
              >
                <span>neotech</span>
              </a>
              <span className="text-border-smoke text-xs">•</span>
              <a
                href="https://github.com/JernelOlart"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-mono text-fog-text hover:text-electric-cyan transition flex items-center gap-1"
                title="GitHub @JernelOlart"
              >
                <Github className="w-3 h-3 text-electric-cyan" />
                <span>@JernelOlart</span>
              </a>
            </div>
          </div>
        </div>

        {/* Center: Search & Filter (Desktop / Tablet) */}
        <div className="hidden md:flex items-center gap-2 flex-1 max-w-lg min-w-0 mx-2 sm:mx-4">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-fog-text absolute left-3.5 top-1/2 -translate-y-1/2 flex-shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, host, proveedor..."
              className="w-full pl-9 pr-3 py-1.5 bg-elevated-surface border border-border-smoke rounded-pills text-xs sm:text-sm text-ash-text placeholder-fog-text focus:outline-none focus:border-electric-cyan/40 transition truncate"
            />
          </div>

          {allTags.length > 0 && (
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="bg-elevated-surface border border-border-smoke rounded-pills text-xs text-ash-text px-3 py-1.5 focus:outline-none focus:border-electric-cyan/40 cursor-pointer flex-shrink-0 max-w-[160px]"
            >
              <option value="">Todas las etiquetas</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  #{tag}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Action CTAs */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Mobile search toggle */}
          <button
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            className="md:hidden p-2 rounded-pills bg-elevated-surface border border-border-smoke text-fog-text hover:text-cloud-white"
            title="Buscar"
          >
            {mobileSearchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          </button>

          {/* Secondary Button: Dark Teal Pill */}
          <button
            onClick={onRefreshAll}
            disabled={isRefreshingAll}
            className="btn-cyan-secondary px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm disabled:opacity-40"
            title="Actualizar estado de todos los VPS"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingAll ? 'animate-spin text-electric-cyan' : ''}`} />
            <span className="hidden sm:inline">Refrescar</span>
          </button>

          {/* Primary Button: Electric Cyan Pill */}
          <button
            onClick={onAddServer}
            className="btn-cyan-primary px-4 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar VPS</span>
            <ArrowRight className="w-3.5 h-3.5 opacity-80" />
          </button>
        </div>
      </div>

      {/* Mobile search panel dropdown */}
      {mobileSearchOpen && (
        <div className="md:hidden px-4 pb-3 pt-1 border-t border-border-smoke/60 bg-elevated-surface/90 flex flex-col gap-2">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-fog-text absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, host, proveedor..."
              className="w-full pl-9 pr-3 py-2 bg-void-base border border-border-smoke rounded-pills text-xs text-ash-text placeholder-fog-text focus:outline-none"
            />
          </div>
          {allTags.length > 0 && (
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="w-full bg-void-base border border-border-smoke rounded-pills text-xs text-ash-text px-3 py-2 focus:outline-none"
            >
              <option value="">Todas las etiquetas</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  #{tag}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </header>
  );
}

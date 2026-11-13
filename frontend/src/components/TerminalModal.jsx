import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { X, Maximize2, Minimize2, Trash2, Terminal as TerminalIcon } from 'lucide-react';

export default function TerminalModal({
  activeSessions,
  activeSessionId,
  onSelectTab,
  onCloseTab,
  onCloseAll
}) {
  const terminalRef = useRef(null);
  const xtermInstance = useRef(null);
  const fitAddonInstance = useRef(null);
  const socketRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connected, setConnected] = useState(false);

  const currentServer = activeSessions.find((s) => s.id === activeSessionId) || activeSessions[0];

  useEffect(() => {
    if (!currentServer || !terminalRef.current) return;

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    if (xtermInstance.current) {
      xtermInstance.current.dispose();
      xtermInstance.current = null;
    }

    const term = new XTerm({
      cursorBlink: true,
      cursorStyle: 'block',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 13,
      lineHeight: 1.25,
      theme: {
        background: '#0e0918',
        foreground: '#d1cece',
        cursor: '#17baed',
        cursorAccent: '#081a26',
        selectionBackground: 'rgba(23, 186, 237, 0.35)',
        black: '#0e0918',
        red: '#ff492c',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#17baed',
        magenta: '#818cf8',
        cyan: '#17baed',
        white: '#ffffff',
        brightBlack: '#3e3a46',
        brightRed: '#ff6e6e',
        brightGreen: '#34d399',
        brightYellow: '#fbbf24',
        brightBlue: '#60a5fa',
        brightMagenta: '#a78bfa',
        brightCyan: '#67e8f9',
        brightWhite: '#ffffff'
      }
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());

    term.open(terminalRef.current);
    fitAddon.fit();

    xtermInstance.current = term;
    fitAddonInstance.current = fitAddon;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/terminal?serverId=${currentServer.id}`;

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setTimeout(() => {
        fitAddon.fit();
        ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
      }, 300);
    };

    ws.onmessage = (event) => {
      term.write(event.data);
    };

    ws.onerror = (err) => {
      console.error('WebSocket Error:', err);
      term.write('\r\n\x1b[31m[Error de comunicación WebSocket]\x1b[0m\r\n');
      setConnected(false);
    };

    ws.onclose = () => {
      setConnected(false);
    };

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    const handleResize = () => {
      if (fitAddonInstance.current && xtermInstance.current && ws.readyState === WebSocket.OPEN) {
        try {
          fitAddonInstance.current.fit();
          ws.send(
            JSON.stringify({
              type: 'resize',
              cols: xtermInstance.current.cols,
              rows: xtermInstance.current.rows
            })
          );
        } catch (e) {
          // ignore
        }
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (ws) ws.close();
      if (term) term.dispose();
    };
  }, [currentServer?.id]);

  if (!currentServer || activeSessions.length === 0) return null;

  const handleClear = () => {
    if (xtermInstance.current) xtermInstance.current.clear();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-void-base/85 backdrop-blur-md">
      <div
        className={`bg-void-base text-ash-text rounded-cards-lg flex flex-col overflow-hidden border border-border-smoke shadow-2xl transition-all duration-200 ${
          isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-5xl h-[86vh] sm:h-[82vh]'
        }`}
      >
        {/* Tab Bar & Inverted Controls */}
        <div className="bg-elevated-surface px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-3 border-b border-border-smoke">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto flex-1 mr-2">
            {activeSessions.map((s) => {
              const isActive = s.id === currentServer.id;
              return (
                <div
                  key={s.id}
                  onClick={() => onSelectTab(s.id)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1 sm:py-1.5 rounded-pills text-xs font-mono cursor-pointer transition select-none flex-shrink-0 ${
                    isActive
                      ? 'bg-electric-cyan text-dark-teal font-semibold shadow-[0_0_12px_rgba(23,186,237,0.35)]'
                      : 'btn-cyan-secondary text-ash-text'
                  }`}
                >
                  <TerminalIcon className="w-3 h-3" />
                  <span className="truncate max-w-[100px] sm:max-w-[150px]">{s.name}</span>
                  <span className="opacity-70 text-[10px] hidden xs:inline">({s.host})</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab(s.id);
                    }}
                    className="hover:opacity-100 p-0.5 rounded transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-1.5 sm:gap-2 font-mono text-xs flex-shrink-0">
            <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-pills bg-void-base border border-electric-cyan/20 text-electric-cyan hidden sm:flex">
              <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-electric-cyan shadow-[0_0_6px_rgba(23,186,237,0.8)]' : 'bg-fog-text'}`} />
              {connected ? 'ONLINE' : 'DISCONNECTED'}
            </span>

            <button
              onClick={handleClear}
              title="Limpiar pantalla"
              className="btn-cyan-icon p-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Restaurar' : 'Pantalla Completa'}
              className="btn-cyan-icon p-1.5"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={onCloseAll}
              title="Cerrar terminal"
              className="btn-cyan-icon p-1.5 text-fog-text hover:text-rose-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Terminal Container */}
        <div className="flex-1 bg-void-base p-3 sm:p-4 overflow-hidden relative">
          <div ref={terminalRef} className="w-full h-full" />
        </div>
      </div>
    </div>
  );
}

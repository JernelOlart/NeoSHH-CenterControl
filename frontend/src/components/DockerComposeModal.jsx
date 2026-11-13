import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Layers,
  RefreshCw,
  Play,
  Square,
  Download,
  List,
  FileText,
  AlertCircle,
  FolderOpen,
  Terminal,
  FileCode
} from 'lucide-react';
import {
  findComposeFiles,
  getComposeContent,
  composeAction
} from '../services/api';

// Simple YAML syntax highlighter component for monospace code display
function SimpleYamlViewer({ content }) {
  if (!content) return null;

  const lines = content.split('\n');

  return (
    <pre className="font-mono text-xs leading-relaxed select-text">
      {lines.map((line, idx) => {
        // Comment
        const trimmed = line.trim();
        if (trimmed.startsWith('#')) {
          return (
            <div key={idx} className="text-fog-text italic">
              {line}
            </div>
          );
        }

        // Match key: value pattern
        const match = line.match(/^(\s*)([-]?\s*)([a-zA-Z0-9_\-\.]+):(.*)$/);
        if (match) {
          const [, indent, bullet, key, rest] = match;
          return (
            <div key={idx}>
              <span className="text-fog-text">{indent}</span>
              {bullet && <span className="text-electric-cyan">{bullet}</span>}
              <span className="text-electric-cyan">{key}</span>
              <span className="text-fog-text">:</span>
              <span className="text-amber-200">{rest}</span>
            </div>
          );
        }

        // Default line
        return (
          <div key={idx} className="text-cloud-white">
            {line}
          </div>
        );
      })}
    </pre>
  );
}

export default function DockerComposeModal({ server, isOpen, onClose }) {
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [composeFiles, setComposeFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [loadingContent, setLoadingContent] = useState(false);
  const [error, setError] = useState(null);

  // Actions & Output
  const [actionLoading, setActionLoading] = useState(null);
  const [output, setOutput] = useState('');
  const outputRef = useRef(null);

  const loadFiles = async () => {
    if (!server) return;
    setLoadingFiles(true);
    setError(null);
    try {
      const data = await findComposeFiles(server.id);
      const files = data.files || [];
      setComposeFiles(files);
      if (files.length > 0) {
        // Select first file if none selected or previous no longer exists
        const fileToSelect = files.includes(selectedFile) ? selectedFile : files[0];
        handleSelectFile(fileToSelect);
      } else {
        setSelectedFile(null);
        setFileContent('');
      }
    } catch (err) {
      setError(err.message || 'Error al buscar archivos docker-compose');
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleSelectFile = async (filePath) => {
    if (!filePath || !server) return;
    setSelectedFile(filePath);
    setLoadingContent(true);
    setError(null);
    try {
      const data = await getComposeContent(server.id, filePath);
      setFileContent(data.content || '');
    } catch (err) {
      setError(err.message || 'Error al leer el archivo compose');
      setFileContent('');
    } finally {
      setLoadingContent(false);
    }
  };

  useEffect(() => {
    if (isOpen && server) {
      setOutput('');
      setSelectedFile(null);
      setFileContent('');
      loadFiles();
    }
  }, [isOpen, server?.id]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  if (!isOpen || !server) return null;

  const handleAction = async (action) => {
    if (!selectedFile || !server) return;
    setActionLoading(action);
    setOutput((prev) => prev ? `${prev}\n\n$ docker compose ${action} [${selectedFile}]\n` : `$ docker compose ${action} [${selectedFile}]\n`);
    try {
      const res = await composeAction(server.id, selectedFile, action);
      setOutput((prev) => prev + (res.output || 'Operación completada sin salida.'));
    } catch (err) {
      setOutput((prev) => prev + `\nError: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-void-base/85 backdrop-blur-sm">
      <div className="bg-elevated-surface rounded-cards-lg w-full max-w-3xl border border-border-smoke flex flex-col max-h-[88vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-border-smoke/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-nodes bg-white/5 border border-electric-cyan/30 flex items-center justify-center text-electric-cyan shadow-[0_0_10px_rgba(23,186,237,0.2)]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-medium text-cloud-white">
                  Docker Compose Manager
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-pills bg-white/5 border border-white/10 text-electric-cyan">
                  {server.name}
                </span>
              </div>
              <p className="text-xs font-mono text-fog-text">
                Gestiona stacks y servicios definidos en docker-compose.yml
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadFiles}
              disabled={loadingFiles}
              className="btn-cyan-icon p-2 text-xs"
              title="Volver a buscar archivos"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingFiles ? 'animate-spin text-electric-cyan' : ''}`} />
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

          {loadingFiles ? (
            <div className="flex items-center justify-center py-16 text-fog-text gap-2 text-xs font-mono">
              <RefreshCw className="w-4 h-4 animate-spin text-electric-cyan" />
              <span>Buscando archivos docker-compose en el servidor...</span>
            </div>
          ) : composeFiles.length === 0 ? (
            <div className="p-8 text-center rounded-cards bg-deep-panel border border-border-smoke/60">
              <FolderOpen className="w-10 h-10 text-fog-text mx-auto mb-2 opacity-50" />
              <h3 className="text-sm font-medium text-cloud-white mb-1">
                No se encontraron archivos docker-compose.yml
              </h3>
              <p className="text-xs text-fog-text max-w-md mx-auto">
                No se encontraron archivos docker-compose.yml en las rutas comunes del servidor (/var/www, /root, /home, /opt, /srv).
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File selector */}
              <div>
                <label className="block text-xs font-mono text-fog-text mb-1.5">
                  Archivos Compose detectados ({composeFiles.length})
                </label>
                <div className="flex flex-wrap gap-2">
                  {composeFiles.map((path) => {
                    const isSelected = path === selectedFile;
                    return (
                      <button
                        key={path}
                        onClick={() => handleSelectFile(path)}
                        className={`px-3 py-1.5 rounded-cards text-xs font-mono transition flex items-center gap-2 border text-left truncate max-w-full ${
                          isSelected
                            ? 'bg-electric-cyan/15 border-electric-cyan text-electric-cyan font-medium'
                            : 'bg-deep-panel border-border-smoke text-ash-text hover:text-cloud-white hover:border-white/20'
                        }`}
                        title={path}
                      >
                        <FileCode className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{path}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons for selected file */}
              {selectedFile && (
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-cards bg-deep-panel border border-border-smoke/60">
                  <div className="flex items-center gap-1.5 font-mono text-xs text-cloud-white truncate">
                    <span className="text-fog-text">Acciones para:</span>
                    <span className="text-electric-cyan truncate max-w-[260px] sm:max-w-md" title={selectedFile}>
                      {selectedFile}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Up -d */}
                    <button
                      onClick={() => handleAction('up')}
                      disabled={Boolean(actionLoading)}
                      className="btn-cyan-primary px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5"
                      title="docker compose up -d"
                    >
                      {actionLoading === 'up' ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Play className="w-3 h-3 fill-current" />
                      )}
                      <span>Up -d</span>
                    </button>

                    {/* Down */}
                    <button
                      onClick={() => handleAction('down')}
                      disabled={Boolean(actionLoading)}
                      className="btn-cyan-secondary px-3 py-1.5 text-xs text-rose-300 border-rose-500/30 hover:border-rose-400/60 hover:text-rose-200 inline-flex items-center gap-1.5"
                      title="docker compose down"
                    >
                      {actionLoading === 'down' ? (
                        <RefreshCw className="w-3 h-3 animate-spin text-rose-400" />
                      ) : (
                        <Square className="w-3 h-3 fill-current" />
                      )}
                      <span>Down</span>
                    </button>

                    {/* Pull */}
                    <button
                      onClick={() => handleAction('pull')}
                      disabled={Boolean(actionLoading)}
                      className="btn-cyan-secondary px-2.5 py-1.5 text-xs inline-flex items-center gap-1.5"
                      title="docker compose pull"
                    >
                      {actionLoading === 'pull' ? (
                        <RefreshCw className="w-3 h-3 animate-spin text-electric-cyan" />
                      ) : (
                        <Download className="w-3 h-3 text-electric-cyan" />
                      )}
                      <span>Pull</span>
                    </button>

                    {/* PS */}
                    <button
                      onClick={() => handleAction('ps')}
                      disabled={Boolean(actionLoading)}
                      className="btn-cyan-secondary px-2.5 py-1.5 text-xs inline-flex items-center gap-1.5"
                      title="docker compose ps"
                    >
                      {actionLoading === 'ps' ? (
                        <RefreshCw className="w-3 h-3 animate-spin text-electric-cyan" />
                      ) : (
                        <List className="w-3 h-3 text-electric-cyan" />
                      )}
                      <span>PS</span>
                    </button>

                    {/* Logs */}
                    <button
                      onClick={() => handleAction('logs')}
                      disabled={Boolean(actionLoading)}
                      className="btn-cyan-secondary px-2.5 py-1.5 text-xs inline-flex items-center gap-1.5"
                      title="docker compose logs"
                    >
                      {actionLoading === 'logs' ? (
                        <RefreshCw className="w-3 h-3 animate-spin text-electric-cyan" />
                      ) : (
                        <FileText className="w-3 h-3 text-electric-cyan" />
                      )}
                      <span>Logs</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Content viewer */}
              {selectedFile && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono text-fog-text">
                    <div className="flex items-center gap-1.5">
                      <FileCode className="w-3.5 h-3.5 text-electric-cyan" />
                      <span>Contenido del archivo</span>
                    </div>
                    {loadingContent && (
                      <span className="flex items-center gap-1 text-electric-cyan">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Cargando...
                      </span>
                    )}
                  </div>
                  <div className="bg-void-base border border-border-smoke rounded-cards p-3 max-h-52 overflow-y-auto overflow-x-auto">
                    {loadingContent ? (
                      <div className="text-fog-text font-mono text-xs py-4 text-center">
                        Leyendo contenido del compose...
                      </div>
                    ) : fileContent ? (
                      <SimpleYamlViewer content={fileContent} />
                    ) : (
                      <div className="text-fog-text font-mono text-xs italic">
                        El archivo está vacío o no se pudo leer.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Output console */}
              {output && (
                <div className="space-y-1.5 border-t border-border-smoke/70 pt-3">
                  <div className="flex items-center justify-between text-[11px] font-mono text-fog-text">
                    <div className="flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-electric-cyan" />
                      <span>Resultado de la ejecución</span>
                      {actionLoading && (
                        <RefreshCw className="w-3 h-3 animate-spin text-electric-cyan ml-1" />
                      )}
                    </div>
                    <button
                      onClick={() => setOutput('')}
                      className="hover:text-cloud-white transition"
                    >
                      Limpiar
                    </button>
                  </div>
                  <div
                    ref={outputRef}
                    className="bg-void-base border border-border-smoke rounded-cards p-3 font-mono text-[11px] text-cloud-white max-h-40 overflow-y-auto whitespace-pre leading-relaxed select-text"
                  >
                    {output}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

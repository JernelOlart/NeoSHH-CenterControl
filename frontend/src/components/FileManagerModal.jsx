import React, { useState, useEffect } from 'react';
import {
  X,
  Folder,
  FileText,
  ArrowUp,
  RefreshCw,
  FolderOpen,
  Save,
  Trash2,
  Check,
  FilePlus,
  ArrowRight
} from 'lucide-react';
import { fetchFiles, readFilePreview, saveFile, deleteFile } from '../services/api';

export default function FileManagerModal({ server, isOpen, onClose }) {
  const [currentPath, setCurrentPath] = useState('/root');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewingFile, setViewingFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [loadingFile, setLoadingFile] = useState(false);
  const [savingFile, setSavingFile] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // New file creation form
  const [creatingFile, setCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const loadDirectory = async (targetPath) => {
    if (!server) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFiles(server.id, targetPath);
      setCurrentPath(data.path);
      setEntries(data.entries);
    } catch (err) {
      setError(err.message || 'Error al listar directorio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && server) {
      loadDirectory('/root');
      setViewingFile(null);
      setCreatingFile(false);
    }
  }, [isOpen, server?.id]);

  if (!isOpen || !server) return null;

  const navigateUp = () => {
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    const parentPath = '/' + parts.join('/');
    loadDirectory(parentPath || '/');
  };

  const handleEntryClick = (entry) => {
    if (entry.isDirectory) {
      const separator = currentPath === '/' ? '' : '/';
      loadDirectory(`${currentPath}${separator}${entry.name}`);
    } else {
      handleOpenFile(entry);
    }
  };

  const handleOpenFile = async (entry) => {
    const separator = currentPath === '/' ? '' : '/';
    const filePath = `${currentPath}${separator}${entry.name}`;
    setViewingFile(filePath);
    setLoadingFile(true);
    setSavedSuccess(false);
    try {
      const res = await readFilePreview(server.id, filePath);
      setFileContent(res.content || '');
    } catch (err) {
      setFileContent(`[Error al leer archivo: ${err.message}]`);
    } finally {
      setLoadingFile(false);
    }
  };

  const handleSaveFile = async () => {
    if (!viewingFile) return;
    setSavingFile(true);
    try {
      await saveFile(server.id, viewingFile, fileContent);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      alert(`Error al guardar archivo: ${err.message}`);
    } finally {
      setSavingFile(false);
    }
  };

  const handleDeleteItem = async (e, entry) => {
    e.stopPropagation();
    const separator = currentPath === '/' ? '' : '/';
    const targetPath = `${currentPath}${separator}${entry.name}`;
    if (!window.confirm(`¿Deseas eliminar permanentemente "${entry.name}"?`)) return;

    try {
      await deleteFile(server.id, targetPath, entry.isDirectory);
      if (viewingFile === targetPath) setViewingFile(null);
      await loadDirectory(currentPath);
    } catch (err) {
      alert(`Error al eliminar: ${err.message}`);
    }
  };

  const handleCreateNewFile = async (e) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    const separator = currentPath === '/' ? '' : '/';
    const filePath = `${currentPath}${separator}${newFileName.trim()}`;
    try {
      await saveFile(server.id, filePath, '');
      setNewFileName('');
      setCreatingFile(false);
      await loadDirectory(currentPath);
      setViewingFile(filePath);
      setFileContent('');
    } catch (err) {
      alert(`Error al crear archivo: ${err.message}`);
    }
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const pathParts = currentPath.split('/').filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-void-base/85 backdrop-blur-sm">
      <div className="bg-elevated-surface rounded-cards-lg w-full max-w-4xl border border-border-smoke flex flex-col h-[86vh] overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="p-3.5 sm:p-4 border-b border-border-smoke/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-nodes bg-white/5 border border-electric-cyan/30 flex items-center justify-center text-electric-cyan shadow-[0_0_10px_rgba(23,186,237,0.2)]">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-medium text-cloud-white truncate">
                  Gestor de Archivos (SFTP)
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-pills bg-white/5 border border-white/10 text-electric-cyan hidden sm:inline">
                  {server.name}
                </span>
              </div>
              <p className="text-[11px] font-mono text-fog-text truncate">
                {server.username}@{server.host}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCreatingFile(!creatingFile)}
              className="btn-cyan-secondary px-3 py-1.5 text-xs font-mono"
              title="Crear nuevo archivo de texto"
            >
              <FilePlus className="w-3.5 h-3.5 text-electric-cyan" />
              <span className="hidden sm:inline">Nuevo Archivo</span>
            </button>
            <button
              onClick={() => loadDirectory(currentPath)}
              disabled={loading}
              className="btn-cyan-icon p-2 text-xs"
              title="Refrescar directorio"
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

        {/* Path Breadcrumbs Bar */}
        <div className="bg-deep-panel px-3.5 sm:px-4 py-2 border-b border-border-smoke/60 flex items-center gap-2 text-xs font-mono overflow-x-auto">
          <button
            onClick={navigateUp}
            disabled={currentPath === '/'}
            className="p-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 text-fog-text hover:text-cloud-white transition"
            title="Subir un nivel"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>

          <span
            onClick={() => loadDirectory('/')}
            className="cursor-pointer text-fog-text hover:text-electric-cyan font-bold"
          >
            /
          </span>

          {pathParts.map((part, index) => {
            const partPath = '/' + pathParts.slice(0, index + 1).join('/');
            const isLast = index === pathParts.length - 1;
            return (
              <React.Fragment key={partPath}>
                <span className="text-fog-text/40">/</span>
                <span
                  onClick={() => !isLast && loadDirectory(partPath)}
                  className={`cursor-pointer truncate max-w-[120px] ${
                    isLast ? 'text-cloud-white font-semibold' : 'text-fog-text hover:text-electric-cyan'
                  }`}
                >
                  {part}
                </span>
              </React.Fragment>
            );
          })}
        </div>

        {/* Create new file inline input */}
        {creatingFile && (
          <form onSubmit={handleCreateNewFile} className="p-2.5 bg-void-base border-b border-border-smoke/60 flex items-center gap-2">
            <span className="text-xs font-mono text-fog-text">Nuevo archivo:</span>
            <input
              type="text"
              required
              placeholder="nombre.txt o .env o docker-compose.yml"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              className="flex-1 px-3 py-1 bg-deep-panel border border-border-smoke rounded-pills text-xs font-mono text-ash-text focus:outline-none focus:border-electric-cyan/40"
            />
            <button type="submit" className="btn-cyan-primary px-3 py-1 text-xs">Crear</button>
            <button type="button" onClick={() => setCreatingFile(false)} className="btn-cyan-secondary px-3 py-1 text-xs">Cancelar</button>
          </form>
        )}

        {/* Content area: Explorer table & File Editor */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* File listing column */}
          <div className={`flex-1 overflow-y-auto p-2 sm:p-3 ${viewingFile ? 'hidden md:block md:w-1/2 border-r border-border-smoke/60' : 'w-full'}`}>
            {loading ? (
              <div className="flex items-center justify-center py-16 text-fog-text gap-2 text-xs font-mono">
                <RefreshCw className="w-4 h-4 animate-spin text-electric-cyan" />
                <span>Cargando archivos vía SFTP...</span>
              </div>
            ) : error ? (
              <div className="p-4 rounded-cards bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono">
                {error}
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-16 text-fog-text text-xs font-mono">
                Directorio vacío
              </div>
            ) : (
              <div className="space-y-0.5 text-xs font-mono">
                {entries.map((entry) => (
                  <div
                    key={entry.name}
                    onClick={() => handleEntryClick(entry)}
                    className="flex items-center justify-between p-2 rounded-inputs hover:bg-muted-shell/80 cursor-pointer transition select-none group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {entry.isDirectory ? (
                        <Folder className="w-4 h-4 text-electric-cyan flex-shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-fog-text flex-shrink-0 group-hover:text-cloud-white" />
                      )}
                      <span className={`truncate ${entry.isDirectory ? 'text-cloud-white font-medium' : 'text-ash-text'}`}>
                        {entry.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-fog-text text-[11px] flex-shrink-0">
                      <span>{entry.isDirectory ? '--' : formatSize(entry.size)}</span>
                      <button
                        onClick={(e) => handleDeleteItem(e, entry)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-500/20 hover:text-rose-400 transition"
                        title="Eliminar elemento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* File Editor & Viewer Drawer */}
          {viewingFile && (
            <div className="flex-1 flex flex-col h-full bg-void-base overflow-hidden md:w-1/2">
              <div className="p-2.5 sm:p-3 bg-deep-panel border-b border-border-smoke/60 flex items-center justify-between text-xs font-mono">
                <span className="text-cloud-white truncate font-medium max-w-[200px]" title={viewingFile}>
                  {viewingFile.split('/').pop()}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveFile}
                    disabled={savingFile}
                    className="btn-cyan-primary px-3 py-1 text-xs"
                    title="Guardar cambios en el archivo"
                  >
                    {savedSuccess ? (
                      <>
                        <Check className="w-3 h-3 text-dark-teal" />
                        <span>Guardado</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3 h-3" />
                        <span>{savingFile ? 'Guardando...' : 'Guardar'}</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setViewingFile(null)}
                    className="p-1 rounded hover:bg-muted-shell text-fog-text hover:text-cloud-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 p-2 sm:p-3 overflow-hidden flex flex-col bg-void-base">
                {loadingFile ? (
                  <div className="flex items-center gap-2 text-fog-text py-6 font-mono text-xs">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-electric-cyan" />
                    <span>Cargando contenido...</span>
                  </div>
                ) : (
                  <textarea
                    value={fileContent}
                    onChange={(e) => setFileContent(e.target.value)}
                    className="w-full h-full p-2 bg-void-base font-mono text-[11px] text-ash-text leading-relaxed resize-none focus:outline-none border border-transparent focus:border-white/10 rounded"
                    spellCheck={false}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

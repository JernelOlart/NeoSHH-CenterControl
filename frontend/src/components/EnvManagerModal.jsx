import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  FileCode2,
  RefreshCw,
  Save,
  Download,
  Upload,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Check,
  Search,
  Lock,
  Layers,
  FileText,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { fetchEnvFiles, fetchEnvContent, saveEnvContent, downloadEnvFile } from '../services/api';

export default function EnvManagerModal({ server, isOpen, onClose }) {
  const [tab, setTab] = useState('table'); // 'table' | 'raw'
  const [envFiles, setEnvFiles] = useState([]);
  const [selectedPath, setSelectedPath] = useState('');
  const [customPath, setCustomPath] = useState('');
  const [rawContent, setRawContent] = useState('');
  const [pairs, setPairs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showAllSecrets, setShowAllSecrets] = useState(false);
  const [revealedKeys, setRevealedKeys] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [error, setError] = useState(null);

  // New variable row state
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const fileInputRef = useRef(null);

  const loadFileList = async () => {
    if (!server) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEnvFiles(server.id);
      setEnvFiles(data.files || []);
      if (data.files && data.files.length > 0 && !selectedPath) {
        handleSelectFile(data.files[0]);
      }
    } catch (err) {
      setError(err.message || 'Error al buscar archivos .env');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFile = async (path) => {
    if (!path) return;
    setSelectedPath(path);
    setLoading(true);
    setError(null);
    setStatusMessage(null);
    try {
      const data = await fetchEnvContent(server.id, path);
      setRawContent(data.content || '');
      setPairs(data.pairs || []);
    } catch (err) {
      setError(err.message || 'Error al leer archivo .env');
      setRawContent('');
      setPairs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && server) {
      setSelectedPath('');
      setRawContent('');
      setPairs([]);
      setStatusMessage(null);
      setError(null);
      loadFileList();
    }
  }, [isOpen, server?.id]);

  if (!isOpen || !server) return null;

  // Convert pairs back to raw .env string
  const pairsToRaw = (items) => {
    return items.map(p => `${p.key}=${p.value}`).join('\n');
  };

  // Convert raw string to pairs
  const rawToPairs = (text) => {
    const lines = text.split('\n');
    const result = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = line.indexOf('=');
      if (eqIdx !== -1) {
        const key = line.slice(0, eqIdx).trim();
        let val = line.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        const isSecret = /password|secret|key|token|auth|pwd|cred/i.test(key);
        result.push({ key, value: val, isSecret });
      }
    }
    return result;
  };

  const handleSave = async () => {
    if (!selectedPath) return;
    setSaving(true);
    setStatusMessage(null);
    try {
      const contentToSave = tab === 'raw' ? rawContent : pairsToRaw(pairs);
      await saveEnvContent(server.id, selectedPath, contentToSave);
      setRawContent(contentToSave);
      setPairs(rawToPairs(contentToSave));
      setStatusMessage({ type: 'success', text: 'Archivo .env guardado con permisos 0600 en el VPS' });
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err) {
      alert(`Error al guardar .env: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!selectedPath) return;
    setDownloading(true);
    try {
      await downloadEnvFile(server.id, selectedPath);
    } catch (err) {
      alert(`Error al exportar .env: ${err.message}`);
    } finally {
      setDownloading(false);
    }
  };

  // Import local file from machine
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        setRawContent(text);
        setPairs(rawToPairs(text));
        setStatusMessage({ type: 'success', text: `Archivo local "${file.name}" cargado en el editor. Haz clic en Guardar para escribir en el servidor.` });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleAddPair = (e) => {
    e.preventDefault();
    if (!newKey.trim()) return;
    const cleanKey = newKey.trim().toUpperCase().replace(/\s+/g, '_');
    const cleanVal = newValue.trim();
    const isSecret = /password|secret|key|token|auth|pwd|cred/i.test(cleanKey);
    const updated = [...pairs.filter(p => p.key !== cleanKey), { key: cleanKey, value: cleanVal, isSecret }];
    setPairs(updated);
    setRawContent(pairsToRaw(updated));
    setNewKey('');
    setNewValue('');
  };

  const handleDeletePair = (keyToDelete) => {
    const updated = pairs.filter(p => p.key !== keyToDelete);
    setPairs(updated);
    setRawContent(pairsToRaw(updated));
  };

  const handleUpdatePairValue = (key, newVal) => {
    const updated = pairs.map(p => p.key === key ? { ...p, value: newVal } : p);
    setPairs(updated);
    setRawContent(pairsToRaw(updated));
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleRevealKey = (key) => {
    setRevealedKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredPairs = pairs.filter(p =>
    p.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-void-base/85 backdrop-blur-sm">
      <div className="bg-elevated-surface rounded-cards-lg w-full max-w-4xl border border-border-smoke flex flex-col h-[88vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-border-smoke/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-nodes bg-white/5 border border-electric-cyan/30 flex items-center justify-center text-electric-cyan shadow-[0_0_10px_rgba(23,186,237,0.2)]">
              <FileCode2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-medium text-cloud-white truncate">
                  Gestor de Variables de Entorno (.env)
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-pills bg-white/5 border border-white/10 text-electric-cyan hidden sm:inline">
                  {server.name}
                </span>
                <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-pills bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <Lock className="w-2.5 h-2.5" />
                  <span>chmod 600</span>
                </span>
              </div>
              <p className="text-[11px] font-mono text-fog-text truncate">
                Visualiza, edita, importa y exporta archivos .env seguros
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadFileList}
              disabled={loading}
              className="btn-cyan-icon p-2 text-xs"
              title="Volver a escanear archivos .env"
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

        {/* File Picker Bar */}
        <div className="bg-deep-panel px-3.5 sm:px-4 py-2 border-b border-border-smoke/60 flex items-center gap-2 text-xs font-mono overflow-x-auto">
          <span className="text-fog-text flex-shrink-0 text-[11px]">Archivos detectados:</span>
          {envFiles.length > 0 ? (
            envFiles.map((f) => (
              <button
                key={f}
                onClick={() => handleSelectFile(f)}
                className={`px-2.5 py-1 rounded-pills text-[11px] font-mono border transition flex-shrink-0 truncate max-w-[200px] ${
                  selectedPath === f
                    ? 'bg-void-base border-electric-cyan text-cloud-white font-medium shadow-[0_0_8px_rgba(23,186,237,0.25)]'
                    : 'bg-white/5 border-border-smoke/60 text-fog-text hover:text-cloud-white'
                }`}
                title={f}
              >
                {f}
              </button>
            ))
          ) : (
            <span className="text-fog-text italic text-[11px]">No se detectaron archivos .env automáticos</span>
          )}

          {/* Custom path opener */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (customPath.trim()) {
                handleSelectFile(customPath.trim());
                setCustomPath('');
              }
            }}
            className="flex items-center gap-1.5 ml-auto flex-shrink-0"
          >
            <input
              type="text"
              placeholder="Ruta manual (ej: /var/www/app/.env)"
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
              className="px-2.5 py-1 bg-void-base border border-border-smoke rounded-pills text-[11px] font-mono text-ash-text placeholder-fog-text focus:outline-none focus:border-electric-cyan w-48 sm:w-60"
            />
            <button type="submit" className="btn-cyan-secondary px-2.5 py-1 text-[11px] font-mono">
              Abrir
            </button>
          </form>
        </div>

        {/* Action Toolbar */}
        {selectedPath && (
          <div className="bg-void-base px-3.5 sm:px-4 py-2 border-b border-border-smoke/60 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            {/* View switcher */}
            <div className="flex items-center gap-1.5 bg-deep-panel p-0.5 rounded-pills border border-border-smoke/70">
              <button
                onClick={() => {
                  if (tab === 'raw') setPairs(rawToPairs(rawContent));
                  setTab('table');
                }}
                className={`px-3 py-1 rounded-pills text-xs font-mono transition flex items-center gap-1.5 ${
                  tab === 'table'
                    ? 'bg-electric-cyan text-dark-teal font-semibold shadow-sm'
                    : 'text-fog-text hover:text-cloud-white'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>Pares Clave/Valor</span>
              </button>
              <button
                onClick={() => {
                  if (tab === 'table') setRawContent(pairsToRaw(pairs));
                  setTab('raw');
                }}
                className={`px-3 py-1 rounded-pills text-xs font-mono transition flex items-center gap-1.5 ${
                  tab === 'raw'
                    ? 'bg-electric-cyan text-dark-teal font-semibold shadow-sm'
                    : 'text-fog-text hover:text-cloud-white'
                }`}
              >
                <FileText className="w-3 h-3" />
                <span>Editor Raw (.env)</span>
              </button>
            </div>

            {/* Actions: Reveal secrets, Import, Export, Save */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {tab === 'table' && (
                <button
                  onClick={() => setShowAllSecrets(!showAllSecrets)}
                  className="btn-cyan-secondary px-2.5 py-1 text-xs flex items-center gap-1.5 text-fog-text hover:text-cloud-white"
                  title={showAllSecrets ? 'Ocultar secretos' : 'Revelar secretos'}
                >
                  {showAllSecrets ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showAllSecrets ? 'Ocultar' : 'Revelar'}</span>
                </button>
              )}

              {/* Hidden file input for import */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".env,.env.*,text/plain"
                onChange={handleFileUpload}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn-cyan-secondary px-2.5 py-1 text-xs flex items-center gap-1.5"
                title="Cargar archivo .env desde tu computadora"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                <span>Importar</span>
              </button>

              <button
                onClick={handleDownload}
                disabled={downloading}
                className="btn-cyan-secondary px-2.5 py-1 text-xs flex items-center gap-1.5 text-electric-cyan"
                title="Descargar archivo .env a tu computadora"
              >
                <Download className={`w-3.5 h-3.5 ${downloading ? 'animate-bounce' : ''}`} />
                <span>{downloading ? 'Exportando...' : 'Exportar'}</span>
              </button>

              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-cyan-primary px-3.5 py-1 text-xs font-semibold flex items-center gap-1.5"
                title="Guardar cambios en el VPS con permisos 0600"
              >
                <Save className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
                <span>{saving ? 'Guardando...' : 'Guardar'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Status banner */}
        {statusMessage && (
          <div className="mx-4 mt-3 p-2.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-fog-text gap-2 text-xs font-mono">
              <RefreshCw className="w-4 h-4 animate-spin text-electric-cyan" />
              <span>Cargando archivo de variables de entorno...</span>
            </div>
          ) : !selectedPath ? (
            <div className="text-center py-20 text-fog-text font-mono text-xs">
              <FileCode2 className="w-10 h-10 mx-auto mb-3 opacity-40 text-electric-cyan" />
              <p className="text-cloud-white font-medium text-sm">Selecciona o ingresa una ruta de archivo .env</p>
              <p className="text-fog-text text-xs mt-1">
                Puedes abrir cualquier archivo de entorno o crear uno nuevo especificando la ruta.
              </p>
            </div>
          ) : tab === 'table' ? (
            /* Table View */
            <div className="space-y-3">
              {/* Search bar & Add Form */}
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 text-fog-text absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filtrar por nombre o valor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-void-base border border-border-smoke rounded-pills text-xs font-mono text-ash-text focus:outline-none focus:border-electric-cyan"
                  />
                </div>
                <div className="text-[11px] font-mono text-fog-text">
                  {filteredPairs.length} de {pairs.length} variables
                </div>
              </div>

              {/* Variables List */}
              <div className="border border-border-smoke/70 rounded-cards bg-deep-panel overflow-hidden divide-y divide-border-smoke/50">
                {filteredPairs.length === 0 ? (
                  <div className="p-8 text-center text-fog-text text-xs font-mono">
                    No hay variables que coincidan con la búsqueda.
                  </div>
                ) : (
                  filteredPairs.map((pair) => {
                    const isSecret = pair.isSecret;
                    const isRevealed = showAllSecrets || revealedKeys[pair.key];
                    const displayValue = isSecret && !isRevealed ? '••••••••••••••••' : pair.value;

                    return (
                      <div
                        key={pair.key}
                        className="p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-muted-shell/40 transition font-mono text-xs"
                      >
                        {/* Key */}
                        <div className="flex items-center gap-2 min-w-[200px] sm:max-w-[260px] flex-shrink-0">
                          {isSecret && (
                            <Lock className="w-3 h-3 text-amber-400 flex-shrink-0" title="Variable sensible" />
                          )}
                          <span className="font-bold text-cloud-white truncate select-all" title={pair.key}>
                            {pair.key}
                          </span>
                        </div>

                        {/* Value Input */}
                        <div className="flex-1 min-w-0 flex items-center gap-1.5">
                          <input
                            type={isSecret && !isRevealed ? 'password' : 'text'}
                            value={pair.value}
                            onChange={(e) => handleUpdatePairValue(pair.key, e.target.value)}
                            className="w-full px-2.5 py-1 bg-void-base border border-border-smoke rounded text-xs font-mono text-ash-text focus:outline-none focus:border-electric-cyan"
                          />
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 flex-shrink-0 self-end sm:self-center">
                          {isSecret && (
                            <button
                              onClick={() => toggleRevealKey(pair.key)}
                              className="p-1 rounded text-fog-text hover:text-cloud-white transition"
                              title={isRevealed ? 'Ocultar valor' : 'Revelar valor'}
                            >
                              {isRevealed ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          )}

                          <button
                            onClick={() => copyToClipboard(pair.value, pair.key)}
                            className="p-1 rounded text-fog-text hover:text-electric-cyan transition"
                            title="Copiar valor"
                          >
                            {copiedKey === pair.key ? (
                              <Check className="w-3.5 h-3.5 text-electric-cyan" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            onClick={() => handleDeletePair(pair.key)}
                            className="p-1 rounded text-fog-text hover:text-rose-400 transition"
                            title="Eliminar variable"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add New Variable Form */}
              <form onSubmit={handleAddPair} className="p-3 rounded-cards bg-deep-panel border border-border-smoke/70 flex flex-col sm:flex-row gap-2 items-center">
                <input
                  type="text"
                  placeholder="NUEVA_VARIABLE"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="w-full sm:w-1/3 px-3 py-1.5 bg-void-base border border-border-smoke rounded text-xs font-mono text-cloud-white focus:outline-none focus:border-electric-cyan uppercase"
                />
                <input
                  type="text"
                  placeholder="Valor"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="w-full sm:flex-1 px-3 py-1.5 bg-void-base border border-border-smoke rounded text-xs font-mono text-ash-text focus:outline-none focus:border-electric-cyan"
                />
                <button
                  type="submit"
                  className="btn-cyan-secondary px-3 py-1.5 text-xs font-mono text-electric-cyan flex items-center gap-1.5 self-end sm:self-center"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar</span>
                </button>
              </form>
            </div>
          ) : (
            /* Raw View */
            <div className="h-full flex flex-col space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-fog-text">
                <span>Ruta: {selectedPath}</span>
                <span>{rawContent.split('\n').length} líneas</span>
              </div>
              <textarea
                value={rawContent}
                onChange={(e) => {
                  setRawContent(e.target.value);
                  setPairs(rawToPairs(e.target.value));
                }}
                className="w-full flex-1 min-h-[380px] p-3.5 bg-void-base border border-border-smoke rounded-cards text-xs font-mono text-cloud-white focus:outline-none focus:border-electric-cyan leading-relaxed resize-none selection:bg-electric-cyan/20"
                placeholder="# Variables de entorno&#10;PORT=3000&#10;NODE_ENV=production"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


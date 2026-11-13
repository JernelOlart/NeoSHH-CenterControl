import React, { useState, useEffect } from 'react';
import { X, Key, Upload, Eye, EyeOff, Server, ArrowRight, AlertCircle } from 'lucide-react';

export default function ServerModal({ isOpen, onClose, onSave, editingServer }) {
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState(22);
  const [username, setUsername] = useState('root');
  const [provider, setProvider] = useState('Hetzner');
  const [tags, setTags] = useState('');
  const [authType, setAuthType] = useState('password');
  const [password, setPassword] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [notes, setNotes] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingServer) {
      setName(editingServer.name || '');
      setHost(editingServer.host || '');
      setPort(editingServer.port || 22);
      setUsername(editingServer.username || 'root');
      setProvider(editingServer.provider || 'Other');
      setTags(editingServer.tags ? editingServer.tags.join(', ') : '');
      setAuthType(editingServer.authType || 'password');
      setPassword('');
      setPrivateKey('');
      setPassphrase('');
      setNotes(editingServer.notes || '');
    } else {
      setName('');
      setHost('');
      setPort(22);
      setUsername('root');
      setProvider('Hetzner');
      setTags('');
      setAuthType('password');
      setPassword('');
      setPrivateKey('');
      setPassphrase('');
      setNotes('');
    }
    setError('');
  }, [editingServer, isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setPrivateKey(event.target.result);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!host.trim()) {
      setError('Por favor introduce la IP o nombre de host del VPS.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSave({
        name: name.trim() || `VPS ${host.trim()}`,
        host: host.trim(),
        port: parseInt(port, 10) || 22,
        username: username.trim() || 'root',
        provider,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        authType,
        password: authType === 'password' ? password : '',
        privateKey: authType === 'key' ? privateKey : '',
        passphrase: authType === 'key' ? passphrase : '',
        notes
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Error al guardar el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-void-base/85 backdrop-blur-sm">
      <div className="bg-elevated-surface rounded-cards-lg w-full max-w-xl border border-border-smoke flex flex-col max-h-[92vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border-smoke/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-nodes bg-white/5 border border-electric-cyan/30 flex items-center justify-center text-electric-cyan shadow-[0_0_10px_rgba(23,186,237,0.2)]">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-medium text-cloud-white">
                {editingServer ? 'Editar Servidor VPS' : 'Añadir Nuevo Servidor VPS'}
              </h2>
              <p className="text-xs font-mono text-fog-text">Credenciales y configuración de conexión</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-pills hover:bg-muted-shell text-fog-text hover:text-cloud-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {error && (
            <div className="p-3 rounded-pills bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Nombre & Proveedor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-mono text-fog-text mb-1">
                Nombre Identificador
              </label>
              <input
                type="text"
                placeholder="ej: Prod Web 01"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 bg-void-base border border-border-smoke rounded-pills text-ash-text placeholder-fog-text focus:outline-none focus:border-electric-cyan/40"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-fog-text mb-1">
                Proveedor de Hosting
              </label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full px-3.5 py-2 bg-void-base border border-border-smoke rounded-pills text-ash-text focus:outline-none focus:border-electric-cyan/40 cursor-pointer"
              >
                <option value="Hetzner">Hetzner</option>
                <option value="DigitalOcean">DigitalOcean</option>
                <option value="OVH">OVHcloud</option>
                <option value="AWS">Amazon AWS</option>
                <option value="Linode">Linode / Akamai</option>
                <option value="Vultr">Vultr</option>
                <option value="Contabo">Contabo</option>
                <option value="Google Cloud">Google Cloud</option>
                <option value="Other">Otro / Dedicado</option>
              </select>
            </div>
          </div>

          {/* Host, Puerto, Usuario */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="sm:col-span-1">
              <label className="block text-xs font-mono text-fog-text mb-1">
                IP o Host *
              </label>
              <input
                type="text"
                required
                placeholder="198.51.100.24"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                className="w-full px-3.5 py-2 bg-void-base border border-border-smoke rounded-pills font-mono text-ash-text placeholder-fog-text focus:outline-none focus:border-electric-cyan/40 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-fog-text mb-1">
                Puerto SSH
              </label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                className="w-full px-3.5 py-2 bg-void-base border border-border-smoke rounded-pills font-mono text-ash-text focus:outline-none focus:border-electric-cyan/40"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-fog-text mb-1">
                Usuario
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="root"
                className="w-full px-3.5 py-2 bg-void-base border border-border-smoke rounded-pills font-mono text-ash-text focus:outline-none focus:border-electric-cyan/40"
              />
            </div>
          </div>

          {/* Método de Autenticación */}
          <div>
            <label className="block text-xs font-mono text-fog-text mb-1.5">
              Método de Autenticación
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-void-base border border-border-smoke rounded-pills">
              <button
                type="button"
                onClick={() => setAuthType('password')}
                className={`py-1.5 text-xs font-medium rounded-pills transition ${
                  authType === 'password'
                    ? 'bg-electric-cyan text-dark-teal font-semibold shadow-[0_0_12px_rgba(23,186,237,0.4)]'
                    : 'text-fog-text hover:text-cloud-white'
                }`}
              >
                Contraseña
              </button>
              <button
                type="button"
                onClick={() => setAuthType('key')}
                className={`py-1.5 text-xs font-medium rounded-pills transition ${
                  authType === 'key'
                    ? 'bg-electric-cyan text-dark-teal font-semibold shadow-[0_0_12px_rgba(23,186,237,0.4)]'
                    : 'text-fog-text hover:text-cloud-white'
                }`}
              >
                Clave SSH Privada
              </button>
            </div>
          </div>

          {/* Password field */}
          {authType === 'password' && (
            <div>
              <label className="block text-xs font-mono text-fog-text mb-1">
                {editingServer && editingServer.hasPassword
                  ? 'Nueva Contraseña (dejar en blanco para mantener)'
                  : 'Contraseña SSH'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-3.5 pr-10 py-2 bg-void-base border border-border-smoke rounded-pills font-mono text-ash-text focus:outline-none focus:border-electric-cyan/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-fog-text hover:text-cloud-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Key fields */}
          {authType === 'key' && (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-mono text-fog-text">
                    Clave Privada (.pem, id_rsa, id_ed25519)
                  </label>
                  <label className="text-xs font-mono text-electric-cyan hover:underline cursor-pointer flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Subir archivo</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                      accept=".pem,.key,id_rsa,id_ed25519,*"
                    />
                  </label>
                </div>
                <textarea
                  rows={4}
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"
                  className="w-full p-3 bg-void-base border border-border-smoke rounded-cards font-mono text-xs text-ash-text focus:outline-none focus:border-electric-cyan/40"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-fog-text mb-1">
                  Passphrase (Frase de paso opcional)
                </label>
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Dejar vacío si no está cifrada"
                  className="w-full px-3.5 py-2 bg-void-base border border-border-smoke rounded-pills font-mono text-ash-text focus:outline-none focus:border-electric-cyan/40"
                />
              </div>
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="block text-xs font-mono text-fog-text mb-1">
              Etiquetas (separadas por coma)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="produccion, docker, base-de-datos"
              className="w-full px-3.5 py-2 bg-void-base border border-border-smoke rounded-pills text-ash-text placeholder-fog-text focus:outline-none focus:border-electric-cyan/40"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-border-smoke/60 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="btn-cyan-secondary px-4 py-2 text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-cyan-primary px-5 py-2 text-xs sm:text-sm disabled:opacity-40"
            >
              <span>{loading ? 'Guardando...' : editingServer ? 'Actualizar VPS' : 'Guardar VPS'}</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-80" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

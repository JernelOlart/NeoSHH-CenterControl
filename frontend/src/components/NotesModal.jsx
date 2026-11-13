import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Eye,
  Edit3,
  Save,
  CheckCircle2,
  Clock,
  RefreshCw
} from 'lucide-react';
import { updateServer } from '../services/api';

function renderMarkdown(md) {
  if (!md || !md.trim()) {
    return '<p class="text-fog-text italic">Sin notas para este servidor. Escribe algo en la pestaña Editar.</p>';
  }

  // Escape HTML tags
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Headers (h3, h2, h1)
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-sm font-semibold text-cloud-white mt-3 mb-1.5">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-base font-bold text-cloud-white mt-4 mb-2 text-electric-cyan">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-lg font-bold text-cloud-white mt-4 mb-2 pb-1 border-b border-border-smoke/70">$1</h1>');

  // Bold & Italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/gim, '<strong class="text-cloud-white font-bold italic">$1</strong>');
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong class="text-cloud-white font-semibold">$1</strong>');
  html = html.replace(/\*(.*?)\*/gim, '<em class="text-ash-text italic">$1</em>');

  // Inline code
  html = html.replace(/`([^`]+)`/gim, '<code class="px-1.5 py-0.5 rounded bg-void-base text-electric-cyan font-mono text-xs border border-border-smoke">$1</code>');

  // Links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-electric-cyan underline hover:opacity-80">$1</a>');

  // Lists (- item)
  html = html.replace(/^\s*-\s+(.*$)/gim, '<li class="ml-4 list-disc text-ash-text my-1">$1</li>');

  // Line breaks & spacing
  html = html.replace(/\n\n/gim, '<div class="h-2.5"></div>');
  html = html.replace(/\n/gim, '<br/>');

  return html;
}

export default function NotesModal({ server, isOpen, onClose, onSave }) {
  const [tab, setTab] = useState('edit'); // 'edit' | 'preview'
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  // Initialize notes from server.notes or localStorage fallback
  useEffect(() => {
    if (isOpen && server) {
      setTab('edit');
      setSavedSuccess(false);

      const localDraft = localStorage.getItem(`neoshh-notes-${server.id}`);
      const initialNotes = server.notes !== undefined && server.notes !== null && server.notes !== ''
        ? server.notes
        : (localDraft || '');

      setNotes(initialNotes);

      // Check if last saved timestamp exists in localStorage
      const savedTime = localStorage.getItem(`neoshh-notes-time-${server.id}`);
      if (savedTime) {
        setLastSaved(savedTime);
      } else if (server.notes) {
        setLastSaved('Guardado en servidor');
      } else {
        setLastSaved(null);
      }
    }
  }, [isOpen, server?.id, server?.notes]);

  // Auto-save draft to localStorage whenever notes change
  const handleChange = (e) => {
    const val = e.target.value;
    setNotes(val);
    if (server?.id) {
      localStorage.setItem(`neoshh-notes-${server.id}`, val);
    }
  };

  const handleSave = async () => {
    if (!server) return;
    setSaving(true);
    setSavedSuccess(false);

    try {
      if (typeof onSave === 'function') {
        await onSave(server.id, notes);
      } else {
        await updateServer(server.id, { notes });
      }

      const timeStr = new Date().toLocaleTimeString();
      setLastSaved(timeStr);
      localStorage.setItem(`neoshh-notes-time-${server.id}`, timeStr);
      localStorage.setItem(`neoshh-notes-${server.id}`, notes);

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      alert(`Error al guardar notas: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !server) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-void-base/85 backdrop-blur-sm">
      <div className="bg-elevated-surface rounded-cards-lg w-full max-w-3xl border border-border-smoke flex flex-col max-h-[88vh] overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="p-4 border-b border-border-smoke/70 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-nodes bg-white/5 border border-electric-cyan/30 flex items-center justify-center text-electric-cyan shadow-[0_0_10px_rgba(23,186,237,0.2)]">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-medium text-cloud-white">Notas del Servidor</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-pills bg-white/5 border border-white/10 text-electric-cyan">
                  {server.name}
                </span>
              </div>
              <p className="text-xs font-mono text-fog-text">
                Documenta credenciales de apps, configuraciones, puertos o recordatorios
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-cyan-primary px-4 py-1.5 text-xs inline-flex items-center gap-1.5"
              title="Guardar notas"
            >
              {saving ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : savedSuccess ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{saving ? 'Guardando...' : savedSuccess ? '¡Guardado!' : 'Guardar'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-pills hover:bg-muted-shell text-fog-text hover:text-cloud-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-header with Tabs & Timestamp */}
        <div className="flex items-center justify-between border-b border-border-smoke/70 bg-deep-panel px-4 pt-2 text-xs font-mono flex-shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => setTab('edit')}
              className={`pb-2.5 px-3 border-b-2 flex items-center gap-2 transition ${
                tab === 'edit'
                  ? 'border-electric-cyan text-electric-cyan font-semibold'
                  : 'border-transparent text-fog-text hover:text-cloud-white'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editar</span>
            </button>

            <button
              onClick={() => setTab('preview')}
              className={`pb-2.5 px-3 border-b-2 flex items-center gap-2 transition ${
                tab === 'preview'
                  ? 'border-electric-cyan text-electric-cyan font-semibold'
                  : 'border-transparent text-fog-text hover:text-cloud-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Vista Previa</span>
            </button>
          </div>

          {lastSaved && (
            <div className="pb-2.5 flex items-center gap-1.5 text-[11px] text-fog-text">
              <Clock className="w-3 h-3 text-electric-cyan/70" />
              <span>Último guardado: {lastSaved}</span>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden p-4 flex flex-col">
          {tab === 'edit' ? (
            <div className="flex-1 flex flex-col">
              <textarea
                value={notes}
                onChange={handleChange}
                placeholder="Escribe notas en Markdown para este servidor...&#10;&#10;# Documentación&#10;- Puerto API: 8080&#10;- Base de datos: PostgreSQL&#10;- Comando de reinicio: `docker compose restart`"
                className="w-full flex-1 bg-void-base border border-border-smoke rounded-inputs p-3 font-mono text-xs text-cloud-white placeholder-fog-text/60 focus:outline-none focus:border-electric-cyan resize-none leading-relaxed"
                spellCheck={false}
              />
              <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-fog-text">
                <span>Markdown soportado: # títulos, **negrita**, `código`, - listas, [links](url)</span>
                <span>{notes.length} caracteres</span>
              </div>
            </div>
          ) : (
            <div className="flex-1 bg-void-base border border-border-smoke rounded-inputs p-4 overflow-y-auto">
              <div
                className="font-mono text-xs text-cloud-white leading-relaxed select-text"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(notes) }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

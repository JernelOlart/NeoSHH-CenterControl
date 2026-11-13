const BASE_URL = '/api';

export async function fetchServers() {
  const res = await fetch(`${BASE_URL}/servers`);
  if (!res.ok) throw new Error('Error al cargar la lista de servidores');
  return res.json();
}

export async function createServer(data) {
  const res = await fetch(`${BASE_URL}/servers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al guardar el servidor');
  }
  return res.json();
}

export async function updateServer(id, data) {
  const res = await fetch(`${BASE_URL}/servers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al actualizar el servidor');
  }
  return res.json();
}

export async function deleteServer(id) {
  const res = await fetch(`${BASE_URL}/servers/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Error al eliminar el servidor');
  return res.json();
}

export async function refreshServer(id) {
  const res = await fetch(`${BASE_URL}/servers/${id}/refresh`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Error al actualizar métricas');
  return res.json();
}

export async function refreshAllServers() {
  const res = await fetch(`${BASE_URL}/servers/refresh-all`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Error al actualizar todos los servidores');
  return res.json();
}

export async function getNativeCommand(id) {
  const res = await fetch(`${BASE_URL}/servers/${id}/native-command`);
  if (!res.ok) throw new Error('Error al obtener comando SSH');
  return res.json();
}

// File Manager APIs
export async function fetchFiles(serverId, path = '/') {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/files?path=${encodeURIComponent(path)}`);
  if (!res.ok) throw new Error('Error al explorar directorio');
  return res.json();
}

export async function readFilePreview(serverId, path) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/files/view?path=${encodeURIComponent(path)}`);
  if (!res.ok) throw new Error('Error al leer archivo');
  return res.json();
}

export async function saveFile(serverId, path, content) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/files/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, content })
  });
  if (!res.ok) throw new Error('Error al guardar archivo');
  return res.json();
}

export async function deleteFile(serverId, path, isDirectory) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/files/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, isDirectory })
  });
  if (!res.ok) throw new Error('Error al eliminar elemento');
  return res.json();
}

// Docker APIs
export async function fetchDockerContainers(serverId) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/docker`);
  if (!res.ok) throw new Error('Error al consultar Docker');
  return res.json();
}

export async function dockerAction(serverId, containerId, action) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/docker/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ containerId, action })
  });
  if (!res.ok) throw new Error('Error al ejecutar acción de Docker');
  return res.json();
}

export async function fetchDockerLogs(serverId, containerId) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/docker/logs?containerId=${encodeURIComponent(containerId)}`);
  if (!res.ok) throw new Error('Error al consultar logs');
  return res.json();
}

export async function runDockerContainer(serverId, data) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/docker/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Error al iniciar contenedor');
  return res.json();
}

export async function removeDockerContainer(serverId, containerId) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/docker/rm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ containerId })
  });
  if (!res.ok) throw new Error('Error al eliminar contenedor');
  return res.json();
}

// Git APIs
export async function detectGitRepos(serverId) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/git/detect`);
  if (!res.ok) throw new Error('Error al buscar repositorios');
  return res.json();
}

export async function fetchGitStatus(serverId, path) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/git/status?path=${encodeURIComponent(path)}`);
  if (!res.ok) throw new Error('Error al consultar estado de Git');
  return res.json();
}

export async function gitPull(serverId, path) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/git/pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path })
  });
  if (!res.ok) throw new Error('Error al ejecutar git pull');
  return res.json();
}

export async function gitClone(serverId, data) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/git/clone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Error al clonar repositorio');
  return res.json();
}

export async function gitCheckout(serverId, path, target) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/git/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, target })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al cambiar de rama/commit');
  return data;
}

export async function gitFetch(serverId, path) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/git/fetch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al ejecutar git fetch');
  return data;
}

export async function gitReset(serverId, path) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/git/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al descartar cambios');
  return data;
}

export async function gitStash(serverId, path, action = 'push') {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/git/stash`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, action })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al ejecutar git stash');
  return data;
}

// Firewall APIs
export async function fetchFirewall(serverId) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/firewall`);
  if (!res.ok) throw new Error('Error al consultar firewall');
  return res.json();
}

export async function updateFirewallRule(serverId, data) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/firewall/rule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Error al actualizar regla de firewall');
  return res.json();
}


// Cron APIs
export async function fetchCronJobs(serverId) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/cron`);
  if (!res.ok) throw new Error('Error al consultar cron jobs');
  return res.json();
}

export async function saveCronJob(serverId, data) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/cron`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Error al guardar cron job');
  return res.json();
}

// Packages APIs
export async function fetchPackages(serverId) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/packages`);
  if (!res.ok) throw new Error('Error al consultar paquetes');
  return res.json();
}

export async function runPackageCommand(serverId, action, packageName) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/packages/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, packageName })
  });
  if (!res.ok) throw new Error('Error al ejecutar comando de paquetes');
  return res.json();
}

// Network APIs
export async function fetchNetworkInfo(serverId) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/network`);
  if (!res.ok) throw new Error('Error al consultar red');
  return res.json();
}

// Docker Compose APIs
export async function findComposeFiles(serverId) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/compose/files`);
  if (!res.ok) throw new Error('Error al buscar archivos docker-compose');
  return res.json();
}

export async function getComposeContent(serverId, filePath) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/compose/content?filePath=${encodeURIComponent(filePath)}`);
  if (!res.ok) throw new Error('Error al leer archivo docker-compose');
  return res.json();
}

export async function composeAction(serverId, filePath, action) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/compose/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filePath, action })
  });
  if (!res.ok) throw new Error('Error al ejecutar acción de docker-compose');
  return res.json();
}

// Live Metrics
export async function fetchLiveMetrics(serverId) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/metrics/live`);
  if (!res.ok) throw new Error('Error al obtener métricas en vivo');
  return res.json();
}

// Command Runner
export async function runCommand(serverId, command) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al ejecutar comando');
  }
  return res.json();
}

// Systemd Services
export async function fetchSystemServices(serverId) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/services`);
  if (!res.ok) throw new Error('Error al obtener servicios systemd');
  return res.json();
}

export async function serviceAction(serverId, serviceName, action) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/services/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serviceName, action })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error al ejecutar acción ${action} en ${serviceName}`);
  }
  return res.json();
}

// System Logs
export async function fetchSystemLogs(serverId, source = 'syslog', lines = 100, filter = '') {
  const params = new URLSearchParams();
  if (source) params.append('source', source);
  if (lines) params.append('lines', lines.toString());
  if (filter) params.append('filter', filter);

  const res = await fetch(`${BASE_URL}/servers/${serverId}/logs?${params.toString()}`);
  if (!res.ok) throw new Error('Error al obtener logs del sistema');
  return res.json();
}


// Docker Stats
export async function fetchDockerStats(serverId) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/docker/stats`);
  if (!res.ok) throw new Error('Error al obtener estadísticas de Docker');
  return res.json();
}

// Nginx
export async function fetchNginxSites(serverId) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/nginx`);
  if (!res.ok) throw new Error('Error al consultar sitios de Nginx');
  return res.json();
}

export async function getNginxSiteContent(serverId, siteName) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/nginx/site?siteName=${encodeURIComponent(siteName)}`);
  if (!res.ok) throw new Error('Error al obtener contenido de sitio Nginx');
  return res.json();
}

export async function saveNginxSite(serverId, sitePath, content) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/nginx/site`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sitePath, content })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al guardar configuración de Nginx');
  }
  return res.json();
}

// Notes
export async function saveServerNotes(serverId, notes) {
  return updateServer(serverId, { notes });
}

// Download Git repository as zip
export async function downloadRepoZip(serverId, repoPath) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/git/download?path=${encodeURIComponent(repoPath)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al descargar repositorio');
  }
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  let filename = 'repositorio.zip';
  const match = disposition.match(/filename="?([^";]+)"?/);
  if (match && match[1]) {
    filename = match[1];
  }
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

// Download Directory / Folder as zip
export async function downloadDirectoryZip(serverId, dirPath) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/files/download?path=${encodeURIComponent(dirPath)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al descargar directorio');
  }
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  let filename = 'directorio.zip';
  const match = disposition.match(/filename="?([^";]+)"?/);
  if (match && match[1]) {
    filename = match[1];
  }
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

// Env Manager APIs
export async function fetchEnvFiles(serverId) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/env/files`);
  if (!res.ok) throw new Error('Error al buscar archivos .env');
  return res.json();
}

export async function fetchEnvContent(serverId, filePath) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/env/content?path=${encodeURIComponent(filePath)}`);
  if (!res.ok) throw new Error('Error al leer archivo .env');
  return res.json();
}

export async function saveEnvContent(serverId, filePath, content) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/env/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: filePath, content })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al guardar archivo .env');
  }
  return res.json();
}

export async function downloadEnvFile(serverId, filePath) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/env/download?path=${encodeURIComponent(filePath)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al descargar archivo .env');
  }
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  let filename = '.env';
  const match = disposition.match(/filename="?([^";]+)"?/);
  if (match && match[1]) {
    filename = match[1];
  }
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

// Power & Maintenance Actions
export async function rebootServer(serverId) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/power/reboot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al enviar orden de reinicio');
  }
  return res.json();
}

export async function poweroffServer(serverId) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/power/shutdown`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al enviar orden de apagado');
  }
  return res.json();
}

export async function dropServerCaches(serverId) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/power/drop-caches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al liberar memoria caché');
  }
  return res.json();
}

export async function cleanServerDisk(serverId) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/power/clean-disk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al ejecutar limpieza de disco');
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Auto-Deploy Webhooks API
// ---------------------------------------------------------------------------
export async function fetchWebhookConfig(serverId) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/webhook`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al obtener configuración de webhook');
  }
  return res.json();
}

export async function saveWebhookConfig(serverId, data) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/webhook`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al guardar configuración de webhook');
  }
  return res.json();
}

export async function regenerateWebhookToken(serverId) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/webhook/regenerate-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al regenerar token');
  }
  return res.json();
}

export async function triggerManualDeploy(serverId, data = {}) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/webhook/deploy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al ejecutar despliegue');
  }
  return res.json();
}

export async function fetchDetectedRepos(serverId) {
  const res = await fetch(`${BASE_URL}/servers/${serverId}/git/detect`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al detectar repositorios');
  }
  return res.json();
}

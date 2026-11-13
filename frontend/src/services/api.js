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

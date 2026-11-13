import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATA_DIR = process.env.DATA_DIR || path.resolve(process.cwd(), '../data');
const DB_FILE = path.join(DATA_DIR, 'servers.json');
const KEYS_DIR = path.join(DATA_DIR, 'keys');

// Ensure directories exist
export function initDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(KEYS_DIR)) {
    fs.mkdirSync(KEYS_DIR, { recursive: true, mode: 0o700 });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

function readAll() {
  initDb();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading servers DB:', err);
    return [];
  }
}

function writeAll(servers) {
  initDb();
  const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
  fs.writeFileSync(tempFile, JSON.stringify(servers, null, 2), 'utf-8');
  fs.renameSync(tempFile, DB_FILE);
}

export function getAllServers(includeSecrets = false) {
  const servers = readAll();
  if (includeSecrets) return servers;
  return servers.map(s => {
    const clone = { ...s };
    if (clone.password) clone.hasPassword = true;
    delete clone.password;
    if (clone.passphrase) clone.hasPassphrase = true;
    delete clone.passphrase;
    return clone;
  });
}

export function getServerById(id, includeSecrets = false) {
  const servers = readAll();
  const server = servers.find(s => s.id === id);
  if (!server) return null;
  if (includeSecrets) {
    // If it uses private key, load it from keys dir if exists
    if (server.authType === 'key') {
      const keyPath = path.join(KEYS_DIR, `${server.id}.key`);
      if (fs.existsSync(keyPath)) {
        server.privateKey = fs.readFileSync(keyPath, 'utf-8');
      }
    }
    return server;
  }
  const clone = { ...server };
  if (clone.password) clone.hasPassword = true;
  delete clone.password;
  if (clone.passphrase) clone.hasPassphrase = true;
  delete clone.passphrase;
  return clone;
}

export function createServer(data) {
  const servers = readAll();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  let privateKeySaved = false;
  if (data.authType === 'key' && data.privateKey) {
    const keyPath = path.join(KEYS_DIR, `${id}.key`);
    fs.writeFileSync(keyPath, data.privateKey.trim(), { mode: 0o600 });
    privateKeySaved = true;
  }

  const newServer = {
    id,
    name: data.name || 'Nuevo VPS',
    host: data.host.trim(),
    port: parseInt(data.port, 10) || 22,
    username: data.username ? data.username.trim() : 'root',
    authType: data.authType || 'password', // 'password' or 'key'
    password: data.authType === 'password' ? data.password || '' : '',
    hasKeyFile: privateKeySaved,
    passphrase: data.passphrase || '',
    tags: Array.isArray(data.tags) ? data.tags : (data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : []),
    provider: data.provider || 'Other',
    notes: data.notes || '',
    status: 'unknown', // 'online' | 'offline' | 'unknown'
    lastChecked: null,
    metrics: null,
    createdAt: now,
    updatedAt: now
  };

  servers.push(newServer);
  writeAll(servers);

  return getServerById(id, false);
}

export function updateServer(id, data) {
  const servers = readAll();
  const index = servers.findIndex(s => s.id === id);
  if (index === -1) return null;

  const current = servers[index];
  const now = new Date().toISOString();

  if (data.authType === 'key' && data.privateKey) {
    const keyPath = path.join(KEYS_DIR, `${id}.key`);
    fs.writeFileSync(keyPath, data.privateKey.trim(), { mode: 0o600 });
    current.hasKeyFile = true;
  }

  current.name = data.name !== undefined ? data.name : current.name;
  current.host = data.host !== undefined ? data.host.trim() : current.host;
  current.port = data.port !== undefined ? parseInt(data.port, 10) : current.port;
  current.username = data.username !== undefined ? data.username.trim() : current.username;
  current.authType = data.authType !== undefined ? data.authType : current.authType;
  if (data.password !== undefined && data.password !== '') {
    current.password = data.password;
  }
  if (data.passphrase !== undefined) {
    current.passphrase = data.passphrase;
  }
  if (data.tags !== undefined) {
    current.tags = Array.isArray(data.tags) ? data.tags : data.tags.split(',').map(t => t.trim()).filter(Boolean);
  }
  if (data.provider !== undefined) current.provider = data.provider;
  if (data.notes !== undefined) current.notes = data.notes;
  current.updatedAt = now;

  servers[index] = current;
  writeAll(servers);

  return getServerById(id, false);
}

export function deleteServer(id) {
  let servers = readAll();
  const exists = servers.some(s => s.id === id);
  if (!exists) return false;

  servers = servers.filter(s => s.id !== id);
  writeAll(servers);

  const keyPath = path.join(KEYS_DIR, `${id}.key`);
  if (fs.existsSync(keyPath)) {
    try {
      fs.unlinkSync(keyPath);
    } catch (e) {
      console.warn(`Failed to delete key file for ${id}:`, e.message);
    }
  }

  return true;
}

export function updateServerMetrics(id, { status, metrics, error = null }) {
  const servers = readAll();
  const index = servers.findIndex(s => s.id === id);
  if (index === -1) return null;

  servers[index].status = status;
  servers[index].lastChecked = new Date().toISOString();
  if (metrics) {
    servers[index].metrics = metrics;
    servers[index].lastError = null;
  }
  if (error) {
    servers[index].lastError = error;
  }

  writeAll(servers);
  return getServerById(id, false);
}


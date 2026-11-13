import http from 'http';
import path from 'path';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb, getAllServers, getServerById, createServer, updateServer, deleteServer, updateServerMetrics } from './db.js';
import { fetchServerMetrics, executeSSHCommand, listSFTPDirectory, readSFTPFile, writeSFTPFile, streamSFTPArchive } from './sshService.js';
import { setupWebSocket } from './websocket.js';
import advancedRouter from './routes/advanced.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

initDb();

// Mount advanced feature routes (live metrics, systemd, logs, cron, packages, network, compose, nginx, docker stats)
app.use(advancedRouter);

// --- API ROUTES ---

// List all servers
app.get('/api/servers', (req, res) => {
  try {
    const servers = getAllServers(false);
    res.json(servers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create server
app.post('/api/servers', (req, res) => {
  try {
    const { name, host, port, username, authType, password, privateKey, passphrase, tags, provider, notes } = req.body;
    if (!host) {
      return res.status(400).json({ error: 'La dirección IP o Host es requerida' });
    }
    const created = createServer({
      name,
      host,
      port: port || 22,
      username: username || 'root',
      authType: authType || 'password',
      password,
      privateKey,
      passphrase,
      tags,
      provider,
      notes
    });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single server
app.get('/api/servers/:id', (req, res) => {
  try {
    const server = getServerById(req.params.id, false);
    if (!server) return res.status(404).json({ error: 'Servidor no encontrado' });
    res.json(server);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update server
app.put('/api/servers/:id', (req, res) => {
  try {
    const updated = updateServer(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Servidor no encontrado' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete server
app.delete('/api/servers/:id', (req, res) => {
  try {
    const success = deleteServer(req.params.id);
    if (!success) return res.status(404).json({ error: 'Servidor no encontrado' });
    res.json({ success: true, message: 'Servidor eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper for fetching metrics
async function refreshServerMetrics(id) {
  const server = getServerById(id, true);
  if (!server) throw new Error('Servidor no encontrado');

  try {
    const metrics = await fetchServerMetrics(server);
    return updateServerMetrics(id, {
      status: 'online',
      metrics
    });
  } catch (err) {
    return updateServerMetrics(id, {
      status: 'offline',
      error: err.message
    });
  }
}

// Refresh metrics for one server
app.post('/api/servers/:id/refresh', async (req, res) => {
  try {
    const updated = await refreshServerMetrics(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Refresh all servers in parallel
app.post('/api/servers/refresh-all', async (req, res) => {
  try {
    const servers = getAllServers(false);
    const results = await Promise.allSettled(servers.map(s => refreshServerMetrics(s.id)));
    const updated = getAllServers(false);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Native SSH launcher helper info
app.get('/api/servers/:id/native-command', (req, res) => {
  try {
    const server = getServerById(req.params.id, false);
    if (!server) return res.status(404).json({ error: 'Servidor no encontrado' });

    const portArg = server.port && server.port !== 22 ? `-p ${server.port} ` : '';
    const sshCommand = `ssh ${portArg}${server.username}@${server.host}`;
    const sshUri = `ssh://${server.username}@${server.host}:${server.port || 22}`;

    res.json({
      sshCommand,
      sshUri,
      host: server.host,
      port: server.port,
      username: server.username
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SFTP File Manager: list directory
app.get('/api/servers/:id/files', async (req, res) => {
  try {
    const server = getServerById(req.params.id, true);
    if (!server) return res.status(404).json({ error: 'Servidor no encontrado' });
    const dirPath = req.query.path || '/root';
    const result = await listSFTPDirectory(server, dirPath);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SFTP File Manager: read file preview
app.get('/api/servers/:id/files/view', async (req, res) => {
  try {
    const server = getServerById(req.params.id, true);
    if (!server) return res.status(404).json({ error: 'Servidor no encontrado' });
    const filePath = req.query.path;
    if (!filePath) return res.status(400).json({ error: 'Ruta no especificada' });
    const content = await readSFTPFile(server, filePath);
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Docker Containers: list
app.get('/api/servers/:id/docker', async (req, res) => {
  try {
    const server = getServerById(req.params.id, true);
    if (!server) return res.status(404).json({ error: 'Servidor no encontrado' });
    const cmd = `docker ps -a --format '{"id":"{{.ID}}","names":"{{.Names}}","image":"{{.Image}}","status":"{{.Status}}","ports":"{{.Ports}}"}' 2>/dev/null`;
    const { stdout, code } = await executeSSHCommand(server, cmd);
    if (code !== 0 && !stdout) {
      return res.json({ hasDocker: false, containers: [] });
    }
    const containers = stdout.trim().split('\n').filter(Boolean).map(line => {
      try { return JSON.parse(line); } catch (e) { return null; }
    }).filter(Boolean);
    res.json({ hasDocker: true, containers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Docker Action: start / stop / restart
app.post('/api/servers/:id/docker/action', async (req, res) => {
  try {
    const server = getServerById(req.params.id, true);
    if (!server) return res.status(404).json({ error: 'Servidor no encontrado' });
    const { containerId, action } = req.body;
    if (!containerId || !['start', 'stop', 'restart'].includes(action)) {
      return res.status(400).json({ error: 'Parámetros inválidos' });
    }
    const cmd = `docker ${action} ${containerId}`;
    const result = await executeSSHCommand(server, cmd);
    res.json({ success: result.code === 0, output: result.stdout || result.stderr });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Docker Logs
app.get('/api/servers/:id/docker/logs', async (req, res) => {
  try {
    const server = getServerById(req.params.id, true);
    if (!server) return res.status(404).json({ error: 'Servidor no encontrado' });
    const { containerId } = req.query;
    if (!containerId) return res.status(400).json({ error: 'Container ID requerido' });
    const cmd = `docker logs --tail 80 ${containerId} 2>&1`;
    const result = await executeSSHCommand(server, cmd);
    res.json({ logs: result.stdout || result.stderr || 'Sin logs disponibles' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Docker Run new container
app.post('/api/servers/:id/docker/run', async (req, res) => {
  try {
    const server = getServerById(req.params.id, true);
    if (!server) return res.status(404).json({ error: 'Servidor no encontrado' });
    const { image, name, ports, restartPolicy } = req.body;
    if (!image) return res.status(400).json({ error: 'Imagen de Docker requerida' });
    const nameArg = name ? `--name ${name.trim()} ` : '';
    const portArg = ports ? `-p ${ports.trim()} ` : '';
    const restartArg = restartPolicy ? `--restart ${restartPolicy} ` : '--restart unless-stopped ';
    const cmd = `docker run -d ${restartArg}${nameArg}${portArg}${image.trim()}`;
    const result = await executeSSHCommand(server, cmd);
    res.json({ success: result.code === 0, output: result.stdout || result.stderr });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Docker Remove container
app.post('/api/servers/:id/docker/rm', async (req, res) => {
  try {
    const server = getServerById(req.params.id, true);
    if (!server) return res.status(404).json({ error: 'Servidor no encontrado' });
    const { containerId } = req.body;
    const cmd = `docker rm -f ${containerId}`;
    const result = await executeSSHCommand(server, cmd);
    res.json({ success: result.code === 0, output: result.stdout || result.stderr });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SFTP File Manager: save/edit text file
app.post('/api/servers/:id/files/save', async (req, res) => {
  try {
    const server = getServerById(req.params.id, true);
    if (!server) return res.status(404).json({ error: 'Servidor no encontrado' });
    const { path: filePath, content } = req.body;
    if (!filePath) return res.status(400).json({ error: 'Ruta no especificada' });
    const result = await writeSFTPFile(server, filePath, content || '');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SFTP File Manager: delete file / directory
app.post('/api/servers/:id/files/delete', async (req, res) => {
  try {
    const server = getServerById(req.params.id, true);
    if (!server) return res.status(404).json({ error: 'Servidor no encontrado' });
    const { path: targetPath, isDirectory } = req.body;
    if (!targetPath || targetPath === '/' || targetPath === '/root') {
      return res.status(400).json({ error: 'Ruta protegida' });
    }
    const cmd = isDirectory ? `rm -rf "${targetPath}"` : `rm -f "${targetPath}"`;
    const result = await executeSSHCommand(server, cmd);
    res.json({ success: result.code === 0, output: result.stdout || result.stderr });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Git: Detect repositories in common paths
app.get('/api/servers/:id/git/detect', async (req, res) => {
  try {
    const server = getServerById(req.params.id, true);
    if (!server) return res.status(404).json({ error: 'Servidor no encontrado' });
    const cmd = `find /var/www /root /home -maxdepth 3 -name ".git" -type d 2>/dev/null | sed 's/\\/\\.git$//' | head -n 15`;
    const { stdout } = await executeSSHCommand(server, cmd);
    const paths = stdout.trim().split('\n').filter(Boolean);
    res.json({ repos: paths });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Git: Repo Status (branch, branches list, last commits, status, remote)
app.get('/api/servers/:id/git/status', async (req, res) => {
  try {
    const server = getServerById(req.params.id, true);
    if (!server) return res.status(404).json({ error: 'Servidor no encontrado' });
    const repoPath = req.query.path;
    if (!repoPath) return res.status(400).json({ error: 'Ruta de repositorio requerida' });
    const cmd = `cd "${repoPath}" && git branch --show-current && echo "---BRANCHES---" && git branch -a && echo "---REMOTE---" && (git remote get-url origin 2>/dev/null || echo "") && echo "---LOG---" && git log -n 10 --pretty=format:"%h|||%s|||%an|||%cr" && echo "---STATUS---" && git status -s`;
    const { stdout, stderr, code } = await executeSSHCommand(server, cmd);
    if (code !== 0) {
      return res.status(400).json({ error: stderr || 'No es un repositorio Git válido' });
    }
    const [branchPart, rest1] = stdout.split('---BRANCHES---');
    const [branchesPart, rest2] = (rest1 || '').split('---REMOTE---');
    const [remotePart, rest3] = (rest2 || '').split('---LOG---');
    const [logPart, statusPart] = (rest3 || '').split('---STATUS---');

    const rawBranches = (branchesPart || '')
      .split('\n')
      .map(b => b.replace(/^\*?\s+/, '').trim())
      .filter(b => b && !b.includes('->'));
    const uniqueBranches = Array.from(new Set(rawBranches.map(b => b.replace(/^remotes\/origin\//, ''))));

    const commits = (logPart || '').trim().split('\n').filter(Boolean).map(line => {
      const parts = line.split('|||');
      return {
        hash: parts[0] || '',
        subject: parts[1] || '',
        author: parts[2] || '',
        time: parts[3] || ''
      };
    });

    res.json({
      branch: (branchPart || '').trim(),
      branches: uniqueBranches,
      remoteUrl: (remotePart || '').trim(),
      commits,
      status: (statusPart || '').trim()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Git: Pull
app.post('/api/servers/:id/git/pull', async (req, res) => {
  try {
    const server = getServerById(req.params.id, true);
    if (!server) return res.status(404).json({ error: 'Servidor no encontrado' });
    const { path: repoPath } = req.body;
    if (!repoPath) return res.status(400).json({ error: 'Ruta requerida' });
    const cmd = `cd "${repoPath}" && git pull`;
    const result = await executeSSHCommand(server, cmd);
    res.json({ success: result.code === 0, output: result.stdout || result.stderr });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Git: Checkout (branch or commit)
app.post('/api/servers/:id/git/checkout', async (req, res) => {
  try {
    const server = getServerById(req.params.id, true);
    if (!server) return res.status(404).json({ error: 'Servidor no encontrado' });
    const { path: repoPath, target } = req.body;
    if (!repoPath || !target) return res.status(400).json({ error: 'Ruta y destino (rama/commit) requeridos' });
    const safeTarget = target.trim().replace(/[^a-zA-Z0-9_\-./]/g, '');
    const cmd = `cd "${repoPath}" && git checkout "${safeTarget}"`;
    const result = await executeSSHCommand(server, cmd);
    res.json({ success: result.code === 0, output: result.stdout || result.stderr });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Git: Fetch all
app.post('/api/servers/:id/git/fetch', async (req, res) => {
  try {
    const server = getServerById(req.params.id, true);
    if (!server) return res.status(404).json({ error: 'Servidor no encontrado' });
    const { path: repoPath } = req.body;
    if (!repoPath) return res.status(400).json({ error: 'Ruta requerida' });
    const cmd = `cd "${repoPath}" && git fetch --all --prune`;
    const result = await executeSSHCommand(server, cmd);
    res.json({ success: result.code === 0, output: result.stdout || result.stderr || 'Fetch completado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Git: Reset hard (discard local uncommitted changes)
app.post('/api/servers/:id/git/reset', async (req, res) => {
  try {
    const server = getServerById(req.params.id, true);
    if (!server) return res.status(404).json({ error: 'Servidor no encontrado' });
    const { path: repoPath } = req.body;
    if (!repoPath) return res.status(400).json({ error: 'Ruta requerida' });
    const cmd = `cd "${repoPath}" && git reset --hard HEAD && git clean -fd`;
    const result = await executeSSHCommand(server, cmd);
    res.json({ success: result.code === 0, output: result.stdout || result.stderr || 'Cambios descartados exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Git: Stash
app.post('/api/servers/:id/git/stash', async (req, res) => {
  try {
    const server = getServerById(req.params.id, true);
    if (!server) return res.status(404).json({ error: 'Servidor no encontrado' });
    const { path: repoPath, action } = req.body;
    if (!repoPath) return res.status(400).json({ error: 'Ruta requerida' });
    const cmd = action === 'pop' ? `cd "${repoPath}" && git stash pop` : `cd "${repoPath}" && git stash`;
    const result = await executeSSHCommand(server, cmd);
    res.json({ success: result.code === 0, output: result.stdout || result.stderr || 'Operación stash completada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Git: Clone new repository
app.post('/api/servers/:id/git/clone', async (req, res) => {
  try {
    const server = getServerById(req.params.id, true);
    if (!server) return res.status(404).json({ error: 'Servidor no encontrado' });
    const { repoUrl, targetDir, branch } = req.body;
    if (!repoUrl) return res.status(400).json({ error: 'URL del repositorio requerida' });
    const branchArg = branch ? `-b ${branch.trim()} ` : '';
    const dest = targetDir ? `"${targetDir.trim()}"` : '';
    const cmd = `git clone ${branchArg}${repoUrl.trim()} ${dest}`;
    const result = await executeSSHCommand(server, cmd);
    res.json({ success: result.code === 0, output: result.stdout || result.stderr });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Git: Download repository as zip archive
app.get('/api/servers/:id/git/download', async (req, res) => {
  try {
    const server = getServerById(req.params.id, true);
    if (!server) return res.status(404).json({ error: 'Servidor no encontrado' });
    const repoPath = req.query.path;
    if (!repoPath) return res.status(400).json({ error: 'Ruta de repositorio requerida' });
    await streamSFTPArchive(server, repoPath, res);
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

// SFTP File Manager: Download folder or directory as zip archive
app.get('/api/servers/:id/files/download', async (req, res) => {
  try {
    const server = getServerById(req.params.id, true);
    if (!server) return res.status(404).json({ error: 'Servidor no encontrado' });
    const dirPath = req.query.path;
    if (!dirPath) return res.status(400).json({ error: 'Ruta no especificada' });
    await streamSFTPArchive(server, dirPath, res);
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

// Firewall (UFW) Status & Management
app.get('/api/servers/:id/firewall', async (req, res) => {
  try {
    const server = getServerById(req.params.id, true);
    if (!server) return res.status(404).json({ error: 'Servidor no encontrado' });
    const cmd = `(command -v ufw >/dev/null 2>&1 && ufw status numbered 2>/dev/null) || echo "UFW_NOT_FOUND"`;
    const { stdout } = await executeSSHCommand(server, cmd);
    const hasUfw = !stdout.includes('UFW_NOT_FOUND');
    const isActive = stdout.includes('Status: active');
    const lines = stdout.split('\n').filter(l => l.startsWith('['));
    const rules = lines.map(line => {
      const match = line.match(/\[\s*(\d+)\]\s+([^\s]+)\s+([^\s]+)\s+(.+)/);
      if (match) {
        return { number: match[1], to: match[2], action: match[3], from: match[4] };
      }
      return { raw: line };
    });
    res.json({ hasUfw, isActive, rawOutput: stdout, rules });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Firewall Rule action: allow / delete
app.post('/api/servers/:id/firewall/rule', async (req, res) => {
  try {
    const server = getServerById(req.params.id, true);
    if (!server) return res.status(404).json({ error: 'Servidor no encontrado' });
    const { port, proto = 'tcp', action = 'allow' } = req.body;
    if (!port) return res.status(400).json({ error: 'Puerto requerido' });
    const cmd = action === 'delete'
      ? `ufw delete allow ${port}/${proto}`
      : `ufw allow ${port}/${proto}`;
    const result = await executeSSHCommand(server, cmd);
    res.json({ success: result.code === 0, output: result.stdout || result.stderr });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend static build in production
const frontendDist = path.resolve(process.cwd(), '../frontend/dist');
const altFrontendDist = path.resolve(process.cwd(), 'frontend/dist');
const distPath = fs.existsSync(frontendDist) ? frontendDist : (fs.existsSync(altFrontendDist) ? altFrontendDist : null);

if (distPath) {
  console.log(`Serving static frontend from: ${distPath}`);
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/ws')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const server = http.createServer(app);

// Setup WebSocket for interactive SSH terminal
setupWebSocket(server);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`===============================================`);
  console.log(` NeoShh Control is running on port ${PORT}`);
  console.log(` Web UI: http://localhost:${PORT}`);
  console.log(`===============================================`);
});


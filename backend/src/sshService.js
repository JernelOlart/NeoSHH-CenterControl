import { Client } from 'ssh2';

export function getSSHConfig(server, timeoutMs = 10000) {
  const config = {
    host: server.host,
    port: server.port || 22,
    username: server.username || 'root',
    readyTimeout: timeoutMs,
    keepaliveInterval: 10000,
    keepaliveCountMax: 3
  };

  if (server.authType === 'key') {
    if (!server.privateKey) {
      throw new Error('Clave privada no encontrada para este servidor.');
    }
    config.privateKey = server.privateKey;
    if (server.passphrase) {
      config.passphrase = server.passphrase;
    }
  } else {
    config.password = server.password || '';
  }

  return config;
}

const METRICS_CMD = `sh -c '
echo "---METRICS_START---"
echo "HOSTNAME: $(hostname 2>/dev/null || cat /etc/hostname 2>/dev/null || echo unknown)"
echo "OS: $(grep -E "^PRETTY_NAME=" /etc/os-release 2>/dev/null | cut -d= -f2 | tr -d "\\"" || uname -sr 2>/dev/null || echo Linux)"
echo "KERNEL: $(uname -r 2>/dev/null || echo unknown)"
echo "UPTIME: $(uptime -p 2>/dev/null || uptime 2>/dev/null || echo unknown)"
echo "CPU_CORES: $(nproc 2>/dev/null || grep -c ^processor /proc/cpuinfo 2>/dev/null || echo 1)"
echo "CPU_MODEL: $(grep -m1 "model name" /proc/cpuinfo 2>/dev/null | cut -d: -f2 | xargs || uname -m 2>/dev/null || echo CPU)"
echo "LOAD_AVG: $(cat /proc/loadavg 2>/dev/null | awk "{print \\$1,\\$2,\\$3}" || uptime | awk -F "load average:" "{print \\$2}")"
echo "MEM: $(free -m 2>/dev/null | awk "NR==2{printf \\"%s %s %s\\", \\$2, \\$3, \\$7}")"
echo "---DISK_START---"
df -hP -x tmpfs -x devtmpfs -x overlay -x squashfs 2>/dev/null | tail -n +2
echo "---DISK_END---"
echo "---SERVICES_START---"
(ss -tulpn 2>/dev/null || netstat -tulpn 2>/dev/null || lsof -i -P -n 2>/dev/null) | head -n 35
echo "---SERVICES_END---"
echo "---DOCKER_START---"
(command -v docker >/dev/null 2>&1 && docker ps -a --format "{{.ID}}|{{.Names}}|{{.Image}}|{{.Status}}|{{.Ports}}" 2>/dev/null | head -n 25) || echo "NO_DOCKER"
echo "---DOCKER_END---"
echo "---METRICS_END---"
'`;

export function parseMetricsOutput(raw) {
  const result = {
    hostname: 'unknown',
    os: 'Linux',
    kernel: '',
    uptime: '',
    cpuCores: 1,
    cpuModel: '',
    loadAvg: [0, 0, 0],
    memory: { totalMb: 0, usedMb: 0, freeMb: 0, percent: 0 },
    disks: [],
    services: [],
    dockerContainers: [],
    hasDocker: false,
    hasWeb: false,
    webPort: null
  };

  const lines = raw.split('\n').map(l => l.trim());

  let section = null;
  for (const line of lines) {
    if (!line) continue;
    if (line === '---DISK_START---') { section = 'disk'; continue; }
    if (line === '---DISK_END---') { section = null; continue; }
    if (line === '---SERVICES_START---') { section = 'services'; continue; }
    if (line === '---SERVICES_END---') { section = null; continue; }
    if (line === '---DOCKER_START---') { section = 'docker'; continue; }
    if (line === '---DOCKER_END---') { section = null; continue; }

    if (section === 'disk') {
      const parts = line.split(/\s+/);
      if (parts.length >= 6) {
        result.disks.push({
          filesystem: parts[0],
          size: parts[1],
          used: parts[2],
          avail: parts[3],
          percent: parseInt(parts[4].replace('%', ''), 10) || 0,
          mount: parts[5]
        });
      }
      continue;
    }

    if (section === 'services') {
      if (line.includes('LISTEN') || line.startsWith('tcp') || line.startsWith('udp')) {
        const parts = line.split(/\s+/);
        const addrPart = parts.find(p => p.includes(':') && !p.startsWith('users:'));
        if (addrPart) {
          const portStr = addrPart.split(':').pop();
          const port = parseInt(portStr, 10);
          if (port) {
            const proto = parts[0] || 'tcp';
            const procPart = parts.find(p => p.includes('users:(') || p.includes('/'));
            const proc = procPart ? procPart.replace(/.*users:\(\("([^"]+)".*/, '$1') : 'service';
            
            if (!result.services.some(s => s.port === port && s.proto === proto)) {
              result.services.push({ port, proto, process: proc });
            }

            if ([80, 443, 8080, 3000, 8000].includes(port) && !result.hasWeb) {
              result.hasWeb = true;
              result.webPort = port;
            }
          }
        }
      }
      continue;
    }

    if (section === 'docker') {
      if (line !== 'NO_DOCKER' && line.includes('|')) {
        result.hasDocker = true;
        const [id, names, image, status, ports] = line.split('|');
        result.dockerContainers.push({
          id,
          name: names,
          image,
          status,
          ports,
          running: status ? status.toLowerCase().startsWith('up') : false
        });
      }
      continue;
    }

    if (line.startsWith('HOSTNAME:')) result.hostname = line.replace('HOSTNAME:', '').trim();
    if (line.startsWith('OS:')) result.os = line.replace('OS:', '').trim();
    if (line.startsWith('KERNEL:')) result.kernel = line.replace('KERNEL:', '').trim();
    if (line.startsWith('UPTIME:')) result.uptime = line.replace('UPTIME:', '').trim();
    if (line.startsWith('CPU_CORES:')) result.cpuCores = parseInt(line.replace('CPU_CORES:', '').trim(), 10) || 1;
    if (line.startsWith('CPU_MODEL:')) result.cpuModel = line.replace('CPU_MODEL:', '').trim();
    if (line.startsWith('LOAD_AVG:')) {
      const parts = line.replace('LOAD_AVG:', '').trim().split(/\s+/);
      result.loadAvg = parts.map(p => parseFloat(p) || 0).slice(0, 3);
    }
    if (line.startsWith('MEM:')) {
      const parts = line.replace('MEM:', '').trim().split(/\s+/);
      if (parts.length >= 3) {
        const total = parseInt(parts[0], 10) || 0;
        const used = parseInt(parts[1], 10) || 0;
        const available = parseInt(parts[2], 10) || 0;
        const percent = total > 0 ? Math.round(((total - available) / total) * 100) : 0;
        result.memory = {
          totalMb: total,
          usedMb: total - available,
          availableMb: available,
          percent
        };
      }
    }
  }

  const rootDisk = result.disks.find(d => d.mount === '/') || result.disks[0] || null;
  result.primaryDisk = rootDisk;

  return result;
}

export function fetchServerMetrics(server) {
  return new Promise((resolve, reject) => {
    let sshConfig;
    try {
      sshConfig = getSSHConfig(server, 10000);
    } catch (err) {
      return reject(err);
    }

    const conn = new Client();
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      conn.end();
      reject(new Error('Tiempo de espera agotado al conectar al VPS'));
    }, 12000);

    conn.on('ready', () => {
      conn.exec(METRICS_CMD, (err, stream) => {
        if (err) {
          clearTimeout(timer);
          conn.end();
          return reject(err);
        }

        let stdout = '';
        let stderr = '';

        stream.on('close', (code) => {
          clearTimeout(timer);
          conn.end();
          if (code !== 0 && !stdout.includes('---METRICS_START---')) {
            return reject(new Error(stderr || `Comando finalizó con código ${code}`));
          }
          try {
            const metrics = parseMetricsOutput(stdout);
            resolve(metrics);
          } catch (e) {
            reject(e);
          }
        });

        stream.on('data', data => stdout += data.toString('utf-8'));
        stream.stderr.on('data', data => stderr += data.toString('utf-8'));
      });
    });

    conn.on('error', err => {
      clearTimeout(timer);
      if (!timedOut) reject(err);
    });

    try {
      conn.connect(sshConfig);
    } catch (err) {
      clearTimeout(timer);
      reject(err);
    }
  });
}

// Execute arbitrary shell command on server
export function executeSSHCommand(server, command) {
  return new Promise((resolve, reject) => {
    let sshConfig;
    try {
      sshConfig = getSSHConfig(server, 15000);
    } catch (err) {
      return reject(err);
    }

    const conn = new Client();
    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end();
          return reject(err);
        }
        let stdout = '';
        let stderr = '';
        stream.on('close', (code) => {
          conn.end();
          resolve({ stdout, stderr, code });
        });
        stream.on('data', d => stdout += d.toString('utf-8'));
        stream.stderr.on('data', d => stderr += d.toString('utf-8'));
      });
    });
    conn.on('error', err => reject(err));
    conn.connect(sshConfig);
  });
}

// Native SFTP File Manager Methods
export function listSFTPDirectory(server, dirPath = '/') {
  return new Promise((resolve, reject) => {
    let sshConfig;
    try {
      sshConfig = getSSHConfig(server, 10000);
    } catch (err) {
      return reject(err);
    }

    const conn = new Client();
    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) {
          conn.end();
          return reject(err);
        }
        const target = dirPath || '/';
        sftp.readdir(target, (err, list) => {
          conn.end();
          if (err) return reject(err);
          const entries = list.map(item => ({
            name: item.filename,
            isDirectory: item.attrs.isDirectory(),
            isFile: item.attrs.isFile(),
            size: item.attrs.size,
            modifyTime: new Date(item.attrs.mtime * 1000).toISOString(),
            permissions: (item.attrs.mode & 0o777).toString(8)
          })).sort((a, b) => {
            if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
            return a.isDirectory ? -1 : 1;
          });
          resolve({ path: target, entries });
        });
      });
    });
    conn.on('error', err => reject(err));
    conn.connect(sshConfig);
  });
}

export function readSFTPFile(server, filePath) {
  return new Promise((resolve, reject) => {
    let sshConfig;
    try {
      sshConfig = getSSHConfig(server, 10000);
    } catch (err) {
      return reject(err);
    }

    const conn = new Client();
    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) {
          conn.end();
          return reject(err);
        }
        const stream = sftp.createReadStream(filePath, { encoding: 'utf-8', start: 0, end: 150 * 1024 });
        let content = '';
        stream.on('data', d => content += d);
        stream.on('end', () => {
          conn.end();
          resolve(content);
        });
        stream.on('error', e => {
          conn.end();
          reject(e);
        });
      });
    });
    conn.on('error', err => reject(err));
    conn.connect(sshConfig);
  });
}

export function writeSFTPFile(server, filePath, content) {
  return new Promise((resolve, reject) => {
    let sshConfig;
    try {
      sshConfig = getSSHConfig(server, 10000);
    } catch (err) {
      return reject(err);
    }

    const conn = new Client();
    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) {
          conn.end();
          return reject(err);
        }
        const stream = sftp.createWriteStream(filePath, { encoding: 'utf-8' });
        stream.on('close', () => {
          conn.end();
          resolve({ success: true, path: filePath });
        });
        stream.on('error', err => {
          conn.end();
          reject(err);
        });
        stream.end(content);
      });
    });
    conn.on('error', err => reject(err));
    conn.connect(sshConfig);
  });
}

import { Client } from 'ssh2';
import crypto from 'crypto';
import { getSSHConfig } from '../sshService.js';

// ---------------------------------------------------------------------------
// Internal helper: run a shell command on the remote server via ssh2 and
// resolve with { stdout, stderr, code }.
// ---------------------------------------------------------------------------
function sshExec(server, command, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    let sshConfig;
    try {
      sshConfig = getSSHConfig(server, timeoutMs);
    } catch (err) {
      return reject(err);
    }

    const conn = new Client();
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      conn.end();
      reject(new Error(`SSH command timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
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
          resolve({ stdout, stderr, code: code ?? 0 });
        });

        stream.on('data', (d) => { stdout += d.toString('utf-8'); });
        stream.stderr.on('data', (d) => { stderr += d.toString('utf-8'); });
      });
    });

    conn.on('error', (err) => {
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

// ---------------------------------------------------------------------------
// 1. getLiveMetrics
// ---------------------------------------------------------------------------
export async function getLiveMetrics(server) {
  const cmd = "cat /proc/stat | head -1 && sleep 0.5 && cat /proc/stat | head -1 && free -m && cat /proc/net/dev | grep -v lo | tail -1 && nproc && cat /proc/cpuinfo | grep 'model name' | head -1 && (cat /proc/loadavg 2>/dev/null || echo '0 0 0')";
  try {
    const { stdout } = await sshExec(server, cmd, 20000);
    const lines = stdout.split('\n').map(l => l.trim()).filter(Boolean);

    // Parse CPU delta from the two /proc/stat lines
    const statLines = lines.filter(l => l.startsWith('cpu '));
    let cpuPercent = 0;
    if (statLines.length >= 2) {
      const parseCpu = (line) => {
        const parts = line.replace(/^cpu\s+/, '').split(/\s+/).map(Number);
        const idle = (parts[3] || 0) + (parts[4] || 0); // idle + iowait
        const total = parts.reduce((acc, v) => acc + (v || 0), 0);
        return { idle, total };
      };
      const t1 = parseCpu(statLines[0]);
      const t2 = parseCpu(statLines[1]);
      const deltaTotal = t2.total - t1.total;
      const deltaIdle = t2.idle - t1.idle;
      if (deltaTotal > 0) {
        cpuPercent = Math.max(0, Math.min(100, parseFloat(((1 - deltaIdle / deltaTotal) * 100).toFixed(1))));
      }
    }

    // Parse RAM from free -m
    const memLine = lines.find(l => l.startsWith('Mem:'));
    let ram = { totalMb: 0, usedMb: 0, percent: 0 };
    if (memLine) {
      const parts = memLine.split(/\s+/);
      const totalMb = parseInt(parts[1], 10) || 0;
      const usedMb = parseInt(parts[2], 10) || 0;
      const percent = totalMb > 0 ? parseFloat(((usedMb / totalMb) * 100).toFixed(1)) : 0;
      ram = { totalMb, usedMb, percent };
    }

    // Parse network from /proc/net/dev
    let net = { rx_bytes: 0, tx_bytes: 0, interface: 'eth0' };
    const netLine = lines.find(l => l.includes(':') && !l.startsWith('cpu') && !l.startsWith('Mem:') && !l.startsWith('Swap:') && /\d/.test(l));
    if (netLine) {
      const colonIdx = netLine.indexOf(':');
      const iface = netLine.slice(0, colonIdx).trim();
      const stats = netLine.slice(colonIdx + 1).trim().split(/\s+/);
      net = {
        rx_bytes: parseInt(stats[0], 10) || 0,
        tx_bytes: parseInt(stats[8], 10) || 0,
        interface: iface
      };
    }

    // Cores from nproc
    const nprocLine = lines.find(l => /^\d+$/.test(l));
    const cores = nprocLine ? parseInt(nprocLine, 10) : 1;

    // CPU model
    const modelLine = lines.find(l => l.toLowerCase().startsWith('model name'));
    const model = modelLine ? modelLine.split(':').slice(1).join(':').trim() : 'Unknown CPU';

    // Load avg
    let loadAvg = [0, 0, 0];
    const loadLine = lines.find(l => /^\d+(\.\d+)?\s+\d+(\.\d+)?\s+\d+(\.\d+)?/.test(l));
    if (loadLine) {
      const lparts = loadLine.split(/\s+/);
      loadAvg = [parseFloat(lparts[0]) || 0, parseFloat(lparts[1]) || 0, parseFloat(lparts[2]) || 0];
    }

    return {
      cpu: { percent: cpuPercent, model, cores, loadAvg },
      ram,
      net
    };
  } catch (err) {
    console.error(`[getLiveMetrics] Error for server ${server.name || server.id}:`, err.message);
    return {
      cpu: { percent: 0, model: 'Unknown', cores: 1, loadAvg: [0, 0, 0] },
      ram: { totalMb: 0, usedMb: 0, percent: 0 },
      net: { rx_bytes: 0, tx_bytes: 0, interface: '' },
      error: err.message
    };
  }
}

// ---------------------------------------------------------------------------
// 2. getSystemServices
// ---------------------------------------------------------------------------
export async function getSystemServices(server) {
  try {
    const { stdout } = await sshExec(server, 'systemctl list-units --type=service --no-pager --no-legend | head -50', 20000);
    const services = [];
    for (const rawLine of stdout.split('\n')) {
      const line = rawLine.trim().replace(/^●\s*/, '');
      if (!line) continue;
      const parts = line.split(/\s+/);
      if (parts.length < 4) continue;
      const name = parts[0];
      const load = parts[1];
      const active = parts[2];
      const sub = parts[3];
      const description = parts.slice(4).join(' ');
      services.push({
        name,
        load,
        active,
        sub,
        status: active,
        description,
        enabled: load === 'loaded'
      });
    }
    return { services };
  } catch (err) {
    return { services: [] };
  }
}

// ---------------------------------------------------------------------------
// 3. serviceAction
// ---------------------------------------------------------------------------
export async function serviceAction(server, serviceName, action) {
  const allowed = ['start', 'stop', 'restart', 'enable', 'disable'];
  if (!allowed.includes(action)) {
    return { success: false, output: `Invalid action: ${action}` };
  }
  const cleanName = (serviceName || '').replace(/[^a-zA-Z0-9_@.-]/g, '');
  if (!cleanName) {
    return { success: false, output: 'Invalid service name' };
  }
  try {
    const { stdout, stderr, code } = await sshExec(server, `sudo systemctl ${action} ${cleanName}`, 30000);
    return {
      success: code === 0,
      output: (stdout + (stderr ? `\n${stderr}` : '')).trim() || `Service ${action} succeeded`
    };
  } catch (err) {
    return { success: false, output: err.message };
  }
}

// ---------------------------------------------------------------------------
// 4. getSystemLogs
// ---------------------------------------------------------------------------
export async function getSystemLogs(server, source = 'syslog', lines = 100, filter = '') {
  const lineCount = parseInt(lines, 10) || 100;
  const cleanFilter = filter ? filter.replace(/["`$\\]/g, '') : '';
  const filterArg = cleanFilter ? `-g "${cleanFilter}"` : '';
  const grepArg = cleanFilter ? ` | grep -i "${cleanFilter}"` : '';

  let cmd = '';
  switch (source) {
    case 'journal':
      cmd = `journalctl -n ${lineCount} --no-pager ${filterArg}`;
      break;
    case 'nginx':
      cmd = `tail -n ${lineCount} /var/log/nginx/error.log 2>/dev/null${grepArg}`;
      break;
    case 'apache':
      cmd = `tail -n ${lineCount} /var/log/apache2/error.log 2>/dev/null${grepArg}`;
      break;
    case 'syslog':
    default:
      cmd = `tail -n ${lineCount} /var/log/syslog 2>/dev/null${grepArg} || journalctl -n ${lineCount} --no-pager ${filterArg}`;
      break;
  }

  try {
    const { stdout, stderr } = await sshExec(server, cmd, 20000);
    return { logs: stdout || stderr || '', source };
  } catch (err) {
    return { logs: err.message, source };
  }
}

// ---------------------------------------------------------------------------
// 5. getCronJobs
// ---------------------------------------------------------------------------
export async function getCronJobs(server) {
  try {
    const { stdout } = await sshExec(server, "crontab -l 2>/dev/null; echo '---SYSTEM---'; ls /etc/cron.d/ 2>/dev/null", 15000);
    const [userPart, systemPart] = stdout.split('---SYSTEM---');

    const userCrons = [];
    for (const raw of (userPart || '').split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const parts = line.split(/\s+/);
      if (parts.length < 6) continue;
      const [minute, hour, dom, month, dow, ...cmdParts] = parts;
      userCrons.push({
        raw: line,
        minute,
        hour,
        dom,
        month,
        dow,
        command: cmdParts.join(' ')
      });
    }

    const systemCrons = (systemPart || '')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('.'));

    return { userCrons, systemCrons };
  } catch (err) {
    return { userCrons: [], systemCrons: [] };
  }
}

// ---------------------------------------------------------------------------
// 6. saveCronJob
// ---------------------------------------------------------------------------
export async function saveCronJob(server, cronExpression, command, operation = 'add', originalLine = '') {
  try {
    let cmd = '';
    if (operation === 'add') {
      const entry = `${(cronExpression || '').trim()} ${(command || '').trim()}`;
      const escaped = entry.replace(/'/g, "'\\''");
      cmd = `crontab -l 2>/dev/null | { cat; echo '${escaped}'; } | crontab -`;
    } else {
      const target = (originalLine || `${cronExpression || ''} ${command || ''}`).trim();
      const escaped = target.replace(/'/g, "'\\''");
      cmd = `tmp=$(crontab -l 2>/dev/null | grep -Fv '${escaped}'); if [ -n "$tmp" ]; then echo "$tmp" | crontab -; else crontab -r 2>/dev/null || true; fi`;
    }
    const { stdout, stderr, code } = await sshExec(server, cmd, 15000);
    return { success: code === 0, output: (stdout + stderr).trim() || 'Cron updated successfully' };
  } catch (err) {
    return { success: false, output: err.message };
  }
}

// ---------------------------------------------------------------------------
// 7. getPackages
// ---------------------------------------------------------------------------
export async function getPackages(server) {
  try {
    const detectCmd = "command -v apt-get 2>/dev/null && echo apt || (command -v yum 2>/dev/null && echo yum || (command -v apk 2>/dev/null && echo apk || echo apt))";
    const { stdout: pmOut } = await sshExec(server, detectCmd, 10000);
    const pm = pmOut.trim().split('\n').filter(l => ['apt', 'yum', 'apk'].includes(l.trim())).pop() || 'apt';

    let cmd = '';
    if (pm === 'apt') {
      cmd = "dpkg --get-selections 2>/dev/null | grep install | head -50 && echo '---UPGRADABLE---' && apt list --upgradable 2>/dev/null | tail -n +2 | head -20";
    } else if (pm === 'yum') {
      cmd = "rpm -qa 2>/dev/null | head -50 && echo '---UPGRADABLE---' && yum check-update 2>/dev/null | head -20";
    } else {
      cmd = "apk list --installed 2>/dev/null | head -50 && echo '---UPGRADABLE---'";
    }

    const { stdout } = await sshExec(server, cmd, 30000);
    const [instPart, upgPart] = stdout.split('---UPGRADABLE---');

    const installed = (instPart || '')
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);

    const upgradable = (upgPart || '')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('Listing...'));

    return { packageManager: pm, installed, upgradable };
  } catch (err) {
    return { packageManager: 'apt', installed: [], upgradable: [] };
  }
}

// ---------------------------------------------------------------------------
// 8. runPackageCommand
// ---------------------------------------------------------------------------
export async function runPackageCommand(server, action, packageName = '') {
  const cleanPkg = (packageName || '').replace(/[^a-zA-Z0-9_@.:+-]/g, '');
  let cmd = '';
  switch (action) {
    case 'update':
      cmd = "if command -v apt-get >/dev/null 2>&1; then DEBIAN_FRONTEND=noninteractive apt-get -y update; elif command -v yum >/dev/null 2>&1; then yum check-update; else apk update; fi";
      break;
    case 'upgrade':
      cmd = "if command -v apt-get >/dev/null 2>&1; then DEBIAN_FRONTEND=noninteractive apt-get -y upgrade; elif command -v yum >/dev/null 2>&1; then yum -y update; else apk upgrade; fi";
      break;
    case 'install':
      if (!cleanPkg) return { success: false, output: 'Package name required' };
      cmd = `if command -v apt-get >/dev/null 2>&1; then DEBIAN_FRONTEND=noninteractive apt-get -y install ${cleanPkg}; elif command -v yum >/dev/null 2>&1; then yum -y install ${cleanPkg}; else apk add ${cleanPkg}; fi`;
      break;
    case 'remove':
      if (!cleanPkg) return { success: false, output: 'Package name required' };
      cmd = `if command -v apt-get >/dev/null 2>&1; then DEBIAN_FRONTEND=noninteractive apt-get -y remove ${cleanPkg}; elif command -v yum >/dev/null 2>&1; then yum -y remove ${cleanPkg}; else apk del ${cleanPkg}; fi`;
      break;
    default:
      return { success: false, output: `Invalid action: ${action}` };
  }

  try {
    const { stdout, stderr, code } = await sshExec(server, cmd, 120000);
    return { success: code === 0, output: (stdout + stderr).trim() };
  } catch (err) {
    return { success: false, output: err.message };
  }
}

// ---------------------------------------------------------------------------
// 9. getNetworkInfo
// ---------------------------------------------------------------------------
export async function getNetworkInfo(server) {
  const cmd = "ss -tulpn 2>/dev/null | head -40 && echo '---IFACES---' && ip -s link show 2>/dev/null && echo '---ROUTES---' && ip route show 2>/dev/null";
  try {
    const { stdout } = await sshExec(server, cmd, 20000);
    const [ssPart, rest1] = stdout.split('---IFACES---');
    const [ifacesPart, routesPart] = (rest1 || '').split('---ROUTES---');

    const connections = [];
    for (const raw of (ssPart || '').split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('Netid')) continue;
      const parts = line.split(/\s+/);
      if (parts.length < 5) continue;
      connections.push({
        proto: parts[0],
        state: parts[1],
        localAddr: parts[4],
        process: parts[6] || parts[5] || ''
      });
    }

    const interfaces = [];
    const ifaceBlocks = (ifacesPart || '').split(/\n(?=\d+:)/);
    for (const block of ifaceBlocks) {
      const nameMatch = block.match(/^\d+:\s+([^:@\s]+)/);
      if (!nameMatch) continue;
      const name = nameMatch[1];
      const lines = block.split('\n');
      let rxBytes = 0;
      let txBytes = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('RX:')) {
          const vals = lines[i + 1]?.trim().split(/\s+/);
          rxBytes = parseInt(vals?.[0], 10) || 0;
        }
        if (lines[i].trim().startsWith('TX:')) {
          const vals = lines[i + 1]?.trim().split(/\s+/);
          txBytes = parseInt(vals?.[0], 10) || 0;
        }
      }
      interfaces.push({ name, rxBytes, txBytes });
    }

    const routes = (routesPart || '').split('\n').map(l => l.trim()).filter(Boolean);

    return { connections, interfaces, routes };
  } catch (err) {
    return { connections: [], interfaces: [], routes: [] };
  }
}

// ---------------------------------------------------------------------------
// 10. findDockerComposeFiles
// ---------------------------------------------------------------------------
export async function findDockerComposeFiles(server) {
  try {
    const { stdout } = await sshExec(server, "find /var/www /root /home /opt /srv -name 'docker-compose.yml' -o -name 'docker-compose.yaml' 2>/dev/null | head -20", 20000);
    const files = stdout.split('\n').map(l => l.trim()).filter(Boolean);
    return { files };
  } catch (err) {
    return { files: [] };
  }
}

// ---------------------------------------------------------------------------
// 11. getDockerComposeContent
// ---------------------------------------------------------------------------
export async function getDockerComposeContent(server, filePath) {
  if (!filePath) return { content: '' };
  try {
    const { stdout } = await sshExec(server, `cat "${filePath}" 2>/dev/null`, 15000);
    return { content: stdout };
  } catch (err) {
    return { content: '' };
  }
}

// ---------------------------------------------------------------------------
// 12. dockerComposeAction
// ---------------------------------------------------------------------------
export async function dockerComposeAction(server, filePath, action) {
  const allowed = ['up', 'down', 'pull', 'ps', 'logs'];
  if (!allowed.includes(action)) return { success: false, output: `Invalid action: ${action}` };
  if (!filePath) return { success: false, output: 'File path required' };

  try {
    const upFlag = action === 'up' ? '-d' : '';
    const cmd = `cd "$(dirname "${filePath}")" && (docker compose ${action} ${upFlag} 2>&1 || docker-compose ${action} ${upFlag} 2>&1) | tail -50`;
    const { stdout, stderr, code } = await sshExec(server, cmd, 60000);
    return { success: code === 0, output: (stdout + stderr).trim() };
  } catch (err) {
    return { success: false, output: err.message };
  }
}

// ---------------------------------------------------------------------------
// 13. getDockerStats
// ---------------------------------------------------------------------------
export async function getDockerStats(server) {
  try {
    const { stdout } = await sshExec(server, "docker stats --no-stream --format '{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}' 2>/dev/null", 20000);
    const stats = [];
    for (const raw of stdout.split('\n')) {
      const line = raw.trim();
      if (!line) continue;
      const [name, cpu, memUsage, memPercent, netIO, blockIO] = line.split('\t');
      if (!name) continue;
      stats.push({
        name,
        cpu: cpu || '0%',
        memUsage: memUsage || '0B / 0B',
        memPercent: memPercent || '0%',
        netIO: netIO || '0B / 0B',
        blockIO: blockIO || '0B / 0B'
      });
    }
    return { stats };
  } catch (err) {
    return { stats: [] };
  }
}

// ---------------------------------------------------------------------------
// 14. getNginxSites
// ---------------------------------------------------------------------------
export async function getNginxSites(server) {
  try {
    const { stdout } = await sshExec(server, "ls /etc/nginx/sites-enabled/ 2>/dev/null; echo '---CONF---'; ls /etc/nginx/conf.d/ 2>/dev/null", 15000);
    const [sitesPart, confPart] = stdout.split('---CONF---');
    const sites = (sitesPart || '').split('\n').map(l => l.trim()).filter(Boolean);
    const confFiles = (confPart || '').split('\n').map(l => l.trim()).filter(Boolean);
    const hasNginx = sites.length > 0 || confFiles.length > 0;
    return { hasNginx, sites, confFiles };
  } catch (err) {
    return { hasNginx: false, sites: [], confFiles: [] };
  }
}

// ---------------------------------------------------------------------------
// 15. getNginxSiteContent
// ---------------------------------------------------------------------------
export async function getNginxSiteContent(server, siteName) {
  if (!siteName) return { content: '', path: '' };

  const paths = siteName.startsWith('/')
    ? [siteName]
    : [
        `/etc/nginx/sites-enabled/${siteName}`,
        `/etc/nginx/conf.d/${siteName}`,
        `/etc/nginx/sites-available/${siteName}`
      ];

  for (const p of paths) {
    try {
      const { stdout, code } = await sshExec(server, `cat "${p}" 2>/dev/null`, 15000);
      if (code === 0 && stdout) {
        return { content: stdout, path: p };
      }
    } catch (_) {
      // try next
    }
  }
  return { content: '', path: '' };
}

// ---------------------------------------------------------------------------
// 16. saveNginxSite
// ---------------------------------------------------------------------------
export async function saveNginxSite(server, sitePath, content) {
  if (!sitePath) return { success: false, output: 'sitePath required', valid: false };
  try {
    const b64 = Buffer.from(content || '', 'utf-8').toString('base64');
    const writeCmd = `echo "${b64}" | base64 -d > "${sitePath}" && nginx -t 2>&1`;
    const { stdout, stderr, code } = await sshExec(server, writeCmd, 20000);
    const output = (stdout + (stderr ? `\n${stderr}` : '')).trim();
    const valid = output.includes('syntax is ok') || output.includes('test is successful');
    return { success: code === 0 || valid, output, valid };
  } catch (err) {
    return { success: false, output: err.message, valid: false };
  }
}

// ---------------------------------------------------------------------------
// 17. runSSHCommand
// ---------------------------------------------------------------------------
export async function runSSHCommand(server, command) {
  if (!command) return { output: '', exitCode: 0 };
  try {
    const { stdout, stderr, code } = await sshExec(server, command, 45000);
    const output = stdout + (stderr ? (stdout ? `\nSTDERR:\n${stderr}` : stderr) : '');
    return { output, exitCode: code };
  } catch (err) {
    return { output: err.message, exitCode: 1 };
  }
}

// ---------------------------------------------------------------------------
// 18. findEnvFiles
// ---------------------------------------------------------------------------
export async function findEnvFiles(server) {
  try {
    const cmd = `find /var/www /root /home /opt /srv /etc -maxdepth 5 -name ".env*" -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | head -50`;
    const { stdout } = await sshExec(server, cmd, 15000);
    const files = stdout.split('\n').map(s => s.trim()).filter(Boolean);
    return { files };
  } catch (err) {
    return { files: [] };
  }
}

// ---------------------------------------------------------------------------
// 19. getEnvContent
// ---------------------------------------------------------------------------
export async function getEnvContent(server, filePath) {
  if (!filePath) return { content: '', path: filePath, pairs: [] };
  try {
    const { stdout, code } = await sshExec(server, `cat "${filePath}" 2>/dev/null`, 15000);
    if (code !== 0) {
      return { content: '', path: filePath, pairs: [] };
    }
    const lines = stdout.split('\n');
    const pairs = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      const eqIdx = line.indexOf('=');
      if (eqIdx !== -1) {
        const key = line.slice(0, eqIdx).trim();
        let val = line.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        const isSecret = /password|secret|key|token|auth|pwd|cred/i.test(key);
        pairs.push({ key, value: val, isSecret });
      }
    }
    return { content: stdout, path: filePath, pairs };
  } catch (err) {
    return { content: '', path: filePath, pairs: [] };
  }
}

// ---------------------------------------------------------------------------
// 20. saveEnvFile
// ---------------------------------------------------------------------------
export async function saveEnvFile(server, filePath, content) {
  if (!filePath) return { success: false, error: 'Ruta de archivo requerida' };
  try {
    const b64 = Buffer.from(content || '', 'utf-8').toString('base64');
    const writeCmd = `mkdir -p "$(dirname "${filePath}")" && echo "${b64}" | base64 -d > "${filePath}" && chmod 600 "${filePath}"`;
    const { stderr, code } = await sshExec(server, writeCmd, 20000);
    return { success: code === 0, error: code !== 0 ? stderr : null };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// 21. rebootServer
// ---------------------------------------------------------------------------
export async function rebootServer(server) {
  try {
    const cmd = '(sudo nohup sh -c "sleep 1 && (systemctl reboot || shutdown -r now || reboot)" >/dev/null 2>&1 &) || (nohup sh -c "sleep 1 && reboot" >/dev/null 2>&1 &)';
    await sshExec(server, cmd, 10000);
    return { success: true, message: 'Orden de reinicio enviada correctamente. El servidor se reiniciará en unos segundos.' };
  } catch (err) {
    // If the SSH connection dropped because of the reboot itself
    if (/closed|ended|reset|terminated/i.test(err.message)) {
      return { success: true, message: 'Orden de reinicio recibida (sesión SSH cerrada por el host).' };
    }
    return { success: false, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// 22. poweroffServer
// ---------------------------------------------------------------------------
export async function poweroffServer(server) {
  try {
    const cmd = '(sudo nohup sh -c "sleep 1 && (systemctl poweroff || shutdown -h now || poweroff)" >/dev/null 2>&1 &) || (nohup sh -c "sleep 1 && poweroff" >/dev/null 2>&1 &)';
    await sshExec(server, cmd, 10000);
    return { success: true, message: 'Orden de apagado enviada correctamente.' };
  } catch (err) {
    if (/closed|ended|reset|terminated/i.test(err.message)) {
      return { success: true, message: 'Orden de apagado recibida.' };
    }
    return { success: false, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// 23. dropCaches (Liberar memoria RAM / buffers)
// ---------------------------------------------------------------------------
export async function dropCaches(server) {
  try {
    const cmd = '(sudo sync && echo 3 | sudo tee /proc/sys/vm/drop_caches) 2>/dev/null || (sync && echo 3 > /proc/sys/vm/drop_caches) 2>/dev/null; free -m';
    const { stdout } = await sshExec(server, cmd, 15000);
    return { success: true, message: 'Memoria caché liberada con éxito', output: stdout };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// 24. cleanDisk (Limpieza de logs y paquetes)
// ---------------------------------------------------------------------------
export async function cleanDisk(server) {
  try {
    const cmd = '(sudo journalctl --vacuum-time=3d 2>&1 || true) && (sudo apt-get clean 2>&1 || sudo yum clean all 2>&1 || true) && df -h /';
    const { stdout } = await sshExec(server, cmd, 25000);
    return { success: true, message: 'Limpieza de disco completada', output: stdout };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// 25. executeAutoDeploy (CI/CD Webhook deploy)
// ---------------------------------------------------------------------------
export async function executeAutoDeploy(server, options = {}) {
  const {
    repoPath,
    branch = 'main',
    script = '',
    commitInfo = null,
    triggeredBy = 'manual'
  } = options;

  if (!repoPath) {
    throw new Error('La ruta del repositorio en el servidor es obligatoria.');
  }

  const safeRepoPath = repoPath.trim();
  const safeBranch = (branch || 'main').trim();
  const customScript = script ? script.trim() : '';

  const deployCmd = `
set -e
if [ ! -d "${safeRepoPath}" ]; then
  echo "ERROR: La carpeta ${safeRepoPath} no existe en el servidor." >&2
  exit 1
fi

cd "${safeRepoPath}"
echo "==> [Paso 1/3] Actualizando repositorio Git en: $(pwd)"
echo "Rama objetivo: ${safeBranch}"

git fetch origin "${safeBranch}" 2>&1
git checkout "${safeBranch}" 2>&1
git pull origin "${safeBranch}" 2>&1

echo ""
echo "Commit activo:"
git log -1 --pretty=format:"• Hash: %h%n• Mensaje: %s%n• Autor: %an (%ar)" 2>&1
echo ""

echo "==> [Paso 2/3] Ejecutando comandos de despliegue y construcción..."
${
  customScript
    ? customScript
    : `if [ -f "docker-compose.yml" ] || [ -f "compose.yaml" ]; then
  echo "Detectado docker-compose: recreando contenedores..."
  (docker compose up -d --build 2>&1 || docker-compose up -d --build 2>&1)
elif [ -f "package.json" ]; then
  echo "Detectado package.json: instalando y construyendo..."
  npm install --omit=dev 2>&1 && (npm run build 2>&1 || true)
else
  echo "Repositorio actualizado correctamente."
fi`
}

echo ""
echo "==> [Paso 3/3] ¡Despliegue finalizado exitosamente! [$(date)]"
`;

  const startTime = Date.now();
  let status = 'success';
  let output = '';
  let error = null;

  try {
    const { stdout, stderr, code } = await sshExec(server, deployCmd, 180000); // 3 min timeout
    output = stdout + (stderr ? `\n[STDERR]:\n${stderr}` : '');
    if (code !== 0) {
      status = 'failed';
      error = stderr || `Proceso de despliegue terminó con código de error ${code}`;
    }
  } catch (err) {
    status = 'failed';
    error = err.message;
    output = `Error durante la ejecución SSH:\n${err.message}`;
  }

  const durationMs = Date.now() - startTime;

  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    timestamp: new Date().toISOString(),
    status,
    durationMs,
    branch: safeBranch,
    repoPath: safeRepoPath,
    triggeredBy,
    commit: commitInfo,
    output,
    error
  };
}
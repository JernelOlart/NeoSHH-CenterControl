import { WebSocketServer } from 'ws';
import { Client } from 'ssh2';
import { getServerById } from './db.js';
import { getSSHConfig } from './sshService.js';

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws/terminal' });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const serverId = url.searchParams.get('serverId');

    if (!serverId) {
      ws.send('\r\n\x1b[31m[Error: ID de servidor no especificado]\x1b[0m\r\n');
      ws.close();
      return;
    }

    const vps = getServerById(serverId, true);
    if (!vps) {
      ws.send('\r\n\x1b[31m[Error: Servidor no encontrado en la base de datos]\x1b[0m\r\n');
      ws.close();
      return;
    }

    ws.send(`\r\n\x1b[36m[SSH] Conectando a ${vps.name} (${vps.username}@${vps.host}:${vps.port})...\x1b[0m\r\n`);

    let sshConfig;
    try {
      sshConfig = getSSHConfig(vps, 15000);
    } catch (err) {
      ws.send(`\r\n\x1b[31m[Error de configuración]: ${err.message}\x1b[0m\r\n`);
      ws.close();
      return;
    }

    const conn = new Client();
    let sshStream = null;

    conn.on('ready', () => {
      ws.send(`\x1b[32m[OK] Sesión SSH establecida. Abriendo terminal interactivo...\x1b[0m\r\n\r\n`);

      conn.shell(
        {
          term: 'xterm-256color',
          cols: 100,
          rows: 30
        },
        (err, stream) => {
          if (err) {
            ws.send(`\r\n\x1b[31m[Error al abrir shell]: ${err.message}\x1b[0m\r\n`);
            conn.end();
            ws.close();
            return;
          }

          sshStream = stream;

          stream.on('close', () => {
            ws.send('\r\n\x1b[33m[Conexión SSH cerrada por el host]\x1b[0m\r\n');
            conn.end();
            ws.close();
          });

          stream.on('data', data => {
            if (ws.readyState === ws.OPEN) {
              ws.send(data);
            }
          });

          stream.stderr.on('data', data => {
            if (ws.readyState === ws.OPEN) {
              ws.send(data);
            }
          });
        }
      );
    });

    conn.on('error', err => {
      if (ws.readyState === ws.OPEN) {
        ws.send(`\r\n\x1b[31m[Error de conexión SSH]: ${err.message}\x1b[0m\r\n`);
        ws.close();
      }
    });

    conn.on('close', () => {
      if (ws.readyState === ws.OPEN) {
        ws.close();
      }
    });

    // Handle messages from browser
    ws.on('message', message => {
      try {
        // Can be a JSON control command (resize) or raw input
        const str = message.toString();
        if (str.startsWith('{') && str.endsWith('}')) {
          const parsed = JSON.parse(str);
          if (parsed.type === 'resize' && sshStream) {
            sshStream.setWindow(parsed.rows || 30, parsed.cols || 100, 0, 0);
            return;
          }
        }
      } catch (e) {
        // Not a JSON command, treat as input
      }

      if (sshStream) {
        sshStream.write(message);
      }
    });

    ws.on('close', () => {
      if (sshStream) {
        sshStream.end();
      }
      conn.end();
    });

    try {
      conn.connect(sshConfig);
    } catch (err) {
      ws.send(`\r\n\x1b[31m[Error al iniciar SSH]: ${err.message}\x1b[0m\r\n`);
      ws.close();
    }
  });

  return wss;
}


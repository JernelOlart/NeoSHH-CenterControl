# NeoShh Control — VPS Command Center

A self-hosted web panel to manage multiple VPS servers from a single interface. Connect via SSH terminal, browse files over SFTP, manage Docker containers, control Git repositories, and monitor firewall rules — all from your browser, with no agents installed on your servers.

> Built with React, Node.js, Express, xterm.js and ssh2. Runs entirely in Docker on your local machine.

---

## Features

### Terminal SSH
- Full interactive web terminal powered by **xterm.js** and WebSockets.
- Multi-tab support — open several VPS sessions simultaneously.
- Full ANSI 256-color support, keyboard shortcuts, and auto-resize (`htop`, `vim`, `nano`, etc.).
- One-click **native macOS Terminal** launcher via `ssh://` protocol.

### Hardware Telemetry
- **Disk / Storage**: Visual usage bar and full partition table (`df -h`).
- **RAM**: Used, available, total and percentage (`free -m`).
- **CPU**: Model, core count and 1m/5m/15m load average.
- **OS & Uptime**: Distribution, kernel version and uptime.

### SFTP File Manager
- Browse, navigate and edit files directly on the remote server via SFTP.
- Create new files, save changes and delete — no FTP client needed.

### Docker Manager
- List all containers with real-time status.
- **Start**, **Stop**, **Restart** and **Remove** containers in one click.
- **Live logs viewer** — tail the last 100 lines of any container.
- **Launch new containers** — configure image, name, port mappings, environment variables and restart policy from the UI.

### Git Manager
- Auto-detect Git repositories on the VPS (`/var/www`, `/root`, `/home`, etc.).
- View active branch and recent commit history.
- **`git pull`** in one click with live output.
- **Clone** new repositories to any directory on the server.

### Firewall & Port Control (UFW)
- Inspect active UFW rules and firewall status.
- Open or close ports (TCP/UDP) with quick presets: `80`, `443`, `3000`, `8080`.
- Delete existing rules directly from the UI.

### Security
- All data is stored **locally** in a `./data/` directory (never uploaded anywhere).
- Supports authentication by **password** or **private SSH key** (`.pem`, `id_rsa`, `id_ed25519`) with `0600` permissions.
- Credentials are stripped before returning server data to the frontend.

---

## Quick Start (Docker — Recommended)

Requirements: **Docker** and **Docker Compose**.

```bash
# 1. Clone the repository
git clone https://github.com/JernelOlart/neoshh-control.git
cd neoshh-control

# 2. Build and start the container
docker compose up -d --build

# 3. Open in your browser
# → http://localhost:3000
```

To stop:
```bash
docker compose down
```

To view live logs:
```bash
docker compose logs -f
```

---

## Running Locally (Without Docker)

Requires **Node.js 18+**.

**Backend:**
```bash
cd backend
npm install
npm start
```

**Frontend** (separate terminal):
```bash
cd frontend
npm install
npm run dev
```

Access the UI at `http://localhost:5173`.

---

## Project Structure

```
neoshh-control/
├── Dockerfile                  # Multi-stage build (React + Node.js/Alpine)
├── docker-compose.yml          # Docker Compose with persistent data volume
├── data/                       # Local runtime data — gitignored, auto-created
│   ├── servers.json            # Server inventory (credentials stored here)
│   └── keys/                   # SSH private keys (chmod 0600)
├── backend/
│   └── src/
│       ├── index.js            # Express REST API + HTTP server
│       ├── db.js               # JSON-based local storage
│       ├── sshService.js       # SSH client, telemetry extraction, SFTP
│       └── websocket.js        # Interactive PTY WebSocket stream
└── frontend/
    └── src/
        ├── App.jsx
        ├── components/
        │   ├── Navbar.jsx
        │   ├── StatsSummary.jsx
        │   ├── ServerCard.jsx
        │   ├── ServerModal.jsx
        │   ├── TerminalModal.jsx
        │   ├── MetricsDetailModal.jsx
        │   ├── FileManagerModal.jsx
        │   ├── DockerManagerModal.jsx
        │   ├── GitManagerModal.jsx
        │   └── FirewallModal.jsx
        └── services/
            └── api.js
```

---

## Adding a Server

1. Click **+ Add VPS**.
2. Enter a name, the IP/hostname, the SSH user (usually `root`) and port (default: `22`).
3. Choose authentication:
   - **Password**, or
   - **Private Key** — paste the key content or upload your `.pem` / `id_rsa` file.
4. Add optional tags (e.g. `production`, `docker`, `staging`).
5. Click **Save**. The app will immediately test the connection and fetch metrics.

---

## Important: Data & Security

> **The `data/` directory is gitignored and must never be committed.**
> It contains your server inventory and SSH credentials in plain text.

Before making any fork or copy of this project public, verify:
- `data/` does **not** appear in `git ls-files`
- No `.pem`, `.key` or private key files are staged
- No passwords or IP addresses are hardcoded in source files

A `.gitignore` is already configured to exclude all of the above.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Lucide Icons |
| Terminal | xterm.js v5 (FitAddon, WebLinksAddon) |
| Backend | Node.js, Express |
| SSH | ssh2 (native SSH2 protocol client) |
| Container | Docker, Docker Compose, Node 20 Alpine |

---

## Credits

Made by [Jernel Olart](https://github.com/JernelOlart)

- [jernelsystems.com](https://www.jernelsystems.com)
- [neotechsolutions.mx](https://neotechsolutions.mx)

---

## License

MIT License — free to use, fork and modify.

# ⚡ NeoShh Control - Gestor Centralizado de Servidores VPS

Panel de control moderno y centralizado para gestionar múltiples servidores VPS rentados (Hetzner, DigitalOcean, AWS, OVH, Linode, Contabo, etc.) con **conexión en un solo clic** y **telemetría en tiempo real** (disco, RAM, CPU, OS y uptime).

![NeoScale SSH Dashboard](https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/terminal.svg)

---

## 🌟 Características Principales

1. **⚡ Conexión Web en 1 Solo Clic (xterm.js + WebSockets)**:
   - Terminal interactivo completo integrado directamente en el navegador.
   - Pestañas simultáneas para tener varios VPS abiertos al mismo tiempo.
   - Soporte para atajos de teclado, colores ANSI de 256 colores, redimensionamiento automático (`htop`, `vim`, `nano`, etc.).

2. **💻 Lanzador en Terminal Nativo de macOS**:
   - Botón directo para abrir la sesión en la app **Terminal** o **iTerm2** de tu Mac vía protocolo `ssh://`.
   - Opción para copiar el comando SSH exacto (`ssh -p 22 user@host`) con un clic.

3. **📊 Telemetría y Monitoreo de Recursos**:
   - **Almacenamiento / Disco**: Visualización gráfica del uso del disco raíz y tabla detallada de todas las particiones montadas (`df -h`).
   - **Memoria RAM**: Uso actual, disponible, total y porcentaje (`free -m`).
   - **Procesador (CPU)**: Modelo exacto de CPU, número de núcleos y carga promedio en 1m, 5m y 15m (`load average`).
   - **Sistema Operativo & Uptime**: Distribución (Ubuntu, Debian, CentOS, Alpine, etc.), Kernel y tiempo encendido.

4. **🔒 Seguridad y Persistencia Local**:
   - Todo se almacena de forma local en tu máquina dentro de la carpeta `./data/`.
   - Soporte para autenticación por **Contraseña** o por **Clave Privada SSH** (`.pem`, `id_rsa`, `id_ed25519`) con permisos protegidos (`0600`).
   - Tus credenciales nunca salen de tu entorno.

---

## 🚀 Inicio Rápido con Docker (Recomendado)

Solo necesitas tener Docker y Docker Compose instalados:

```bash
# 1. Clonar o entrar en el directorio del proyecto
cd "NeoScale SHH"

# 2. Construir y levantar el contenedor
docker compose up -d --build

# 3. Abrir en tu navegador
# 👉 http://localhost:3000
```

Para detener el servicio:
```bash
docker compose down
```

Para ver los registros en vivo:
```bash
docker compose logs -f
```

---

## 🛠️ Ejecución Local (Sin Docker)

Si prefieres ejecutarlo directamente con Node.js en tu Mac:

### 1. Backend:
```bash
cd backend
npm install
npm start
```

### 2. Frontend (en otra terminal):
```bash
cd frontend
npm install
npm run dev
```
Accede a `http://localhost:5173`.

---

## 📁 Estructura del Proyecto

```
NeoScale SHH/
├── Dockerfile              # Multi-stage build (React + Node.js)
├── docker-compose.yml      # Configuración de Docker Compose con volumen persistente
├── data/                   # Volumen local para servidores y claves SSH (auto-creado)
│   ├── servers.json        # Base de datos local
│   └── keys/               # Claves privadas SSH seguras
├── backend/                # Servidor Express + WebSocket + SSH2
│   ├── package.json
│   └── src/
│       ├── index.js        # API REST y servidor HTTP
│       ├── db.js           # Gestor de almacenamiento local
│       ├── sshService.js   # Cliente SSH y extractor de telemetría
│       └── websocket.js    # Streaming de terminal interactivo
└── frontend/               # Interfaz React con Tailwind CSS y xterm.js
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── components/
        │   ├── Navbar.jsx
        │   ├── StatsSummary.jsx
        │   ├── ServerCard.jsx
        │   ├── ServerModal.jsx
        │   ├── TerminalModal.jsx
        │   └── MetricsDetailModal.jsx
        └── services/
            └── api.js
```

---

## 💡 Cómo Agregar un VPS

1. Haz clic en **+ Agregar VPS**.
2. Ingresa el **Nombre**, la **IP o Host** y el **Usuario** (por defecto `root`).
3. Selecciona tu método de acceso:
   - **Contraseña**, o
   - **Clave SSH Privada**: Puedes pegar el texto de la clave o subir tu archivo `.pem`/`id_rsa`.
4. Añade etiquetas opcionales (ej: `produccion`, `docker`, `bd`).
5. Haz clic en **Guardar**.
6. ¡Listo! El sistema probará la conexión automáticamente y extraerá el estado de almacenamiento, RAM y CPU.


#!/usr/bin/env bash
set -e

echo "==============================================="
echo " [NeoShh Control] - Gestor Centralizado de VPS"
echo "==============================================="

# Verificar que Docker esté instalado
if ! command -v docker &> /dev/null; then
    echo "[ERROR] Docker no está instalado en este sistema."
    echo "Por favor instala Docker Desktop para Mac: https://www.docker.com/products/docker-desktop/"
    exit 1
fi

echo "[START] Construyendo y levantando el contenedor con Docker Compose..."
docker compose up -d --build

echo ""
echo "[OK] NeoShh Control está listo y ejecutándose en segundo plano."
echo "--> Abre en tu navegador: http://localhost:3000"
echo ""
echo "Comandos útiles:"
echo " - Ver logs en vivo: docker compose logs -f"
echo " - Detener panel:    docker compose down"
echo "==============================================="

#!/bin/bash

# Script de diagnóstico de autenticación para /facility
# Uso: ./diagnose-auth.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Diagnóstico de Autenticación - /facility                  ║${NC}"
echo -e "${BLUE}║     Fecha: $(date +'%Y-%m-%d %H:%M:%S')                          ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"

# Función para imprimir resultado
print_result() {
    local test=$1
    local result=$2
    local details=$3
    
    if [ "$result" == "✓" ]; then
        echo -e "${GREEN}  ✓${NC} $test"
    else
        echo -e "${RED}  ✗${NC} $test"
    fi
    
    if [ -n "$details" ]; then
        echo -e "    ${YELLOW}→${NC} $details"
    fi
}

echo -e "\n${BLUE}1. VERIFICACIÓN DE SERVIDOR NODE.JS${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verificar si el servidor está corriendo
if netstat -tlnp 2>/dev/null | grep -q ":5000 "; then
    print_result "Servidor Node.js en puerto 5000" "✓" "Servidor activo"
else
    print_result "Servidor Node.js en puerto 5000" "✗" "Servidor no encontrado"
fi

# Verificar proceso Node.js
if pgrep -f "node|tsx" > /dev/null; then
    PROCESS=$(pgrep -f "node|tsx" | head -1)
    print_result "Proceso Node.js activo" "✓" "PID: $PROCESS"
else
    print_result "Proceso Node.js activo" "✗" "No hay proceso Node.js corriendo"
fi

# Verificar archivo de logs
if [ -f "/tmp/wounddatacenter-login.log" ]; then
    LOGSIZE=$(du -h /tmp/wounddatacenter-login.log | cut -f1)
    LASTLOG=$(tail -1 /tmp/wounddatacenter-login.log 2>/dev/null | head -c 80)
    print_result "Archivo de logs de login" "✓" "Tamaño: $LOGSIZE, Último log: $LASTLOG"
else
    print_result "Archivo de logs de login" "✗" "No existe"
fi

echo -e "\n${BLUE}2. VERIFICACIÓN DE CONECTIVIDAD${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verificar localhost:5000
if curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/get \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{}' 2>/dev/null | grep -q "400\|200"; then
    print_result "Endpoint /api/get accesible" "✓" "Servidor responde"
else
    print_result "Endpoint /api/get accesible" "✗" "No hay respuesta"
fi

# Verificar conectividad al backend
if timeout 5 curl -s -I https://cubed-mr.app/api/get 2>/dev/null | grep -q "HTTP"; then
    print_result "Backend https://cubed-mr.app accesible" "✓" "Conectividad OK"
else
    print_result "Backend https://cubed-mr.app accesible" "✗" "No hay conectividad"
fi

echo -e "\n${BLUE}3. PRUEBA DE LOGIN CON CREDENCIALES${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

read -p "Ingrese email de facilidad: " EMAIL
read -s -p "Ingrese contraseña: " PASSWORD
echo ""

DEVICE_ID="diagnostic-$(date +%s)"

echo -e "${YELLOW}→${NC} Enviando solicitud de login..."
echo "  Email: $EMAIL"
echo "  DeviceID: $DEVICE_ID"

RESPONSE=$(curl -s http://localhost:5000/api/get \
    -X POST \
    -H "Content-Type: application/json" \
    -d "{
        \"entity\": \"TryLoginFacilities\",
        \"email\": \"$EMAIL\",
        \"password\": \"$PASSWORD\",
        \"deviceId\": \"$DEVICE_ID\"
    }")

echo -e "\n${BLUE}Respuesta del Servidor:${NC}"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"

# Analizar respuesta
STATUS=$(echo "$RESPONSE" | jq -r '.status' 2>/dev/null)
DATA_STATUS=$(echo "$RESPONSE" | jq -r '.data[0].status' 2>/dev/null)
REASON=$(echo "$RESPONSE" | jq -r '.data[0].reason' 2>/dev/null)
MSG=$(echo "$RESPONSE" | jq -r '.data[0].msg' 2>/dev/null)
TOKEN=$(echo "$RESPONSE" | jq -r '.data[0].token' 2>/dev/null)
FACILITY_ID=$(echo "$RESPONSE" | jq -r '.data[0].facilityId // .data[0].entityId' 2>/dev/null)

echo -e "\n${BLUE}4. ANÁLISIS DE RESPUESTA${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Status: $STATUS"
echo "Data Status: $DATA_STATUS"
echo "Reason: $REASON"
echo "Message: $MSG"
echo "Token: ${TOKEN:0:20}..."
echo "Facility ID: $FACILITY_ID"

# Interpretar resultado
if [ "$DATA_STATUS" = "1" ]; then
    print_result "Login exitoso" "✓" "El usuario está autenticado"
elif [ "$REASON" = "1" ]; then
    print_result "Facilidad ya autenticada" "✗" "La facilidad está logueada en otro dispositivo"
    echo -e "    ${YELLOW}Solución:${NC} Hacer logout desde el otro dispositivo o contactar administrador"
elif [ "$REASON" = "3" ]; then
    print_result "Credenciales inválidas" "✗" "Email o contraseña incorrectos"
    echo -e "    ${YELLOW}Solución:${NC} Verificar email y contraseña, contactar administrador si es necesario"
else
    print_result "Respuesta desconocida" "✗" "Reason: $REASON"
fi

echo -e "\n${BLUE}5. ÚLTIMOS LOGS DE LOGIN${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "/tmp/wounddatacenter-login.log" ]; then
    echo "Últimas 5 líneas del log:"
    tail -5 /tmp/wounddatacenter-login.log | sed 's/^/  /'
else
    echo "No hay logs disponibles"
fi

echo -e "\n${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           Diagnóstico Completado                              ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}\n"

#!/bin/bash

# ====================================================
# SCRIPT DE DIAGNÓSTICO DE AUTENTICACIÓN - /facility
# ====================================================
# Prueba todos los aspectos del sistema de autenticación
# Uso: bash diagnose-auth.sh [--verbose] [--test-credentials]

set -o pipefail

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Contadores
PASSED=0
FAILED=0
WARNINGS=0

# Funciones de log
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_pass() { echo -e "${GREEN}[✓]${NC} $1"; ((PASSED++)); }
log_fail() { echo -e "${RED}[✗]${NC} $1"; ((FAILED++)); }
log_warn() { echo -e "${YELLOW}[!]${NC} $1"; ((WARNINGS++)); }

# Header
echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║   Diagnóstico de Autenticación - /facility               ║"
echo "║   $(date '+%Y-%m-%d %H:%M:%S')                                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

# ====================================================
# 1. VERIFICAR PROCESOS
# ====================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "1. VERIFICANDO PROCESOS Y SERVICIOS"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Node.js
if pgrep -f "node /var/www/facility/dist" > /dev/null; then
    NODE_PID=$(pgrep -f "node /var/www/facility/dist")
    log_pass "Node.js server running (PID: $NODE_PID)"
    
    # Mostrar memoria
    MEM=$(ps aux | grep $NODE_PID | grep -v grep | awk '{print $6}')
    log_info "  └─ Memory: ${MEM}K"
else
    log_fail "Node.js server not running"
fi

# Apache
if systemctl is-active --quiet apache2; then
    log_pass "Apache2 service running"
else
    log_fail "Apache2 service not running"
fi

# wounddatacenter service
if systemctl is-active --quiet wounddatacenter; then
    log_pass "wounddatacenter service running"
else
    log_fail "wounddatacenter service not running"
fi

# ====================================================
# 2. VERIFICAR CONECTIVIDAD
# ====================================================
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "2. VERIFICANDO CONECTIVIDAD"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Puerto 5000
if timeout 2 bash -c 'echo > /dev/tcp/localhost/5000' 2>/dev/null; then
    log_pass "Node.js API port 5000 is listening"
else
    log_fail "Node.js API port 5000 is NOT listening"
fi

# Puerto 443
if timeout 2 bash -c 'echo > /dev/tcp/localhost/443' 2>/dev/null; then
    log_pass "Apache SSL port 443 is listening"
else
    log_fail "Apache SSL port 443 is NOT listening"
fi

# Backend remoto
if timeout 5 curl -s "https://cubed-mr.app/api/get" -X OPTIONS > /dev/null 2>&1; then
    log_pass "Backend remoto (cubed-mr.app) es accesible"
else
    log_warn "Backend remoto (cubed-mr.app) no responde a OPTIONS"
fi

# ====================================================
# 3. VERIFICAR CONFIGURACIÓN DE APACHE
# ====================================================
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "3. VERIFICANDO CONFIGURACIÓN DE APACHE"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Verificar ProxyPass
if grep -q "ProxyPass /facility" /etc/apache2/sites-available/cubedmr-ssl.conf; then
    log_pass "ProxyPass configuration found"
else
    log_fail "ProxyPass configuration NOT found"
fi

# Verificar SSL
if grep -q "SSLEngine on" /etc/apache2/sites-available/cubedmr-ssl.conf; then
    log_pass "SSL/TLS enabled"
else
    log_fail "SSL/TLS NOT enabled"
fi

# Verificar módulos proxy
if apache2ctl -M | grep -q "proxy_module"; then
    log_pass "Apache proxy modules loaded"
else
    log_fail "Apache proxy modules NOT loaded"
fi

# ====================================================
# 4. VERIFICAR ARCHIVOS CLAVE
# ====================================================
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "4. VERIFICANDO ARCHIVOS CLAVE"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

FILES=(
    "/var/www/facility/dist/index.cjs"
    "/var/www/facility/client/src/pages/login.tsx"
    "/var/www/facility/client/src/hooks/use-auth.ts"
    "/var/www/facility/server/routes.ts"
    "/etc/apache2/sites-available/cubedmr-ssl.conf"
    "/etc/systemd/system/wounddatacenter.service"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        log_pass "Found: $file"
    else
        log_fail "Missing: $file"
    fi
done

# ====================================================
# 5. PRUEBAS DE ENDPOINTS
# ====================================================
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "5. PRUEBAS DE ENDPOINTS"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Test /api/get con credenciales inválidas
log_info "Testing POST /api/get with invalid credentials..."
RESPONSE=$(curl -s -X POST http://localhost:5000/api/get \
    -H "Content-Type: application/json" \
    -d '{"action":"TryLoginFacilities","email":"test@test.com","password":"wrong","deviceId":"test"}')

if echo "$RESPONSE" | grep -q '"status":true'; then
    log_pass "Endpoint /api/get responds correctly"
    
    # Verificar que rechaza credenciales inválidas
    if echo "$RESPONSE" | grep -q '"status":0'; then
        log_pass "Correctly rejects invalid credentials"
    else
        log_warn "Unexpected response format from backend"
    fi
else
    log_fail "Endpoint /api/get did NOT respond"
fi

# Test /api/logout
log_info "Testing POST /api/logout..."
RESPONSE=$(curl -s -X POST http://localhost:5000/api/logout \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","facility_id":"1"}')

if echo "$RESPONSE" | grep -q '"answer"'; then
    log_pass "Endpoint /api/logout is functional"
else
    log_warn "Endpoint /api/logout may have issues"
fi

# ====================================================
# 6. VERIFICAR LOGS
# ====================================================
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "6. VERIFICANDO LOGS"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

if [ -f "/tmp/wounddatacenter-login.log" ]; then
    log_pass "Login log file exists"
    LINES=$(wc -l < /tmp/wounddatacenter-login.log)
    log_info "  └─ Total log lines: $LINES"
    
    # Últimas entradas
    log_info "  └─ Last 3 entries:"
    tail -3 /tmp/wounddatacenter-login.log | sed 's/^/      /'
else
    log_warn "Login log file does not exist yet (will be created on first login)"
fi

# ====================================================
# 7. VERIFICAR SEGURIDAD
# ====================================================
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "7. VERIFICANDO SEGURIDAD"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Certificados SSL
if [ -f "/etc/apache2/ssl-certs/cubed-mr.app.crt" ] && [ -f "/etc/apache2/ssl-certs/cubed-mr.app.key" ]; then
    log_pass "SSL certificates found"
    
    # Verificar expiración
    EXPIRE=$(openssl x509 -in /etc/apache2/ssl-certs/cubed-mr.app.crt -noout -enddate | cut -d= -f2)
    log_info "  └─ Certificate expires: $EXPIRE"
else
    log_fail "SSL certificates NOT found"
fi

# Verificar permisos
if [ -f "/var/www/facility/dist/index.cjs" ]; then
    PERMS=$(ls -l /var/www/facility/dist/index.cjs | awk '{print $1}')
    log_info "File permissions: $PERMS"
fi

# ====================================================
# 8. RESUMEN
# ====================================================
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "RESUMEN DE DIAGNÓSTICO"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo "Pruebas exitosas: ${GREEN}$PASSED${NC}"
echo "Pruebas fallidas: ${RED}$FAILED${NC}"
echo "Advertencias:     ${YELLOW}$WARNINGS${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✓ Sistema de autenticación OPERACIONAL${NC}\n"
    EXIT_CODE=0
else
    echo -e "\n${RED}✗ Se detectaron problemas (ver arriba)${NC}\n"
    EXIT_CODE=1
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# ====================================================
# 9. RECOMENDACIONES
# ====================================================
if [ $WARNINGS -gt 0 ] || [ $FAILED -gt 0 ]; then
    echo -e "${YELLOW}ACCIONES RECOMENDADAS:${NC}\n"
    
    if [ $FAILED -gt 0 ]; then
        echo "1. Revisar logs de error:"
        echo "   sudo tail -50 /var/log/apache2/error.log"
        echo "   systemctl status wounddatacenter -l"
        echo ""
    fi
    
    if grep -q "password" /tmp/wounddatacenter-login.log 2>/dev/null; then
        echo "2. SEGURIDAD: Se detectan contraseñas en logs"
        echo "   Recomendación: Enmascarar con *** en server/routes.ts"
        echo ""
    fi
    
    echo "3. Para más detalles, consultar:"
    echo "   cat /var/www/facility/AUTHENTICATION_DIAGNOSTIC.md"
    echo ""
fi

exit $EXIT_CODE

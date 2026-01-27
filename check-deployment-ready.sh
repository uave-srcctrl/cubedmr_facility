#!/bin/bash
# Deployment Checklist - Interactive Guide

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🚀 Deployment Configuration Checklist                ║${NC}"
echo -e "${BLUE}║  Apache + GitHub Actions + PM2                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Variables
DOMAIN="facility.com"
DEPLOY_USER="deploy"
DEPLOY_HOST="your-server.com"
REPO_URL="https://github.com/Utility-Avenue/wounddatacenter"

# Score
SCORE=0
TOTAL=0

check() {
    local name="$1"
    local command="$2"
    local hint="$3"
    
    TOTAL=$((TOTAL + 1))
    
    echo -e "${YELLOW}[$TOTAL]${NC} $name"
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "    ${GREEN}✅ OK${NC}"
        SCORE=$((SCORE + 1))
    else
        echo -e "    ${RED}❌ FALTA${NC}"
        if [ -n "$hint" ]; then
            echo -e "    💡 $hint"
        fi
    fi
    echo ""
}

# ============================================
# Local Checks
# ============================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "📍 Verificaciones Locales"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

check "Node.js instalado" \
    "command -v node" \
    "Instala desde https://nodejs.org"

check "NPM actualizado" \
    "npm --version" \
    "Ejecuta: npm install -g npm@latest"

check "Git configurado" \
    "git config user.name && git config user.email" \
    "Ejecuta: git config --global user.name 'Tu Nombre'"

check "Repositorio git válido" \
    "git remote -v | grep -q origin" \
    "Estás en un repositorio git?"

check "Rama main existe" \
    "git branch | grep -q main" \
    "Ejecuta: git branch -M main"

check "Sin cambios pendientes" \
    "git diff-index --quiet HEAD --" \
    "Commit tus cambios: git add . && git commit -m 'msg'"

check "package.json existe" \
    "test -f package.json" \
    "¿Estás en la raíz del proyecto?"

check "deploy.sh existe" \
    "test -f deploy.sh && test -x deploy.sh" \
    "Ejecuta: chmod +x deploy.sh"

check "setup-server.sh existe" \
    "test -f setup-server.sh && test -x setup-server.sh" \
    "Ejecuta: chmod +x setup-server.sh"

check "Apache config existe" \
    "test -f apache-facility.conf" \
    "Archivo necesario para Apache"

check "GitHub workflow existe" \
    "test -f .github/workflows/deploy.yml" \
    "Pipeline de CI/CD debe existir"

# ============================================
# Build Checks
# ============================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "🔨 Verificaciones de Build"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

check "TypeScript válido" \
    "npm run check" \
    "Ejecuta: npm run check (verifica errores)"

check "Build funciona" \
    "npm run build" \
    "Ejecuta: npm run build (revisa la salida)"

check "Dist generado" \
    "test -d dist && test -f dist/index.cjs" \
    "npm run build no generó dist/index.cjs"

# ============================================
# Server Checks
# ============================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "🖥️  Verificaciones de Servidor Remoto"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

check "SSH conecta" \
    "ssh -o ConnectTimeout=3 $DEPLOY_USER@$DEPLOY_HOST 'echo OK' 2>/dev/null" \
    "Edita script y cambia DEPLOY_HOST a tu dominio"

check "Node.js en servidor" \
    "ssh -o ConnectTimeout=3 $DEPLOY_USER@$DEPLOY_HOST 'node --version' 2>/dev/null" \
    "Ejecuta setup-server.sh en el servidor"

check "PM2 en servidor" \
    "ssh -o ConnectTimeout=3 $DEPLOY_USER@$DEPLOY_HOST 'pm2 --version' 2>/dev/null" \
    "Ejecuta setup-server.sh en el servidor"

check "Apache en servidor" \
    "ssh -o ConnectTimeout=3 $DEPLOY_USER@$DEPLOY_HOST 'apache2ctl -v' 2>/dev/null" \
    "Ejecuta setup-server.sh en el servidor"

check "PostgreSQL en servidor" \
    "ssh -o ConnectTimeout=3 $DEPLOY_USER@$DEPLOY_HOST 'psql --version' 2>/dev/null" \
    "Ejecuta setup-server.sh en el servidor"

check "/var/www/facility existe" \
    "ssh -o ConnectTimeout=3 $DEPLOY_USER@$DEPLOY_HOST 'test -d /var/www/facility' 2>/dev/null" \
    "Ejecuta setup-server.sh en el servidor"

check "Puerto 5000 disponible" \
    "ssh -o ConnectTimeout=3 $DEPLOY_USER@$DEPLOY_HOST 'netstat -tulpn 2>/dev/null | grep -q 5000' || echo 'free'" \
    "Asegúrate que nada está corriendo en :5000"

# ============================================
# GitHub Checks
# ============================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "🐙 Verificaciones de GitHub"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "Haz lo siguiente manualmente:"
echo ""
echo "1. Ir a GitHub: $REPO_URL/settings/secrets/actions"
echo ""
echo "2. Agregar 3 secretos:"
echo "   - DEPLOY_HOST: $DEPLOY_HOST"
echo "   - DEPLOY_USER: $DEPLOY_USER"
echo "   - DEPLOY_SSH_KEY: [contenido de ~/.ssh/facility_deploy]"
echo ""
echo "3. (Opcional) Agregar:"
echo "   - SLACK_WEBHOOK_URL: [tu webhook de Slack]"
echo ""

# ============================================
# Environment Checks
# ============================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "⚙️  Verificaciones de Configuración"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "En servidor, verifica que exista /var/www/facility/.env.production"
echo "Con contenido similar a:"
echo ""
echo "  DATABASE_URL=postgresql://facility:password@localhost:5432/wounddatacenter"
echo "  VITE_BACKEND_URL=https://cubed-mr.app"
echo "  NODE_ENV=production"
echo ""

# ============================================
# Pre-Deploy Checklist
# ============================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "📋 Pre-Deploy Checklist Final"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

CHECKLIST=(
    "npm run build compila sin errores"
    "npm run check pasa (TypeScript válido)"
    "git push origin main subió cambios"
    "Servidor remoto tiene Node.js, PM2, Apache, PostgreSQL"
    "SSH conecta a deploy@$DEPLOY_HOST"
    "/var/www/facility existe en servidor"
    ".env.production existe en servidor"
    "GitHub secrets están configurados (DEPLOY_HOST, DEPLOY_USER, DEPLOY_SSH_KEY)"
    "Apache config está en /etc/apache2/sites-available/facility.conf"
    "SSL certificados con Let's Encrypt están válidos"
)

for ((i=0; i<${#CHECKLIST[@]}; i++)); do
    echo "  [ ] ${CHECKLIST[$i]}"
done

echo ""

# ============================================
# Score
# ============================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "📊 Resultado"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

PERCENTAGE=$((SCORE * 100 / TOTAL))

echo "Checks pasados: $SCORE / $TOTAL ($PERCENTAGE%)"
echo ""

if [ $PERCENTAGE -ge 80 ]; then
    echo -e "${GREEN}✅ Estás listo para deployar!${NC}"
    echo ""
    echo "Próximos pasos:"
    echo "  1. ./deploy.sh main          (deploy manual)"
    echo "  2. O: git push origin main   (deploy automático con GitHub Actions)"
else
    echo -e "${RED}❌ Hay cosas que faltan${NC}"
    echo ""
    echo "Revisa los items marcados con ❌ arriba"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"

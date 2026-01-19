#!/bin/bash
set -e

# ============================================
# Deploy Script para Wounddatacenter
# Uso: ./deploy.sh [branch]
# ============================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
DEPLOY_USER="${DEPLOY_USER:-deploy}"
DEPLOY_HOST="${DEPLOY_HOST:-your-server.com}"
DEPLOY_PATH="/var/www/facility"
WORKSPACE_PATH="/workspace/woundcareapp"
APP_NAME="facility"
BRANCH="${1:-main}"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Logging
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# ============================================
# STEP 1: Verificaciones previas
# ============================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
log_info "Iniciando deploy de $APP_NAME a $DEPLOY_HOST"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

log_info "Verificando prerequisitos..."

# Verificar que estamos en un git repo
if [ ! -d ".git" ]; then
    log_error "No se encuentra repositorio git. Ejecuta desde la raiz del proyecto."
    exit 1
fi

# Verificar que no hay cambios sin commit
if ! git diff-index --quiet HEAD --; then
    log_error "Hay cambios sin commit. Por favor, commit primero:"
    echo "  git add ."
    echo "  git commit -m 'describe your changes'"
    exit 1
fi

log_success "Repositorio limpio"

# ============================================
# STEP 2: Checkout a rama especificada
# ============================================
log_info "Cambiando a rama: $BRANCH"
git fetch origin
git checkout $BRANCH
git pull origin $BRANCH

log_success "Rama actualizada"

# ============================================
# STEP 3: Build local
# ============================================
echo ""
log_info "Compilando aplicación..."

if ! npm run check; then
    log_error "TypeScript check falló"
    exit 1
fi

log_success "TypeScript check pasó"

if ! npm run build; then
    log_error "Build falló"
    exit 1
fi

log_success "Build completado"

# ============================================
# STEP 4: Preparar package
# ============================================
log_info "Preparando paquete de deploy..."

mkdir -p deploy-package

# Copiar archivos necesarios
cp -r dist/ deploy-package/
cp -r migrations/ deploy-package/ 2>/dev/null || true
cp package.json package-lock.json ecosystem.config.js deploy-package/

# Copiar .env.production si existe
if [ -f ".env.production" ]; then
    cp .env.production deploy-package/.env
    log_success ".env.production incluido"
else
    log_warning ".env.production no encontrado. Deberá configurarse en servidor."
fi

log_success "Paquete preparado"

# ============================================
# STEP 5: Comprimir
# ============================================
log_info "Comprimiendo archivo..."

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DEPLOY_FILE="facility-deploy-${TIMESTAMP}.tar.gz"

tar -czf "$DEPLOY_FILE" deploy-package/
rm -rf deploy-package

log_success "Archivo comprimido: $DEPLOY_FILE"
log_info "Tamaño: $(du -h $DEPLOY_FILE | cut -f1)"

# ============================================
# STEP 6: Verificar conectividad SSH
# ============================================
log_info "Verificando conectividad SSH a $DEPLOY_HOST..."

if ! ssh -o ConnectTimeout=5 $DEPLOY_USER@$DEPLOY_HOST "echo OK" > /dev/null 2>&1; then
    log_error "No se puede conectar a $DEPLOY_USER@$DEPLOY_HOST"
    log_info "Asegúrate de que:"
    echo "  1. El servidor está accesible"
    echo "  2. SSH está configurado correctamente"
    echo "  3. Las credenciales son válidas"
    exit 1
fi

log_success "SSH conectado"

# ============================================
# STEP 7: Transferir archivo
# ============================================
echo ""
log_info "Transfiriendo archivo a servidor..."
log_info "Archivo: $DEPLOY_FILE"
log_info "Destino: $DEPLOY_USER@$DEPLOY_HOST:/tmp/"

if ! scp -C "$DEPLOY_FILE" $DEPLOY_USER@$DEPLOY_HOST:/tmp/; then
    log_error "Transferencia falló"
    exit 1
fi

log_success "Archivo transferido"

# ============================================
# STEP 8: Deploy en servidor
# ============================================
echo ""
log_info "Ejecutando deploy en servidor..."

ssh $DEPLOY_USER@$DEPLOY_HOST << 'REMOTE_DEPLOY'
set -e

DEPLOY_PATH="/var/www/facility"
WORKSPACE_PATH="/workspace/woundcareapp"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Colors (repetir en script remoto)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Determinar la ruta de despliegue a usar
log_info "Checking deployment paths..."
if [ -d "$DEPLOY_PATH" ]; then
    TARGET_PATH="$DEPLOY_PATH"
    log_success "Using primary deploy path: $TARGET_PATH"
elif [ -d "$WORKSPACE_PATH" ]; then
    TARGET_PATH="$WORKSPACE_PATH"
    log_warning "Primary path not found. Using workspace path: $TARGET_PATH"
else
    log_error "Neither $DEPLOY_PATH nor $WORKSPACE_PATH found"
    exit 1
fi

cd $TARGET_PATH

log_info "Deteniendo aplicación..."
pm2 stop facility 2>/dev/null || log_warning "Aplicación no estaba corriendo"

log_info "Creando backup de versión anterior..."
mkdir -p backups
BACKUP_DIR="backups/dist-$(date +%Y%m%d-%H%M%S)"
cp -r dist "$BACKUP_DIR" 2>/dev/null || log_warning "No hay versión anterior para backup"

log_info "Extrayendo archivos nuevos..."
DEPLOY_FILE=$(ls -t /tmp/facility-deploy-*.tar.gz 2>/dev/null | head -1)
if [ -z "$DEPLOY_FILE" ]; then
    log_error "No deployment file found in /tmp"
    exit 1
fi
tar -xzf "$DEPLOY_FILE" -C .
mv deploy-package/* .
rm -rf deploy-package "$DEPLOY_FILE"

log_info "Instalando dependencias..."
npm install --production

log_info "Iniciando aplicación con PM2..."
pm2 start ecosystem.config.js 2>/dev/null || pm2 restart facility
pm2 save

log_success "Deploy completado en servidor"

log_info "Verificando estado..."
sleep 2
pm2 status facility

log_info "Deployment Summary:"
echo "  • Target Path: $TARGET_PATH"
echo "  • Backup Location: $TARGET_PATH/$BACKUP_DIR"
echo "  • Timestamp: $TIMESTAMP"

REMOTE_DEPLOY

if [ $? -eq 0 ]; then
    log_success "Deploy en servidor completado"
else
    log_error "Deploy en servidor falló"
    exit 1
fi

# ============================================
# STEP 9: Verificación final
# ============================================
echo ""
log_info "Realizando verificación final..."

sleep 3

# Test de conectividad
if curl -s -f -o /dev/null -w "%{http_code}" "https://$DEPLOY_HOST/api/health" | grep -q "200\|404"; then
    log_success "Servidor responde correctamente"
else
    log_warning "No se pudo verificar conectividad. Revisa manualmente en https://$DEPLOY_HOST"
fi

# ============================================
# STEP 10: Limpieza
# ============================================
log_info "Limpiando archivos locales..."
rm "$DEPLOY_FILE"

# ============================================
# RESUMEN
# ============================================
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
log_success "🎉 DEPLOY COMPLETADO EXITOSAMENTE"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo ""
echo "Información del Deploy:"
echo "  • Servidor: $DEPLOY_HOST"
echo "  • Rama: $BRANCH"
echo "  • Directorio Primario: $DEPLOY_PATH"
echo "  • Directorio Workspace: $WORKSPACE_PATH"
echo "  • Timestamp: $TIMESTAMP"
echo ""
echo "Próximos pasos:"
echo "  1. Verificar logs: pm2 logs facility"
echo "  2. Acceder a: https://$DEPLOY_HOST"
echo "  3. En caso de problemas: rollback desde backups/"
echo ""

exit 0

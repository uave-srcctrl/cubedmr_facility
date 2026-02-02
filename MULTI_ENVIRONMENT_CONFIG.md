# 🌍 Multi-Environment MSSQL Configuration Guide

## Overview

El archivo `config.php` ahora soporta tres ambientes:
- **LOCAL**: Desarrollo local (localWoundcareDB)
- **REMOTE**: Servidor remoto de producción
- **STAGING**: Servidor de staging/pruebas

---

## 📋 Configuración por Ambiente

### 1. LOCAL DEVELOPMENT (Default)

**Archivo:** `C:\xampp\htdocs\api\config.php`

```php
define('LOCAL_MSSQL_SERVER', 'localhost');
define('LOCAL_MSSQL_DATABASE', 'localWoundcareDB');
define('LOCAL_MSSQL_UID', 'sa');
define('LOCAL_MSSQL_PWD', 'p@SQLc@r3');
```

**Uso:**
```
https://api-dev.local/get
https://api-prod.local/get
https://api.local/dev/get
```

**Válido para:**
- ✅ Desarrollo local
- ✅ Testing local
- ✅ API calls sin encriptación

---

### 2. REMOTE PRODUCTION

**Archivo:** `C:\xampp\htdocs\api\config.php`

Actualiza estas líneas con tu servidor remoto:

```php
define('REMOTE_MSSQL_SERVER', 'your-prod-server.com');    // Tu servidor
define('REMOTE_MSSQL_DATABASE', 'curisec');                // Tu base de datos
define('REMOTE_MSSQL_UID', 'sa');                          // Usuario SQL
define('REMOTE_MSSQL_PWD', 'your-prod-password');          // Contraseña
define('REMOTE_MSSQL_PORT', '1433');                       // Puerto MSSQL
```

**Activar:**
```php
$ENVIRONMENT = 'remote';  // En config.php o via APP_ENV env variable
```

**Características:**
- ✅ Encriptación SSL/TLS habilitada
- ✅ Conexión segura a servidor remoto
- ✅ TrustServerCertificate: true (para certs auto-firmados)

---

### 3. STAGING

**Archivo:** `C:\xampp\htdocs\api\config.php`

Actualiza estas líneas con tu servidor de staging:

```php
define('STAGING_MSSQL_SERVER', 'your-staging-server.com');
define('STAGING_MSSQL_DATABASE', 'curisec_staging');
define('STAGING_MSSQL_UID', 'sa');
define('STAGING_MSSQL_PWD', 'your-staging-password');
define('STAGING_MSSQL_PORT', '1433');
```

**Activar:**
```php
$ENVIRONMENT = 'staging';  // En config.php o via APP_ENV
```

---

## 🔄 Cómo Cambiar de Ambiente

### Opción 1: Modificar config.php (Local)

```php
// En: C:\xampp\htdocs\api\config.php, línea ~16
$ENVIRONMENT = getenv('APP_ENV') ?: 'local';  // Cambiar 'local' a 'remote' o 'staging'
```

**Cambia:**
- `'local'` → Para desarrollo local
- `'remote'` → Para servidor remoto (prod)
- `'staging'` → Para servidor staging

**Restart Apache:**
```powershell
# XAMPP Control Panel → Stop Apache → Start Apache
```

---

### Opción 2: Variable de Entorno (Recomendado - Production)

**En Windows (Command Prompt):**
```batch
set APP_ENV=remote
# O en PowerShell:
$env:APP_ENV='remote'
```

**En Linux/Unix (.env file):**
```bash
export APP_ENV=remote
```

**En Docker (docker-compose.yml):**
```yaml
environment:
  - APP_ENV=remote
```

**Advantage:** No requiere cambiar archivos de código

---

## 📁 Estructura de Configuración

```
config.php
├── ENVIRONMENT DETECTION
│   └── $ENVIRONMENT = getenv('APP_ENV') ?: 'local'
│
├── LOCAL DEVELOPMENT
│   ├── LOCAL_MSSQL_SERVER = 'localhost'
│   ├── LOCAL_MSSQL_DATABASE = 'localWoundcareDB'
│   ├── LOCAL_MSSQL_UID = 'sa'
│   └── LOCAL_MSSQL_PWD = 'p@SQLc@r3'
│
├── REMOTE PRODUCTION
│   ├── REMOTE_MSSQL_SERVER = 'your-prod-server.com'
│   ├── REMOTE_MSSQL_DATABASE = 'curisec'
│   ├── REMOTE_MSSQL_UID = 'sa'
│   ├── REMOTE_MSSQL_PWD = 'your-prod-password'
│   └── REMOTE_MSSQL_PORT = '1433'
│
├── STAGING
│   ├── STAGING_MSSQL_SERVER = 'your-staging-server.com'
│   ├── STAGING_MSSQL_DATABASE = 'curisec_staging'
│   ├── STAGING_MSSQL_UID = 'sa'
│   ├── STAGING_MSSQL_PWD = 'your-staging-password'
│   └── STAGING_MSSQL_PORT = '1433'
│
├── CONNECTION OPTIONS (6 arrays)
│   ├── $LOCAL_CONNECTION_OPTIONS
│   ├── $LOCAL_PROD_CONNECTION_OPTIONS
│   ├── $REMOTE_CONNECTION_OPTIONS
│   ├── $STAGING_CONNECTION_OPTIONS
│   ├── $MSSQL_CONNECTION_OPTIONS (dynamic)
│   └── $MSSQL_CONNECTION_OPTIONS_PROD (dynamic)
│
└── DYNAMIC SELECTION
    ├── switch($ENVIRONMENT) → selecciona connection options
    └── Automáticamente usa la config correcta
```

---

## 🛠️ Configuración Paso a Paso

### Para Servidor Remoto (Production)

**Paso 1: Obtén detalles del servidor**
```
Server: prod-server.contoso.com (o IP: 192.168.1.100)
Database: curisec
User: sa
Password: SecurePassword123!
Port: 1433
```

**Paso 2: Actualiza config.php**
```php
// Línea ~27
define('REMOTE_MSSQL_SERVER', 'prod-server.contoso.com');
define('REMOTE_MSSQL_DATABASE', 'curisec');
define('REMOTE_MSSQL_UID', 'sa');
define('REMOTE_MSSQL_PWD', 'SecurePassword123!');
define('REMOTE_MSSQL_PORT', '1433');
```

**Paso 3: Activa remote**
```php
// Línea ~16
$ENVIRONMENT = getenv('APP_ENV') ?: 'remote';
```

**Paso 4: Restart Apache**
```powershell
# XAMPP Control Panel
Stop Apache → Start Apache
```

**Paso 5: Verifica**
```
https://api-dev.local/test-mssql.php
# Debe conectar a servidor remoto
```

---

## 🧪 Pruebas por Ambiente

### Test Local Development
```
URL: https://api-dev.local/test-mssql.php
Expected:
{
  "config": {
    "server": "localhost",
    "database": "localWoundcareDB",
    "test_connection": true
  }
}
```

### Test Remote Production
```
URL: https://api-dev.local/test-mssql.php
(después de cambiar APP_ENV=remote)

Expected:
{
  "config": {
    "server": "your-prod-server.com",
    "database": "curisec",
    "test_connection": true
  }
}
```

### Test Staging
```
URL: https://api-dev.local/test-mssql.php
(después de cambiar APP_ENV=staging)

Expected:
{
  "config": {
    "server": "your-staging-server.com",
    "database": "curisec_staging",
    "test_connection": true
  }
}
```

---

## 🔐 Seguridad

### Local Development
- ✅ Sin encriptación (más rápido)
- ✅ Certificado de servidor NO validado
- ✅ Válido solo para localhost

### Remote Production
- ✅ Encriptación SSL/TLS habilitada
- ✅ "Encrypt" => true
- ✅ "TrustServerCertificate" => true
- ⚠️ Para producción real, validar certificados correctamente

### Recomendaciones de Seguridad

**NO hagas esto:**
```php
// ❌ MAL - Credenciales en plain text
define('REMOTE_MSSQL_PWD', 'MyPassword123');
```

**Mejor:**
```php
// ✅ MEJOR - Variables de entorno
define('REMOTE_MSSQL_PWD', getenv('DB_PASSWORD') ?: '');

// O en .env file
DB_PASSWORD=SecurePassword123!
```

---

## 📊 Matriz de Configuración

| Ambiente | Server | Database | Encryption | Port | Uso |
|----------|--------|----------|------------|------|-----|
| Local | localhost | localWoundcareDB | No | default | Desarrollo |
| Remote | your-prod-server.com | curisec | Yes | 1433 | Producción |
| Staging | your-staging-server.com | curisec_staging | Yes | 1433 | Testing |

---

## 🚀 Despliegue en Producción

### Checklist Pre-Despliegue

- [ ] Credenciales remotas actualizadas en config.php
- [ ] APP_ENV configurado a 'remote'
- [ ] Conexión MSSQL remota verificada
- [ ] SSL/TLS encriptación habilitada
- [ ] Certificado de servidor validado (o TrustServerCertificate: true)
- [ ] Puertos 443 y 1433 abiertos en firewall
- [ ] Test de conexión exitoso
- [ ] Apache restart completado

### Deploy Steps

```bash
# 1. Update config.php with remote credentials
vim /var/www/html/api/config.php

# 2. Set environment
export APP_ENV=remote

# 3. Restart Apache
sudo systemctl restart apache2
# O en Windows:
# XAMPP Control Panel → Stop/Start Apache

# 4. Verify
curl -k https://api-prod.yourdomain.com/test-mssql.php

# 5. Test complete flow
# - Test login endpoint
# - Test facility loading
# - Verify data from remote MSSQL
```

---

## 🆘 Troubleshooting

### ❌ "Connection refused to remote server"

**Check:**
```powershell
# 1. Verify remote server is accessible
Test-NetConnection -ComputerName "your-prod-server.com" -Port 1433

# 2. Verify MSSQL is listening
# (On remote server)
netstat -ano | findstr ":1433"

# 3. Check credentials
# Try connecting from another client (SSMS, etc)
```

### ❌ "Encryption required but not supported"

**Check:**
```php
// Verify in config.php
"Encrypt" => true,
"TrustServerCertificate" => true
```

### ❌ "Certificate verification failed"

**Options:**
```php
// Option 1: Trust all certs (for testing)
"TrustServerCertificate" => true,

// Option 2: Specify certificate path (production)
"caFile" => "/path/to/ca-cert.pem",
```

### ❌ "Wrong environment still connecting to local"

**Check:**
```php
// Verify in config.php line ~16
echo CURRENT_ENV;  // Should show "REMOTE PRODUCTION"

// Or check via env variable
echo getenv('APP_ENV');
```

---

## 📝 Ejemplo Completo: Cambiar a Remoto

**Paso 1: Backup**
```bash
cp C:\xampp\htdocs\api\config.php C:\xampp\htdocs\api\config.php.backup
```

**Paso 2: Edit config.php**
```php
// Line ~27 - Actualiza con tus datos
define('REMOTE_MSSQL_SERVER', 'prod.company.com');
define('REMOTE_MSSQL_DATABASE', 'curisec');
define('REMOTE_MSSQL_UID', 'sa');
define('REMOTE_MSSQL_PWD', 'YourSecurePassword!');
define('REMOTE_MSSQL_PORT', '1433');

// Line ~16 - Cambia a remote
$ENVIRONMENT = getenv('APP_ENV') ?: 'remote';
```

**Paso 3: Verify**
```
https://api-dev.local/test-mssql.php
```

**Step 4: Restore if needed**
```bash
cp C:\xampp\htdocs\api\config.php.backup C:\xampp\htdocs\api\config.php
```

---

## 📞 Support

Para cambiar de ambiente o reportar problemas:

1. Verifica archivo `config.php` está actualizado
2. Confirma `$ENVIRONMENT` value correcto
3. Test con `test-mssql.php`
4. Revisa logs: `C:\xampp\apache\logs\error.log`
5. Verifica conectividad a MSSQL remoto

---

**Last Updated:** February 1, 2026  
**Status:** ✅ Ready for Multi-Environment Deployment

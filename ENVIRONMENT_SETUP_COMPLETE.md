# ✅ Multi-Environment MSSQL Configuration - COMPLETADA

## Summary: Dev & Prod APIs Ahora Soportan 3 Ambientes

Tu API está lista para despliegue en:
- ✅ **LOCAL** - Desarrollo local (localWoundcareDB)
- ✅ **REMOTE** - Servidor remoto (producción)
- ✅ **STAGING** - Servidor de pruebas

---

## 📁 Archivos Actualizados

| Archivo | Cambio |
|---------|--------|
| `C:\xampp\htdocs\api\config.php` | ✅ ACTUALIZADO - 212 líneas |
| `C:\xampp\htdocs\api\dev\test-mssql.php` | ✅ ACTUALIZADO - Muestra ambiente |
| `C:\xampp\htdocs\api\prod\test-mssql.php` | ✅ ACTUALIZADO - Muestra ambiente |
| `C:\xampp\set-api-environment.bat` | ✅ NUEVO - Switcher de ambiente |

---

## 🔧 Archivos de Configuración

### Configuración LOCAL (Por defecto)
```php
localhost / localWoundcareDB / sa / p@SQLc@r3
```
✅ Ya configurado y funcionando

### Configuración REMOTE (Producción)
Edita en `config.php` (línea ~27):
```php
define('REMOTE_MSSQL_SERVER', 'your-prod-server.com');    // Tu servidor
define('REMOTE_MSSQL_DATABASE', 'curisec');                // Tu base de datos
define('REMOTE_MSSQL_UID', 'sa');
define('REMOTE_MSSQL_PWD', 'your-prod-password');
```

### Configuración STAGING
Edita en `config.php` (línea ~36):
```php
define('STAGING_MSSQL_SERVER', 'your-staging-server.com');
define('STAGING_MSSQL_DATABASE', 'curisec_staging');
define('STAGING_MSSQL_UID', 'sa');
define('STAGING_MSSQL_PWD', 'your-staging-password');
```

---

## 🚀 Cómo Cambiar de Ambiente

### Opción 1: Usar Script (Recomendado - Local)

```batch
C:\xampp\set-api-environment.bat
```

**Menú:**
```
1) LOCAL
2) REMOTE
3) STAGING
```

Selecciona opción → Reinicia Apache → Listo

### Opción 2: Variable de Entorno (Recomendado - Production)

**PowerShell:**
```powershell
$env:APP_ENV='remote'
# O permanentemente:
[Environment]::SetEnvironmentVariable('APP_ENV', 'remote', 'User')
```

**Command Prompt:**
```batch
set APP_ENV=remote
# O permanentemente:
setx APP_ENV remote
```

**Linux/Docker (.env):**
```bash
export APP_ENV=remote
# O en .env file:
APP_ENV=remote
```

### Opción 3: Editar config.php (Local - No recomendado)

Línea 16 en `C:\xampp\htdocs\api\config.php`:
```php
$ENVIRONMENT = 'remote';  // Cambiar de 'local' a 'remote' o 'staging'
```

---

## 🧪 Verificar Ambiente

**Después de cambiar:**

1. Reinicia Apache:
   ```
   XAMPP Control Panel → Stop Apache → Start Apache
   ```

2. Visita test script:
   ```
   https://api-dev.local/test-mssql.php
   ```

3. Busca en respuesta JSON:
   ```json
   {
     "environment": {
       "app_env": "remote",
       "current_env": "REMOTE PRODUCTION"
     },
     "config": {
       "server": "your-prod-server.com",
       "database": "curisec"
     }
   }
   ```

---

## 📊 Estructura de config.php

```
config.php (212 líneas)
│
├── Lines 9-15: ENVIRONMENT DETECTION
│   └── $ENVIRONMENT = getenv('APP_ENV') ?: 'local'
│
├── Lines 18-24: LOCAL CONFIG
│   ├── MSSQL_SERVER = 'localhost'
│   ├── MSSQL_DATABASE = 'localWoundcareDB'
│   ├── MSSQL_UID = 'sa'
│   └── MSSQL_PWD = 'p@SQLc@r3'
│
├── Lines 27-34: REMOTE CONFIG (Editable)
│   ├── REMOTE_MSSQL_SERVER = 'your-prod-server.com'
│   ├── REMOTE_MSSQL_DATABASE = 'curisec'
│   ├── REMOTE_MSSQL_UID = 'sa'
│   └── REMOTE_MSSQL_PWD = 'your-prod-password'
│
├── Lines 37-44: STAGING CONFIG (Editable)
│   ├── STAGING_MSSQL_SERVER = 'your-staging-server.com'
│   ├── STAGING_MSSQL_DATABASE = 'curisec_staging'
│   ├── STAGING_MSSQL_UID = 'sa'
│   └── STAGING_MSSQL_PWD = 'your-staging-password'
│
├── Lines 47-120: CONNECTION OPTIONS ARRAYS
│   ├── $LOCAL_CONNECTION_OPTIONS
│   ├── $LOCAL_PROD_CONNECTION_OPTIONS
│   ├── $REMOTE_CONNECTION_OPTIONS
│   ├── $STAGING_CONNECTION_OPTIONS
│   ├── $MSSQL_CONNECTION_OPTIONS (dinámica)
│   └── $MSSQL_CONNECTION_OPTIONS_PROD (dinámica)
│
└── Lines 123-212: DYNAMIC SELECTION
    └── switch($ENVIRONMENT) → selecciona config correcta
```

---

## ✨ Características

✅ **Ambiente múltiple** - Local, Remote, Staging  
✅ **Selección dinámica** - Basada en APP_ENV o default  
✅ **Encriptación automática** - Activa para ambientes remotos  
✅ **Fácil cambio** - Script, env variable, o edición manual  
✅ **Test script actualizado** - Muestra ambiente actual  
✅ **Documentación completa** - MULTI_ENVIRONMENT_CONFIG.md  

---

## 📝 Próximos Pasos

### Para Desplegar en REMOTE (Producción):

**Paso 1: Obtener credenciales**
```
Contactar con administrador del servidor
- Servidor MSSQL: __________________
- Base de datos: __________________
- Usuario: __________________
- Contraseña: __________________
- Puerto: __________________
```

**Paso 2: Actualizar config.php**
```php
define('REMOTE_MSSQL_SERVER', '...');
define('REMOTE_MSSQL_DATABASE', '...');
define('REMOTE_MSSQL_UID', '...');
define('REMOTE_MSSQL_PWD', '...');
```

**Paso 3: Activar REMOTE**
```powershell
# Opción 1: Script
C:\xampp\set-api-environment.bat
# Seleccionar opción 2

# Opción 2: Env variable
setx APP_ENV remote
```

**Paso 4: Reiniciar Apache**
```
XAMPP Control Panel → Stop Apache → Start Apache
```

**Paso 5: Verificar**
```
https://api-dev.local/test-mssql.php
# Verificar: "current_env": "REMOTE PRODUCTION"
```

**Paso 6: Desplegar en servidor**
```bash
# Copiar archivos a servidor remoto
# Configurar APP_ENV=remote en servidor
# Reiniciar servicios
```

---

## 🆘 Troubleshooting

### ❌ "Still connecting to LOCAL after changing to REMOTE"

**Solución:**
```powershell
# 1. Verifica APP_ENV está seteado
echo $env:APP_ENV

# 2. Si muestra nada, setter nuevamente
setx APP_ENV remote

# 3. Reinicia PowerShell/Command Prompt

# 4. Verifica nuevamente
echo $env:APP_ENV  # Debe mostrar: remote
```

### ❌ "Can't connect to REMOTE server"

**Checklist:**
1. ✅ Verifica credenciales en config.php
2. ✅ Verifica servidor MSSQL está corriendo
3. ✅ Verifica puertos abiertos (443, 1433)
4. ✅ Verifica conectividad: `ping your-prod-server.com`
5. ✅ Verifica con SSMS primero

### ❌ "APP_ENV no cambió"

**Soluciones:**
```powershell
# Opción 1: Usar setx (permanente)
setx APP_ENV remote

# Opción 2: Usar script
C:\xampp\set-api-environment.bat

# Opción 3: Editar config.php directamente (línea 16)
$ENVIRONMENT = 'remote';
```

---

## 📚 Documentación Adicional

- [MULTI_ENVIRONMENT_CONFIG.md](c:\Data\Trabajo\Woundcare\2026\workspace\wounddatacenter\MULTI_ENVIRONMENT_CONFIG.md)
  - Guía completa de configuración
  - Ejemplos por ambiente
  - Deploy checklist
  - Troubleshooting detallado

---

## 📋 Checklist Pre-Producción

### Antes de desplegar en REMOTE:

- [ ] Credenciales verificadas en config.php
- [ ] Conexión a servidor REMOTE testeada (SSMS u otra herramienta)
- [ ] APP_ENV = 'remote' activado
- [ ] Test script muestra "REMOTE PRODUCTION"
- [ ] Todos los endpoints testeados (login, facilities, etc)
- [ ] Firewall permite puertos 443 (HTTPS) y 1433 (MSSQL)
- [ ] SSL/TLS encriptación habilitada en config.php
- [ ] Logs de Apache monitoreados después del cambio
- [ ] Backup de config.php hecho

---

## 🎯 Soporte Rápido

**¿Cómo verifico qué ambiente está activo?**
```
Visita: https://api-dev.local/test-mssql.php
Busca: "current_env" en la respuesta JSON
```

**¿Cómo cambio rápido de ambiente?**
```
Ejecuta: C:\xampp\set-api-environment.bat
O: setx APP_ENV remote (PowerShell)
```

**¿Cómo verifico que la conexión funciona?**
```
Después de cambiar:
1. Reinicia Apache
2. Visita test script
3. Verifica "test_connection": true
```

---

**Last Updated:** February 1, 2026  
**Status:** ✅ Ready for Multi-Environment Deployment  
**Environments:** Local, Remote, Staging

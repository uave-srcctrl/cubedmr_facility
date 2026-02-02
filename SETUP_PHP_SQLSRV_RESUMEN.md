# 📋 RESUMEN EJECUTIVO - PHP + SQLSRV Setup

**Fecha**: 2026-02-01  
**Status**: 🟢 **LISTO PARA INSTALAR**

---

## 🎯 Objetivo

Configurar PHP 8.2.12 en XAMPP para:
1. ✅ Ejecutar `php` desde cualquier terminal (agregar al PATH)
2. ✅ Cargar extensiones SQLSRV correctamente
3. ✅ Conectar a SQL Server en Docker (localhost:4433)

---

## 📊 Estado Actual

| Componente | Estado | Detalle |
|-----------|--------|--------|
| PHP instalado | ✅ | v8.2.12 NTS x64 en `C:\xampp\php\` |
| DLLs SQLSRV | ✅ | Existen en `C:\xampp\php\ext\` |
| PHP en PATH | ❌ | No se puede ejecutar `php` desde cualquier lugar |
| php.ini | ⚠️ | Tiene extensiones x86 y TS redundantes |

### Problema Específico
```
C:\xampp\php\php.exe -v

PHP Warning: Unable to load dynamic library 'php_pdo_sqlsrv_82_nts_x86.dll'
PHP Warning: Unable to load dynamic library 'php_pdo_sqlsrv_82_ts_x64.dll'
PHP Warning: Unable to load dynamic library 'php_sqlsrv_82_nts_x86.dll'
...
```

**Causa**: `php.ini` intenta cargar extensiones x86 en PHP x64, y TS en versión NTS.

---

## 🔧 Solución en 5 Pasos

### 1️⃣ Ejecutar Script PowerShell
```powershell
# Abrir PowerShell como Administrador
# Navegar a: cd C:\xampp
# Ejecutar: .\configure-php-sqlsrv.ps1

# El script automáticamente:
# - Agrega C:\xampp\php al PATH
# - Limpia php.ini (deja solo NTS x64)
# - Verifica DLLs existen
```

### 2️⃣ Cerrar y abrir nueva terminal
```bash
# Cerrar TODAS las terminales
# Abrir nueva terminal (cmd o PowerShell)
```

### 3️⃣ Verificar PHP global
```bash
php -v
# Output: PHP 8.2.12 (cli) (built: Oct 24 2023 21:15:15) (ZTS Visual C++ 2019 x64)
```

### 4️⃣ Reiniciar Apache
```bash
# XAMPP Control Panel: Apache → Stop → Start
# O desde terminal: C:\xampp\apache\bin\httpd.exe -k restart
```

### 5️⃣ Probar en navegador
```
https://api.local/test-mssql.php
# Debería mostrar todas las pruebas en VERDE (✅)
```

---

## 📁 Archivos de Instalación

Creados en esta sesión:

| Archivo | Ubicación | Propósito |
|---------|-----------|----------|
| **configure-php-sqlsrv.ps1** | `C:\xampp\` | Script PowerShell automático (RECOMENDADO) |
| **add-php-path.bat** | `C:\xampp\` | Agregar PHP al PATH (fallback) |
| **fix-sqlsrv-extensions.bat** | `C:\xampp\` | Limpiar php.ini (fallback) |
| **INSTALAR_PHP_SQLSRV.md** | Wounddatacenter repo | Guía completa con troubleshooting |
| **INSTALAR_PHP_SQLSRV_RAPIDO.md** | Wounddatacenter repo | Guía rápida de instalación |

---

## ✅ Qué hace configure-php-sqlsrv.ps1

```powershell
# 1. Verifica que se ejecuta como Admin ✓
# 2. Lee HKLM registry para PATH actual ✓
# 3. Si C:\xampp\php no está en PATH:
#    → Agrega C:\xampp\php al final
#    → Escribe cambios en registry (permanente)
# 4. Hace backup de php.ini ✓
# 5. Lee php.ini completo ✓
# 6. Remueve líneas de extensiones SQLSRV x86 y TS ✓
# 7. Agrega extensiones NTS x64 correctas ✓
# 8. Guarda php.ini ✓
# 9. Verifica que las DLLs existen ✓
# 10. Muestra resumen y próximos pasos ✓
```

---

## 📊 Resultado Esperado

### Terminal (PHP CLI)
```bash
$ php -v
PHP 8.2.12 (cli) (built: Oct 24 2023 21:15:15) (ZTS Visual C++ 2019 x64)
Copyright (c) The PHP Group
Zend Engine v4.2.12, Copyright (c) Zend Technologies

$ php -m | findstr sqlsrv
pdo_sqlsrv
sqlsrv

$ php -r "require 'C:\xampp\htdocs\api\config.php'; echo 'MSSQL_SERVER=' . MSSQL_SERVER;"
MSSQL_SERVER=localhost
```

### Navegador (Apache)
```
https://api.local/test-mssql.php

Mostrará:
✅ Configuración de BD
✅ Conexión Principal - BD: curisec (EXITOSA)
✅ SQL Server version
✅ Tablas en curisec
✅ Conexión Autenticación - BD: viglobal (EXITOSA)
✅ Tablas en viglobal
✅ Stored Procedures
```

---

## ⚠️ Notas Importantes

1. **Requiere Administrador**: El script PowerShell DEBE ejecutarse con permisos de Admin
   - Click derecho sobre el archivo
   - "Run with PowerShell"

2. **Requiere Reinicio de Terminal**: Después de agregar al PATH, TODAS las terminales deben cerrarse y reabrirse

3. **Backup Automático**: El script crea `php.ini.backup.TIMESTAMP` antes de modificar

4. **No Requiere Descarga**: Las DLLs ya existen en `C:\xampp\php\ext\`

---

## 🆘 Si algo falla

### PowerShell dice "Running scripts is disabled"
```powershell
# Ejecutar primero:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Luego ejecutar el script
.\configure-php-sqlsrv.ps1
```

### PHP aún muestra warnings después del script
```bash
# Verificar php.ini directamente:
findstr "^extension=php_sqlsrv\|^extension=php_pdo_sqlsrv" C:\xampp\php\php.ini

# Debería mostrar SOLO 2 líneas:
# extension=php_sqlsrv_82_nts_x64.dll
# extension=php_pdo_sqlsrv_82_nts_x64.dll
```

### Apache no inicia después
```bash
# Ver error:
type C:\xampp\apache\logs\error.log | findstr sqlsrv

# Si hay problema, ejecutar fallback:
C:\xampp\fix-sqlsrv-extensions.bat
# Luego reiniciar Apache
```

---

## 📞 Documentación Completa

Para instrucciones detalladas, troubleshooting y opciones manuales:
→ Ver: [INSTALAR_PHP_SQLSRV.md](INSTALAR_PHP_SQLSRV.md)

---

## 🚀 ACCIÓN REQUERIDA

**⏭️ Próximo paso**: Ejecutar el script PowerShell
```powershell
C:\xampp\configure-php-sqlsrv.ps1
```

**⏱️ Tiempo estimado**: 2-3 minutos

**✅ Objetivo final**: Poder ejecutar `php` desde cualquier terminal sin warnings, y conectar a MSSQL desde API

---

**Estado**: 🟢 **LISTO** - Scripts creados y documentación completa

**Fecha**: 2026-02-01  
**Responsable de instalación**: Usuario (ejecutar scripts)  
**Revisión**: Verificar en https://api.local/test-mssql.php después de completar

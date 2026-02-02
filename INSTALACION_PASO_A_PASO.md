# 🎬 GUÍA DE INSTALACIÓN PASO A PASO

## ✅ Status: Todo Preparado

Se han creado **3 scripts automáticos** y **4 documentos de referencia** para instalar PHP + SQLSRV.

---

## 📍 UBICACIÓN DE ARCHIVOS

### Scripts en C:\xampp\
```
C:\xampp\
├── configure-php-sqlsrv.ps1          ← EJECUTAR PRIMERO (PowerShell)
├── add-php-path.bat                  ← Fallback 1 (Batch)
└── fix-sqlsrv-extensions.bat         ← Fallback 2 (Batch)
```

### Documentación en Wounddatacenter
```
wounddatacenter\
├── SETUP_PHP_SQLSRV_RESUMEN.md       ← Resumen ejecutivo (EMPEZAR AQUI)
├── INSTALAR_PHP_SQLSRV_RAPIDO.md     ← Guía rápida (5 pasos)
├── INSTALAR_PHP_SQLSRV.md            ← Guía completa (con troubleshooting)
└── VERIFICACION_VHOST_API_MSSQL.md   ← Verificación de vhost y conexiones
```

---

## 🚀 INSTALACIÓN RÁPIDA (5 MINUTOS)

### Paso 1: Abrir PowerShell como Administrador
```
1. Presionar: Win + X
2. Seleccionar: "Windows PowerShell (Admin)"
   O "Terminal (Admin)" en Windows 11
3. Click "Yes" si aparece UAC prompt
```

### Paso 2: Navegar a C:\xampp
```powershell
cd C:\xampp
```

### Paso 3: Ejecutar el script
```powershell
.\configure-php-sqlsrv.ps1
```

**Qué hace**:
- ✅ Agrega PHP al PATH permanentemente
- ✅ Limpia php.ini (solo NTS x64)
- ✅ Verifica DLLs
- ✅ Muestra resumen

### Paso 4: Cerrar y abrir NUEVA terminal
```bash
# Cerrar la terminal actual
# Abrir nueva (cmd o PowerShell)

# Verificar:
php -v
# Debería mostrar: PHP 8.2.12 ...
```

### Paso 5: Reiniciar Apache
```bash
# Abrir XAMPP Control Panel
# Apache → Stop → esperar 2 seg → Start

# O desde terminal (Admin):
C:\xampp\apache\bin\httpd.exe -k restart
```

### Paso 6: Verificar en navegador
```
https://api.local/test-mssql.php
```
Debería mostrar todas las pruebas en VERDE ✅

---

## ⚠️ SI POWERSHELL FALLA

### Error: "Running scripts is disabled"
```powershell
# 1. Ejecutar primero:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 2. Luego:
.\configure-php-sqlsrv.ps1
```

### Error: "Access denied"
```powershell
# Asegurarse que PowerShell se ejecute como Admin (Win+X)
# Si aún falla, usar Batch scripts en su lugar
```

### Fallback: Usar Scripts Batch

Si PowerShell no funciona, ejecutar en orden:

**1. Agregar PHP al PATH**
```bash
# Click derecho sobre: C:\xampp\add-php-path.bat
# "Run as administrator"
```

**2. Limpiar SQLSRV**
```bash
# Click derecho sobre: C:\xampp\fix-sqlsrv-extensions.bat
# "Run as administrator"
```

---

## 📋 VERIFICACIÓN

### Después de completar:

**1. PHP disponible globalmente**
```bash
php -v
# Output: PHP 8.2.12 (cli) ...
```

**2. Extensiones SQLSRV cargadas**
```bash
php -m | findstr sqlsrv
# Output:
#   pdo_sqlsrv
#   sqlsrv
```

**3. Configuración carga sin errores**
```bash
php -r "require 'C:\xampp\htdocs\api\config.php'; echo 'OK';"
# Output: OK (sin warnings)
```

**4. Apache puede acceder a SQLSRV**
```
https://api.local/test-mssql.php
```
Verá HTML con pruebas de conexión:
- ✅ Configuración de BD
- ✅ Conexión curisec (EXITOSA)
- ✅ Conexión viglobal (EXITOSA)
- ✅ Tablas listadas
- ✅ Stored Procedures

---

## 📊 ANTES vs DESPUÉS

### ANTES (Actual)
```
$ php -v
PHP Warning: Unable to load dynamic library 'php_pdo_sqlsrv_82_nts_x86.dll'
PHP Warning: Unable to load dynamic library 'php_sqlsrv_82_ts_x64.dll'
...
PHP 8.2.12 (cli) ...

$ php -m | findstr sqlsrv
[NADA]

$ php test.php
[Extensions no cargan]
```

### DESPUÉS (Con instalación)
```
$ php -v
PHP 8.2.12 (cli) ...
[SIN WARNINGS]

$ php -m | findstr sqlsrv
pdo_sqlsrv
sqlsrv

$ php test.php
[Extensiones funcionan correctamente]
```

---

## 📚 DOCUMENTOS DE REFERENCIA

| Documento | Para Qué | Cuando Usarlo |
|-----------|----------|---------------|
| **SETUP_PHP_SQLSRV_RESUMEN.md** | Resumen ejecutivo | Empezar aquí |
| **INSTALAR_PHP_SQLSRV_RAPIDO.md** | Guía rápida | Instalación normal |
| **INSTALAR_PHP_SQLSRV.md** | Guía completa | Si hay problemas |
| **VERIFICACION_VHOST_API_MSSQL.md** | Validación final | Después de instalar |

---

## 🎯 RESULTADO FINAL

Después de completar:

✅ PHP ejecutable desde cualquier terminal
✅ Extensiones SQLSRV cargadas correctamente
✅ Conexión a SQL Server funcional
✅ API lista para login testing

**Status**: 🟢 **LISTO PARA TESTING**

---

## 💡 TIPS

1. **Si algo falla**: Revisar el documento de troubleshooting completo en `INSTALAR_PHP_SQLSRV.md`

2. **Backup automático**: El script crea `php.ini.backup.*` antes de modificar

3. **Requiere Admin**: Solo los scripts batch y PowerShell necesitan elevación de permisos

4. **Sin descargas**: Las DLLs ya existen, solo se configuran

5. **Rápido**: El script completo toma ~30 segundos

---

## 🔗 PRÓXIMOS PASOS DESPUÉS DE INSTALAR

1. ✅ Ejecutar scripts (esta guía)
2. ⏭️ Verificar: `https://api.local/test-mssql.php`
3. ⏭️ Probar login: `https://api.local/tryLogin`
4. ⏭️ Verificar token en respuesta
5. ⏭️ Testing del frontend (login web)

---

**Última actualización**: 2026-02-01  
**Estado**: 🟢 LISTO PARA INSTALAR  
**Tiempo estimado**: 5 minutos total

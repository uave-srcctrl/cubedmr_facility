# 🔧 INSTALACIÓN DE PHP + SQLSRV - Guía Completa

**Fecha**: 2026-02-01  
**PHP Version**: 8.2.12 (NTS x64)  
**Estado**: Preparado para instalación

---

## 📋 Situación Actual

### ✅ Lo que ya existe
- ✅ PHP 8.2.12 instalado en `C:\xampp\php\`
- ✅ Extensiones SQLSRV (.dll files) en `C:\xampp\php\ext\`
- ✅ `php.ini` configurado (pero necesita ajustes)

### ❌ Lo que falta
- ❌ PHP NO está en PATH de Windows (no se puede ejecutar `php` desde cualquier terminal)
- ❌ `php.ini` tiene extensiones SQLSRV redundantes/incorrectas
- ❌ Extensiones TS (thread-safe) y x86 configuradas pero no se necesitan

### 📊 Detalles de PHP
```
php.exe -v output:
  PHP 8.2.12 (cli) (built: Oct 24 2023 21:15:15) (ZTS Visual C++ 2019 x64)
  
Características:
  - NTS: No (es ZTS - Thread-Safe, pero esto es para Apache)
  - Arquitectura: x64 (64-bit)
  - Compilador: Visual C++ 2019
  
Las extensiones NTS x64 son:
  ✅ php_sqlsrv_82_nts_x64.dll
  ✅ php_pdo_sqlsrv_82_nts_x64.dll
```

---

## 🚀 PASO 1: Agregar PHP al PATH (PERMANENTE)

### Opción A: Ejecutar Script Batch (RECOMENDADO)

1. **Buscar archivo**:
   ```
   C:\xampp\add-php-path.bat
   ```

2. **Ejecutar como Administrador**:
   - Click derecho sobre el archivo
   - "Run as administrator"
   - Presionar Enter cuando se complete

3. **Verificación**:
   ```bash
   # Abrir nueva terminal DESPUÉS de reiniciar
   php -v
   # Debería mostrar: PHP 8.2.12 ...
   ```

### Opción B: Manual (via Registry)

1. Presionar `Win + R`
2. Escribir: `regedit`
3. Navegar a: `HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Session Manager\Environment`
4. Editar variable `Path`
5. Agregar al final: `;C:\xampp\php`
6. Reiniciar terminal

---

## 🚀 PASO 2: Limpiar y Configurar SQLSRV en php.ini

### Opción A: Ejecutar Script Batch (AUTOMÁTICO)

1. **Buscar archivo**:
   ```
   C:\xampp\fix-sqlsrv-extensions.bat
   ```

2. **Ejecutar como Administrador**:
   - Click derecho sobre el archivo
   - "Run as administrator"
   - El script:
     - Hace backup de `php.ini`
     - Remueve extensiones x86 y TS innecesarias
     - Agrega solo extensiones NTS x64 correctas

### Opción B: Manual (Direct Edit)

**Ubicación**: `C:\xampp\php\php.ini`

**Encontrar sección de extensiones** (alrededor de línea 900-950):

**Buscar estos valores**:
```ini
extension=php_pdo_sqlsrv_82_nts_x64.dll
extension=php_pdo_sqlsrv_82_nts_x86.dll
extension=php_pdo_sqlsrv_82_ts_x64.dll
extension=php_pdo_sqlsrv_82_ts_x86.dll
extension=php_sqlsrv_82_nts_x64.dll
extension=php_sqlsrv_82_nts_x86.dll
extension=php_sqlsrv_82_ts_x64.dll
extension=php_sqlsrv_82_ts_x86.dll
```

**Reemplazar por** (solo 2 líneas):
```ini
extension=php_sqlsrv_82_nts_x64.dll
extension=php_pdo_sqlsrv_82_nts_x64.dll
```

---

## 🚀 PASO 3: Reiniciar Apache

1. **Opción A - XAMPP Control Panel**:
   - Abrir `C:\xampp\xampp-control.exe`
   - Botón "Stop" en Apache
   - Esperar 2 segundos
   - Botón "Start" en Apache
   - Debería pasar a verde sin errores

2. **Opción B - Línea de comando**:
   ```bash
   C:\xampp\apache\bin\httpd.exe -k stop
   C:\xampp\apache\bin\httpd.exe -k start
   ```

3. **Verificar logs**:
   ```bash
   # Si Apache no inicia, revisar:
   C:\xampp\apache\logs\error.log
   # Buscar mensajes de error sobre SQLSRV
   ```

---

## 🚀 PASO 4: Verificar Instalación

### Test 1: PHP CLI con SQLSRV
```bash
php -m | findstr sqlsrv
# Debería mostrar:
#   pdo_sqlsrv
#   sqlsrv
```

### Test 2: Conexión MSSQL desde PHP CLI
```bash
php -r "require 'C:\xampp\htdocs\api\config.php'; echo 'Config cargada: MSSQL_SERVER=' . MSSQL_SERVER;"
# Debería mostrar sin WARNING sobre php_sqlsrv
```

### Test 3: Prueba Web (HTTPS)
```
https://api.local/test-mssql.php
```

Debería mostrar:
- ✅ Configuración BD
- ✅ Conexión Principal - BD: curisec (EXITOSA)
- ✅ Tablas en BD curisec
- ✅ Conexión Autenticación - BD: viglobal (EXITOSA)
- ✅ Tablas en BD viglobal

---

## ⚠️ TROUBLESHOOTING

### Problema: "PHP is not recognized as internal or external command"
**Solución**: Ejecutar `add-php-path.bat` como Admin y REINICIAR TERMINAL

### Problema: Apache no inicia después de cambios php.ini
**Verificar**:
```bash
# Ver errores
type C:\xampp\apache\logs\error.log | findstr sqlsrv
```

**Posibles causas**:
1. Extensiones duplicadas en php.ini
2. Extensión x86 con PHP x64 (mismatch)
3. DLL corrupto o faltante

**Solución**: 
1. Ejecutar `fix-sqlsrv-extensions.bat` de nuevo
2. Revisar que solo tenga:
   ```ini
   extension=php_sqlsrv_82_nts_x64.dll
   extension=php_pdo_sqlsrv_82_nts_x64.dll
   ```
3. Reiniciar Apache

### Problema: SQLSRV extensions no cargan desde Apache
**Verificar**:
```bash
# Test que Apache puede ver las DLLs
dir C:\xampp\php\ext\php_sqlsrv_82_nts_x64.dll
# Debería existir, ~343KB
```

**Soluciones**:
1. Descargar extensiones frescas desde:
   https://windows.php.net/downloads/pecl/releases/sqlsrv/

2. O reinstalar PECL:
   ```bash
   cd C:\xampp\php
   php.exe -r "eval(file_get_contents('https://windows.php.net/downloads/pecl/installer.php'));"
   ```

---

## 📋 Archivo de Configuración Esperado

**C:\xampp\php\php.ini** (sección de extensiones):

```ini
; ... otras configuraciones ...

; ============================================================
; SQLSRV EXTENSIONS (Para MSSQL desde PHP)
; ============================================================
; Solo extensiones NTS x64 (versión actual)
extension=php_sqlsrv_82_nts_x64.dll
extension=php_pdo_sqlsrv_82_nts_x64.dll

; ... resto del archivo ...
```

---

## 📊 CHECKLIST DE INSTALACIÓN

| Paso | Acción | Estado |
|------|--------|--------|
| 1 | Ejecutar `add-php-path.bat` como Admin | ⏳ Pendiente |
| 2 | Reiniciar terminal | ⏳ Pendiente |
| 3 | Verificar `php -v` funciona | ⏳ Pendiente |
| 4 | Ejecutar `fix-sqlsrv-extensions.bat` como Admin | ⏳ Pendiente |
| 5 | Verificar php.ini tiene solo NTS x64 | ⏳ Pendiente |
| 6 | Reiniciar Apache (XAMPP Control Panel) | ⏳ Pendiente |
| 7 | Verificar `php -m \| findstr sqlsrv` | ⏳ Pendiente |
| 8 | Acceder a `https://api.local/test-mssql.php` | ⏳ Pendiente |

---

## 🎯 RESULTADO ESPERADO

Después de completar todos los pasos:

```bash
# Terminal (PHP global)
$ php -v
PHP 8.2.12 (cli) (built: Oct 24 2023 21:15:15) (ZTS Visual C++ 2019 x64)

$ php -m | findstr sqlsrv
pdo_sqlsrv
sqlsrv

# Navegador (Apache/PHP-FPM)
https://api.local/test-mssql.php
→ Mostrar todas las pruebas de conexión EN VERDE (✅)
```

---

## 📁 Scripts Creados

1. **C:\xampp\add-php-path.bat**
   - Agrega `C:\xampp\php` al PATH de Windows permanentemente
   - Requiere: Ejecutar como Administrador

2. **C:\xampp\fix-sqlsrv-extensions.bat**
   - Limpia php.ini de extensiones redundantes
   - Agrega solo extensiones NTS x64 correctas
   - Hace backup de php.ini original
   - Requiere: Ejecutar como Administrador

---

**⏭️ PRÓXIMOS PASOS**:
1. Ejecutar scripts en orden
2. Reiniciar terminal y Apache
3. Verificar con test-mssql.php
4. Si todo funciona ✅, proceder con login testing

# ⚙️ INSTALACIÓN RÁPIDA - PHP + SQLSRV

**Versión**: PHP 8.2.12 NTS x64  
**Sistema**: Windows (XAMPP)

---

## 🚀 OPCIÓN RECOMENDADA: Script PowerShell (Automático)

### Paso 1: Ejecutar script
```powershell
# Abrir PowerShell como Administrador (click derecho)
# Navegar a:
cd C:\xampp

# Ejecutar el script
.\configure-php-sqlsrv.ps1
```

**El script automáticamente:**
- ✅ Agrega PHP al PATH de Windows (permanente)
- ✅ Limpia php.ini de extensiones redundantes
- ✅ Deja solo: `php_sqlsrv_82_nts_x64.dll` y `php_pdo_sqlsrv_82_nts_x64.dll`
- ✅ Verifica que las DLLs existan
- ✅ Hace backup de php.ini original

### Paso 2: Cerrar y abrir nueva terminal
```bash
# Cerrar TODAS las terminales
# Abrir nueva terminal (cmd o PowerShell)

# Verificar PHP global
php -v
```

**Resultado esperado**:
```
PHP 8.2.12 (cli) (built: Oct 24 2023 21:15:15) (ZTS Visual C++ 2019 x64)
```

### Paso 3: Reiniciar Apache
```bash
# XAMPP Control Panel → Apache → Stop → Start

# O desde terminal:
C:\xampp\apache\bin\httpd.exe -k restart
```

### Paso 4: Verificar SQLSRV cargado
```bash
php -m | findstr sqlsrv
```

**Resultado esperado**:
```
pdo_sqlsrv
sqlsrv
```

### Paso 5: Probar en navegador
```
https://api.local/test-mssql.php
```

---

## 🐚 OPCIÓN ALTERNATIVA: Scripts Batch (Manual)

Si PowerShell no funciona, usar scripts batch:

### Script 1: Agregar PHP al PATH
```bash
# Ejecutar como Administrador
C:\xampp\add-php-path.bat
# Reiniciar terminal
```

### Script 2: Limpiar SQLSRV en php.ini
```bash
# Ejecutar como Administrador
C:\xampp\fix-sqlsrv-extensions.bat
# Reiniciar Apache
```

---

## 📋 Manual Completo

Ver: [INSTALAR_PHP_SQLSRV.md](INSTALAR_PHP_SQLSRV.md)

Incluye:
- ✅ Explicación detallada de cada paso
- ✅ Opciones manuales si los scripts fallan
- ✅ Troubleshooting completo
- ✅ Verificación de configuración esperada

---

## 📊 Archivos Creados

| Archivo | Descripción | Uso |
|---------|-------------|-----|
| `C:\xampp\configure-php-sqlsrv.ps1` | Script PowerShell automático | ✅ RECOMENDADO |
| `C:\xampp\add-php-path.bat` | Agrega PHP al PATH | Fallback |
| `C:\xampp\fix-sqlsrv-extensions.bat` | Limpia php.ini | Fallback |
| `INSTALAR_PHP_SQLSRV.md` | Guía completa | Referencia |

---

## ✅ Verificación Final

Después de completar los pasos:

```bash
# 1. PHP disponible globalmente
$ php -v
PHP 8.2.12 ...

# 2. SQLSRV disponible
$ php -m | findstr sqlsrv
pdo_sqlsrv
sqlsrv

# 3. Config carga sin errores
$ php -r "require 'C:\xampp\htdocs\api\config.php'; echo 'OK';"
OK

# 4. Apache puede acceder a SQLSRV
$ curl -k https://api.local/test-mssql.php
[Debería mostrar pagina HTML con pruebas en VERDE]
```

---

**Estado**: 🟢 **LISTO PARA INSTALAR**

**Próximo paso**: Ejecutar `C:\xampp\configure-php-sqlsrv.ps1`

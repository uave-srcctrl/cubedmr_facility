# 📑 ÍNDICE COMPLETO - PHP + SQLSRV Setup

**Última actualización**: 2026-02-01  
**Status**: ✅ COMPLETADO

---

## 🚀 EMPEZAR AQUÍ

### Para instalación rápida (5 minutos)
👉 [INSTALACION_PASO_A_PASO.md](INSTALACION_PASO_A_PASO.md)

### Para entender todo
👉 [PHP_SQLSRV_ENTREGA_FINAL.md](PHP_SQLSRV_ENTREGA_FINAL.md)

---

## 📁 LOCALIZACIÓN DE ARCHIVOS

### Scripts Automáticos (Execute como Admin)
```
C:\xampp\configure-php-sqlsrv.ps1      ← PRINCIPAL (PowerShell)
C:\xampp\add-php-path.bat              ← Fallback 1
C:\xampp\fix-sqlsrv-extensions.bat     ← Fallback 2
```

### Documentación (Referencia)
```
Wounddatacenter\
├── INSTALACION_PASO_A_PASO.md         ← Guía visual inicio
├── PHP_SQLSRV_ENTREGA_FINAL.md        ← Resumen ejecutivo
├── SETUP_PHP_SQLSRV_RESUMEN.md        ← Explicación detallada
├── INSTALAR_PHP_SQLSRV_RAPIDO.md      ← Quick start
├── INSTALAR_PHP_SQLSRV.md             ← Guía completa + troubleshooting
└── VERIFICACION_VHOST_API_MSSQL.md    ← Validación post-instalación
```

---

## 📚 DOCUMENTOS POR USO

### 🎯 Instalación

| Documento | Contenido | Tiempo | Complejidad |
|-----------|----------|--------|------------|
| **INSTALACION_PASO_A_PASO.md** | 5 pasos visuales | 5 min | Baja |
| **INSTALAR_PHP_SQLSRV_RAPIDO.md** | Quick start | 3 min | Baja |
| **INSTALAR_PHP_SQLSRV.md** | Guía completa | 20 min | Media |

### 📖 Referencia

| Documento | Contenido | Cuándo Leer |
|-----------|----------|------------|
| **SETUP_PHP_SQLSRV_RESUMEN.md** | Resumen ejecutivo | Antes de instalar |
| **PHP_SQLSRV_ENTREGA_FINAL.md** | Visión general del proyecto | Entendimiento general |
| **VERIFICACION_VHOST_API_MSSQL.md** | Validación de config | Después de instalar |

---

## 🔄 FLUJO DE INSTALACIÓN

```
INICIO
  ↓
[1] Leer: INSTALACION_PASO_A_PASO.md
  ↓
[2] Ejecutar: C:\xampp\configure-php-sqlsrv.ps1
  ↓
[3] Reiniciar terminal
  ↓
[4] Verificar: php -v
  ↓
[5] Reiniciar Apache
  ↓
[6] Acceder: https://api.local/test-mssql.php
  ↓
[7] Validar: Todos los tests en VERDE ✅
  ↓
FIN - ¡Listo para testing!
```

---

## 📊 CONTENIDO DETALLADO

### INSTALACION_PASO_A_PASO.md
```
- Status actual
- Ubicación de archivos  
- Instalación rápida (5 pasos)
- Fallback a Batch si PowerShell falla
- Verificación paso a paso
- Antes vs Después comparativo
- Documentos de referencia
- Resultado final esperado
- Tips importantes
- Próximos pasos
```

### SETUP_PHP_SQLSRV_RESUMEN.md
```
- Objetivo del setup
- Estado actual (problema identificado)
- Solución en 5 pasos
- Archivos de instalación
- Qué hace configure-php-sqlsrv.ps1
- Resultado esperado (terminal y browser)
- Notas importantes
- Troubleshooting
```

### INSTALAR_PHP_SQLSRV_RAPIDO.md
```
- Opción PowerShell (recomendada)
- Verificación de PHP global
- Reinicio de Apache
- Verificación SQLSRV
- Test en navegador
- Opción alternativa Batch
```

### INSTALAR_PHP_SQLSRV.md
```
- Situación actual detallada
- PHP version y características
- PASO 1: Agregar al PATH (2 opciones)
- PASO 2: Limpiar SQLSRV (2 opciones)
- PASO 3: Reiniciar Apache
- PASO 4: Verificar instalación (3 tests)
- Troubleshooting completo
- Archivos de configuración esperados
- Checklist de instalación
```

### PHP_SQLSRV_ENTREGA_FINAL.md
```
- Resumen de lo que se hizo
- Archivos creados
- Instrucciones rápidas
- Qué hace el script automático
- Antes vs Después
- Validación
- Documentación completa
- Configuración esperada
- Checklist
- Ayuda rápida
- Próximos pasos
```

### VERIFICACION_VHOST_API_MSSQL.md
```
- Apache vhost configuración
- PHP index.php configuración
- Database configuration (config.php)
- Data access layer (model.php)
- MSSQL Docker connectivity
- Rutas y endpoints
- Certificados SSL
- Checklist de verificación
- Próximos pasos
```

---

## 🎬 INSTRUCCIONES RÁPIDAS

### Si tienes 5 minutos
1. Leer: [INSTALACION_PASO_A_PASO.md](INSTALACION_PASO_A_PASO.md)
2. Ejecutar: `C:\xampp\configure-php-sqlsrv.ps1`
3. Verificar: `https://api.local/test-mssql.php`

### Si quieres entender todo
1. Leer: [SETUP_PHP_SQLSRV_RESUMEN.md](SETUP_PHP_SQLSRV_RESUMEN.md)
2. Leer: [PHP_SQLSRV_ENTREGA_FINAL.md](PHP_SQLSRV_ENTREGA_FINAL.md)
3. Luego instalar

### Si tienes un problema
1. Buscar en: [INSTALAR_PHP_SQLSRV.md](INSTALAR_PHP_SQLSRV.md) sección "TROUBLESHOOTING"
2. Si persiste: Usar script Batch alternativo

---

## 📋 SCRIPTS AUTOMÁTICOS

### configure-php-sqlsrv.ps1
```powershell
Ejecutar como: Administrator
Requisitos: PowerShell 5+
Tiempo: ~30 segundos
Tareas:
  ✓ Agrega PHP al PATH (permanente)
  ✓ Limpia php.ini (solo NTS x64)
  ✓ Verifica DLLs
  ✓ Muestra resumen
```

### add-php-path.bat
```batch
Ejecutar como: Administrator
Requisitos: Windows cmd
Tiempo: ~10 segundos
Tarea: Agrega C:\xampp\php al PATH
```

### fix-sqlsrv-extensions.bat
```batch
Ejecutar como: Administrator
Requisitos: Windows cmd
Tiempo: ~10 segundos
Tarea: Limpia php.ini de extensiones redundantes
```

---

## ✅ CHECKLIST DE VERIFICACIÓN

Después de instalar, verificar en orden:

- [ ] `php -v` funciona (PHP 8.2.12)
- [ ] `php -m | findstr sqlsrv` muestra extensiones
- [ ] `php -r "require 'config.php'; echo 'OK';"` no tiene warnings
- [ ] Apache inicia sin errores
- [ ] `https://api.local/test-mssql.php` carga
- [ ] Prueba MSSQL curisec: ✅ EXITOSA
- [ ] Prueba MSSQL viglobal: ✅ EXITOSA
- [ ] Tablas de ambas BD listadas: ✅

---

## 🆘 AYUDA RÁPIDA

| Pregunta | Respuesta |
|----------|-----------|
| ¿Por dónde empiezo? | Lee [INSTALACION_PASO_A_PASO.md](INSTALACION_PASO_A_PASO.md) |
| ¿Cuánto tarda? | 5 minutos en total |
| ¿Necesito admin? | Sí, los scripts requieren permisos elevados |
| ¿Qué si falla PowerShell? | Usa scripts Batch (fallback incluido) |
| ¿Puedo revertir? | Sí, se hace backup de php.ini |
| ¿Necesito descargar algo? | No, todo está listo |

---

## 📈 IMPACTO

**Antes de instalar:**
- ❌ PHP no disponible globalmente
- ⚠️ SQLSRV con warnings
- ❌ Configuración redundante

**Después de instalar:**
- ✅ PHP ejecutable desde cualquier terminal
- ✅ SQLSRV cargado correctamente
- ✅ Conexión MSSQL funcional

---

## 🚀 PRÓXIMOS PASOS DESPUÉS

1. ✅ Instalación PHP + SQLSRV (esta guía)
2. ⏭️ Verificar: `https://api.local/test-mssql.php`
3. ⏭️ Testing de endpoints de API
4. ⏭️ Testing del frontend web

---

## 📞 DOCUMENTACIÓN ADICIONAL

### Relacionado con este setup
- [VERIFICACION_VHOST_API_MSSQL.md](VERIFICACION_VHOST_API_MSSQL.md) - Validación de vhost/API/MSSQL
- [SETUP_VHOST_APACHE.md](SETUP_VHOST_APACHE.md) - Configuración Apache vhost
- [SETUP_SSL_XAMPP.md](SETUP_SSL_XAMPP.md) - Configuración SSL

### Documentación general del proyecto
- API_CONSOLIDATION_SUMMARY.md - Consolidación API
- API_ENDPOINTS_DETAILED.md - Endpoints disponibles

---

## 🎯 OBJETIVO FINAL

```
✅ PHP 8.2.12 ejecutable globalmente
✅ Extensiones SQLSRV cargadas correctamente
✅ Conexión a SQL Server funcional (curisec + viglobal)
✅ API lista para testing de endpoints
✅ Todo configurado y validado
```

---

**Estado**: 🟢 **LISTO PARA INSTALAR**

**Responsable**: Usuario (ejecutar scripts)  
**Tiempo estimado**: 5 minutos  
**Complejidad**: Baja (solo ejecutar scripts automáticos)

**¡Proceder ahora!**

👉 [Empezar con INSTALACION_PASO_A_PASO.md](INSTALACION_PASO_A_PASO.md)

# 📋 Índice de Diagnóstico - Autenticación /facility

**Diagnóstico Completado**: 15 de enero de 2026 10:45 UTC  
**Sistema**: WoundCare Analytics - Facility Portal

---

## 🎯 INICIO RÁPIDO

### ¿Tu login está fallando?

**Opción 1: Interfaz Web (La más fácil)**
```
Accede a: http://tu-servidor/facility/auth-diagnostic.html
- Prueba de conectividad
- Prueba de login
- Ver respuesta del servidor
```

**Opción 2: Comando Terminal**
```bash
bash /var/www/facility/diagnose-login.sh
```

**Opción 3: Script PHP**
```bash
php /var/www/facility/facility-auth-troubleshoot.php test email@example.com password123
```

---

## 📚 DOCUMENTACIÓN

### Para Usuarios Finales ⚙️

| Documento | Propósito | Acceso |
|-----------|-----------|--------|
| **[LOGIN_SOLUTIONS.md](LOGIN_SOLUTIONS.md)** | Soluciones paso a paso para cada error | Leer primero |
| **[AUTHENTICATION_STATUS_REPORT.md](AUTHENTICATION_STATUS_REPORT.md)** | Estado general del sistema | Resumen ejecutivo |

**Pasos más comunes:**
1. Limpiar localStorage (F12 → Application → Clear)
2. Usar navegación incógnito/privada
3. Generar nuevo deviceId

---

### Para Administradores 🔧

| Documento | Propósito | Acción |
|-----------|-----------|--------|
| **[LOGIN_AUTHENTICATION_DIAGNOSTIC.md](LOGIN_AUTHENTICATION_DIAGNOSTIC.md)** | Arquitectura técnica de autenticación | Referencia |
| **[SOLUTION_IMPLEMENTATION.md](SOLUTION_IMPLEMENTATION.md)** | Plan de implementación de mejoras | Plan de trabajo |

**Comandos útiles:**
```bash
# Diagnóstico completo
php facility-auth-troubleshoot.php all

# Ver logs en tiempo real
tail -f /tmp/wounddatacenter-login.log

# Hacer logout forzado
php /var/www/force_logout_facility.php email@example.com
```

---

### Para Desarrolladores 👨‍💻

| Documento | Propósito | Cambios Necesarios |
|-----------|-----------|-------------------|
| **[LOGIN_AUTHENTICATION_DIAGNOSTIC.md](LOGIN_AUTHENTICATION_DIAGNOSTIC.md)** | Flujo actual de autenticación | Referencia técnica |
| **[SOLUTION_IMPLEMENTATION.md](SOLUTION_IMPLEMENTATION.md)** | Mejoras recomendadas | Implementación |

**Archivos a modificar:**
- `/var/www/facility/client/src/pages/login.tsx` - Mejorar manejo de errores
- `/var/www/facility/server/routes.ts` - Agregar endpoint de force-logout

**Implementación sugerida:**
```typescript
// Auto-clear deviceId cuando aparezca reason: 1
if (dataItem?.reason === 1) {
  localStorage.removeItem("deviceId");
  // Reintentar con nuevo deviceId
}
```

---

## 🛠️ HERRAMIENTAS DE DIAGNÓSTICO

### 1. Interfaz Web HTML
**Archivo**: `auth-diagnostic.html`  
**Uso**: Abrir en navegador en `http://tu-servidor/facility/auth-diagnostic.html`  
**Ventaja**: No requiere terminal, interfaz gráfica

```html
✓ Verificar estado del servidor
✓ Probar login interactivo
✓ Ver respuesta del servidor en tiempo real
✓ Información de códigos de error
```

### 2. Script Bash
**Archivo**: `diagnose-login.sh`  
**Uso**: `bash /var/www/facility/diagnose-login.sh`  
**Ventaja**: Automatizado, completo

```bash
✓ Estado del servidor Node.js
✓ Verificar conectividad
✓ Prueba de login interactiva
✓ Análisis de logs
```

### 3. Script PHP
**Archivo**: `facility-auth-troubleshoot.php`  
**Uso**: `php /var/www/facility/facility-auth-troubleshoot.php [opción]`  
**Ventaja**: Lado del servidor

```bash
php facility-auth-troubleshoot.php status
php facility-auth-troubleshoot.php connectivity
php facility-auth-troubleshoot.php logs
php facility-auth-troubleshoot.php test email@example.com password
php facility-auth-troubleshoot.php all
```

---

## ⚠️ CÓDIGOS DE ERROR

| Código | Nombre | Significado | Solución |
|--------|--------|------------|----------|
| `reason: 1` | `0x5461938` | Facility already authenticated | Limpiar localStorage o contactar admin |
| `reason: 3` | `0x3881920` | Email/password failed | Verificar credenciales |
| `status: 1` | N/A | Login exitoso | ✅ Proceder al dashboard |

---

## 📊 ESTADÍSTICAS

**Desde el 10 de enero de 2026:**

```
Intentos de login registrados: 4
  ✅ Exitosos (status: 1): 1
  ❌ Razón 1 (Ya autenticado): 2
  ❌ Razón 3 (Credenciales): 1

Usuarios únicos afectados: 3
  - facility1@wounddatacenter.com
  - test@example.com
  - test@test.com

Tasa de éxito: 25%
```

Ver logs completos:
```bash
tail -100 /tmp/wounddatacenter-login.log
```

---

## 🔄 FLUJO DE AUTENTICACIÓN

```
┌─────────────────────────────────────────┐
│ Usuario en /facility                    │
└────────────┬────────────────────────────┘
             │ Ingresa credenciales
             ▼
┌─────────────────────────────────────────┐
│ Node.js (puerto 5000)                   │
│ POST /api/get                           │
│ - Valida parámetros                     │
│ - Genera/recupera deviceId              │
└────────────┬────────────────────────────┘
             │ Reenvía credenciales + deviceId
             ▼
┌─────────────────────────────────────────┐
│ Backend (cubed-mr.app)                  │
│ - Valida email/password                 │
│ - Verifica deviceId único               │
│ - Genera token si OK                    │
└────────────┬────────────────────────────┘
             │
      ┌──────┴──────┐
      ▼             ▼
   ✅ OK        ❌ ERROR
   status:1     reason:1 o 3
   token:...    msg:...
```

---

## 📞 SOPORTE Y ESCALACIÓN

### Nivel 1: Usuario Final
- Limpiar localStorage
- Usar navegación incógnito
- Ver: [LOGIN_SOLUTIONS.md](LOGIN_SOLUTIONS.md)

### Nivel 2: Administrador
- Ejecutar: `php facility-auth-troubleshoot.php all`
- Revisar logs: `/tmp/wounddatacenter-login.log`
- Hacer force-logout si es necesario

### Nivel 3: Desarrollador
- Revisar: [LOGIN_AUTHENTICATION_DIAGNOSTIC.md](LOGIN_AUTHENTICATION_DIAGNOSTIC.md)
- Implementar mejoras: [SOLUTION_IMPLEMENTATION.md](SOLUTION_IMPLEMENTATION.md)
- Archivos: `/var/www/facility/client/` y `/var/www/facility/server/`

---

## ✅ CHECKLIST DE VERIFICACIÓN

### Para Usuario:
- [ ] Limpié localStorage
- [ ] Usé navegación privada
- [ ] Las credenciales son correctas
- [ ] El email está registrado
- [ ] El servidor está en línea

### Para Administrador:
- [ ] Ejecuté `facility-auth-troubleshoot.php`
- [ ] Revisé los logs
- [ ] Verifiqué la BD de usuarios
- [ ] Hice force-logout si fue necesario
- [ ] Confirmé que el usuario puede ingresar

### Para Desarrollador:
- [ ] Leí la documentación técnica
- [ ] Implementé auto-retry para reason:1
- [ ] Mejoré mensajes de error
- [ ] Pruebé la solución
- [ ] Subí cambios a repositorio

---

## 📁 LISTA DE ARCHIVOS GENERADOS

```
/var/www/facility/
├── LOGIN_AUTHENTICATION_DIAGNOSTIC.md    ← Docs técnicas
├── LOGIN_SOLUTIONS.md                     ← Guía de soluciones
├── AUTHENTICATION_STATUS_REPORT.md        ← Resumen ejecutivo
├── SOLUTION_IMPLEMENTATION.md             ← Plan de implementación
├── DIAGNOSTIC_INDEX.md                    ← Este archivo
├── diagnose-login.sh                      ← Script bash
├── facility-auth-troubleshoot.php         ← Script PHP
├── auth-diagnostic.html                   ← Interfaz web
└── [archivos originales no modificados]
```

---

## 🚀 PRÓXIMOS PASOS

### Esta Semana:
1. [ ] Informar a usuarios sobre soluciones
2. [ ] Implementar auto-retry en cliente
3. [ ] Agregar endpoint de force-logout

### Próximas 2 Semanas:
1. [ ] Mejorar mensajes de error
2. [ ] Implementar "Forgot Password"
3. [ ] Crear panel de administrador

### Próximo Mes:
1. [ ] Two-Factor Authentication
2. [ ] Rate limiting en login
3. [ ] Mejoras de seguridad

---

## 📖 REFERENCIAS RÁPIDAS

**Ver estado rápido:**
```bash
php facility-auth-troubleshoot.php status
```

**Probar login:**
```bash
php facility-auth-troubleshoot.php test email@example.com password
```

**Ver logs:**
```bash
tail -50 /tmp/wounddatacenter-login.log | grep "email@example.com"
```

**Hacer logout forzado:**
```bash
php /var/www/force_logout_facility.php email@example.com
```

---

**Documentación Generada**: 15 de enero de 2026  
**Versión**: 1.0  
**Estado**: ✅ Completa y lista para usar

Para dudas o problemas adicionales, consulta los documentos específicos según tu rol (usuario/admin/dev).

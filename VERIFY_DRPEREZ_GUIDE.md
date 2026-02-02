# Verificar y Forzar Logout: drperez@curisec.com

## 🚀 Formas de Ejecutar

### ✅ OPCIÓN 1: Script Completo (Recomendado)

**Archivo:** `VERIFY_AND_FORCE_LOGOUT_DRPEREZ.sql`

Ejecuta en SQL Server Management Studio:
1. Conecta a: `localhost,4433` | BD: `viglobal`
2. Abre el archivo
3. Presiona F5

**Qué hace:**
- ✅ Verifica si está loggeado
- ✅ Si tiene sesiones, ejecuta force logout automáticamente
- ✅ Muestra resultado antes y después
- ✅ Registra en auditoría

**Salida esperada (SI ESTÁ LOGGEADO):**
```
═══════════════════════════════════════════════════════════
PASO 1: Verificar si drperez@curisec.com está loggeado
═══════════════════════════════════════════════════════════
Usuario encontrado. ID: 5

Estado de sesión:
  • UserTokens activos: 2
  • AuthTokens activos: 1

⚠️  RESULTADO: Usuario ESTÁ loggeado (3 sesiones activas)

═══════════════════════════════════════════════════════════
PASO 2: Ejecutando Force Logout
═══════════════════════════════════════════════════════════

Resultado del Force Logout:
  • Éxito: SÍ ✓
  • Mensaje: Force logout completado para drperez@curisec.com | Tokens invalidados: 2 | Auth tokens invalidados: 1

═══════════════════════════════════════════════════════════
PASO 3: Verificar después del Logout
═══════════════════════════════════════════════════════════

Sesiones activas después del logout:
  • UserTokens activos: 0
  • AuthTokens activos: 0

✅ CONFIRMADO: Logout exitoso - Usuario desconectado completamente

═══════════════════════════════════════════════════════════
HISTORIAL DE FORCE LOGOUTS RECIENTES
═══════════════════════════════════════════════════════════

Timestamp: 2026-02-01 14:30:45.000
Action: FORCE_LOGOUT
Details: Logout automático forzado - Verificación de sesión
```

**Salida esperada (SI NO ESTÁ LOGGEADO):**
```
═══════════════════════════════════════════════════════════
PASO 1: Verificar si drperez@curisec.com está loggeado
═══════════════════════════════════════════════════════════
Usuario encontrado. ID: 5

Estado de sesión:
  • UserTokens activos: 0
  • AuthTokens activos: 0

ℹ️  RESULTADO: Usuario NO está loggeado (sin sesiones activas)

No se requiere force logout.
```

---

### OPCIÓN 2: Query Simple

**Si solo quieres verificar, sin hacer logout:**

```sql
SELECT 
    u.Email,
    COUNT(ut.Id) as TokensActivos,
    MAX(ut.CreatedAt) as UltimoLogin,
    CASE 
        WHEN COUNT(ut.Id) = 0 THEN 'NO LOGGEADO'
        WHEN COUNT(ut.Id) = 1 THEN 'UNA SESIÓN'
        ELSE CAST(COUNT(ut.Id) AS NVARCHAR(10)) + ' SESIONES'
    END as Estado
FROM dbo.Users u
LEFT JOIN dbo.UserTokens ut ON u.Id = ut.UserId AND ut.IsActive = 1
WHERE u.Email = 'drperez@curisec.com'
GROUP BY u.Id, u.Email, u.UserName;
```

**Resultado si está loggeado:**
```
Email: drperez@curisec.com
TokensActivos: 2
UltimoLogin: 2026-02-01 14:00:00
Estado: 2 SESIONES
```

**Resultado si NO está loggeado:**
```
Email: drperez@curisec.com
TokensActivos: 0
UltimoLogin: NULL
Estado: NO LOGGEADO
```

---

### OPCIÓN 3: Verificar Y Logout en Una Query

```sql
IF EXISTS (
    SELECT 1 FROM dbo.UserTokens ut
    INNER JOIN dbo.Users u ON ut.UserId = u.Id
    WHERE u.Email = 'drperez@curisec.com' AND ut.IsActive = 1
)
BEGIN
    PRINT 'Usuario está loggeado. Ejecutando force logout...';
    
    DECLARE @Success BIT, @Message NVARCHAR(MAX);
    EXEC dbo.sp_ForceLogoutUser 
        @Email = 'drperez@curisec.com',
        @Reason = 'Force logout automático',
        @Success = @Success OUTPUT,
        @Message = @Message OUTPUT;
    
    SELECT 'Logout ejecutado' as Accion, @Success as Éxito, @Message as Mensaje;
END
ELSE
BEGIN
    PRINT 'Usuario NO está loggeado. No se requiere logout.';
END
```

---

## 📊 Interpretación de Resultados

### Si TokensActivos = 0
✅ **Usuario NO está loggeado**
- Sin sesiones activas
- No se requiere force logout
- El usuario puede iniciar sesión normalmente

### Si TokensActivos > 0
⚠️ **Usuario ESTÁ loggeado**
- Tiene sesiones activas en uno o más dispositivos
- Se recomienda forzar logout
- Especialmente importante si:
  - Usuario reportó acceso no autorizado
  - Se cambió contraseña
  - Se revocaron permisos

---

## 🔧 Archivos Creados

### `VERIFY_AND_FORCE_LOGOUT_DRPEREZ.sql`
- Script completo y detallado
- Verifica y ejecuta automáticamente
- Muestra paso a paso
- **ESTE ES EL RECOMENDADO**

### `VERIFY_AND_FORCE_LOGOUT_DRPEREZ_ALTERNATIVAS.sql`
- 7 versiones alternativas
- Desde simple hasta avanzado
- Para diferentes necesidades

---

## 🎯 Flujo de Ejecución

```
┌─ Conectar a BD viglobal ─┐
│  localhost,4433          │
│  Usuario: sa             │
│  Contraseña: 3232@lano   │
└────────────┬─────────────┘
             │
             ▼
┌─ VERIFICAR: ¿drperez@curisec.com está loggeado? ─┐
│                                                    │
├─ Si NO hay sesiones activas ─────────────────────┤
│  └─ ✅ LISTO: Usuario no está loggeado           │
│     └─ No se requiere action                      │
│                                                    │
└─ Si SÍ hay sesiones activas ─────────────────────┤
   └─ ⚠️ FORZAR LOGOUT                             │
      ├─ Invalidar UserTokens (IsActive = 0)       │
      ├─ Invalidar AuthTokens (IsActive = 0)       │
      ├─ Registrar en UserTrail (auditoría)        │
      └─ ✅ CONFIRMADO: Logout exitoso             │
```

---

## 💡 Casos Prácticos

### Caso 1: Usuario reportó acceso sospechoso
```sql
-- Ejecutar:
-- VERIFY_AND_FORCE_LOGOUT_DRPEREZ.sql

-- Resultado esperado:
-- ✅ Usuario desconectado de todas las sesiones
-- ✅ Auditoría registrada
-- ✅ Usuario puede volver a iniciar sesión con nueva contraseña
```

### Caso 2: Usuario cambió contraseña
```sql
-- Ejecutar:
-- VERIFY_AND_FORCE_LOGOUT_DRPEREZ.sql

-- Beneficio:
-- ✅ Fuerza que inicie sesión con nueva contraseña
-- ✅ Invalida tokens antiguos
```

### Caso 3: Verificación rutinaria
```sql
-- Ejecutar OPCIÓN 2 (Query Simple)
-- Para ver quién está loggeado sin hacer cambios
```

---

## ✅ Checklist

- [ ] Conectar a BD `viglobal` en `localhost,4433`
- [ ] Usuario: `sa` | Contraseña: `3232@lano`
- [ ] Abrir archivo `VERIFY_AND_FORCE_LOGOUT_DRPEREZ.sql`
- [ ] Presionar F5 (Execute)
- [ ] Revisar resultados
- [ ] Si vuelve a iniciarse sesión, repetir process si es necesario

---

## 📝 Notas Importantes

1. **El script es seguro** - Solo marca como inactivos, no elimina datos
2. **Es reversible** - Si necesitas reactivar, puedes cambiar `IsActive = 1`
3. **Registra auditoría** - Se guarda en `UserTrail` quién, cuándo y por qué
4. **Es automático** - No requiere confirmación, solo ejecuta

---

## 🆘 Troubleshooting

| Problema | Solución |
|----------|----------|
| "Connection failed" | Verificar credenciales: sa / 3232@lano |
| "Invalid object name" | Verificar que estás en BD viglobal |
| "No rows affected" | Usuario no encontrado o sin sesiones |
| Usuario sigue loggeado | Verificar tabla UserTokens directamente |

---

## 📞 Próximos Pasos

1. Ejecutar: `VERIFY_AND_FORCE_LOGOUT_DRPEREZ.sql`
2. Revisar resultados
3. Si se ejecutó logout, usuario debe volver a iniciar sesión
4. Notificar al usuario (si es necesario)


# 🔍 Verificar Facilities en remoteWoundcareDB (cubed-mr.app)

## Backend Remoto: https://cubed-mr.app

El `remoteWoundcareDB` es una base de datos SQL Server en `https://cubed-mr.app` que contiene:
- **Facilities** (lista de centros/instalaciones)
- **Users/Credentials** (credenciales de acceso)
- **Wound reports** (reportes de heridas)

---

## ¿Cómo verificar Facilities autenticados?

### Opción 1: Test Manual con curl

```bash
# 1. Intentar loguear con credenciales válidas
curl -X POST https://cubed-mr.app/api/get \
  -H "Content-Type: application/json" \
  -d '{
    "entity": "TryLoginFacilities",
    "email": "facility1@example.com",
    "password": "12345678",
    "deviceId": "test-device"
  }' | jq '.'

# Respuesta esperada:
# {
#   "status": 1,
#   "data": [
#     {
#       "facilityId": "1",
#       "facilityName": "Main Hospital",
#       "token": "jwt-token-here",
#       "status": 1,
#       ...
#     }
#   ]
# }
```

### Opción 2: Desde tu servidor (proxy local)

```bash
# Si el proxy está corriendo en localhost:5000
curl -X POST http://localhost:5000/api/get \
  -H "Content-Type: application/json" \
  -d '{
    "action": "TryLoginFacilities",
    "email": "facility1@example.com",
    "password": "12345678",
    "deviceId": "test-device"
  }' | jq '.data[0]'
```

---

## ¿Qué Facilities Existen?

Para saber qué facilities existen en la BD remota, necesitas:

### Datos Conocidos (del código):
```
facility_id: 1  → Usado en ejemplos
facility_id: 5  → Usado en ejemplos
```

### Datos Esperados (de logs anteriores):
```
facilityId: "1"   → Main facility
facilityId: "5"   → Secondary facility
```

### Credenciales Válidas Necesarias:
Para verificar facilities específicos, necesitas credenciales de:
- Email válido (facility email)
- Password correcta
- Account activo en BD remota

---

## Query Directo a Base de Datos (Requiere Acceso SQL Server)

Si tienes acceso directo a la BD SQL Server de cubed-mr.app:

```sql
-- Ver todas las facilities
SELECT * FROM Facilities;

-- Ver facilities activas
SELECT * FROM Facilities WHERE isActive = 1;

-- Ver usuarios por facility
SELECT f.FacilityId, f.FacilityName, u.Email, u.IsActive
FROM Facilities f
LEFT JOIN Users u ON f.FacilityId = u.FacilityId
WHERE f.IsActive = 1;
```

---

## Verificar Autenticación en Producción

### Paso 1: Conectar a tu servidor remoto

```bash
ssh user@your-server-ip
cd /var/www/wounddatacenter
```

### Paso 2: Ver logs de autenticación

```bash
# Logs recientes
tail -100 /var/log/pm2/wounddatacenter-error.log | grep -i "auth\|login\|facility"

# O con PM2
pm2 logs wounddatacenter --lines 50 | grep -i "auth\|login"
```

### Paso 3: Test POST /api/get

```bash
# Test contra proxy local (en servidor remoto)
curl -X POST http://localhost:5000/api/get \
  -H "Content-Type: application/json" \
  -d '{
    "action": "TryLoginFacilities",
    "email": "facility1@example.com",
    "password": "12345678",
    "deviceId": "test-123"
  }' 2>&1 | jq '.'
```

---

## Checklist: Verificar Facilities Autenticados

- [ ] ¿Existe usuario en remoteWoundcareDB (cubed-mr.app)?
- [ ] ¿La contraseña es correcta?
- [ ] ¿El usuario está activo (isActive = 1)?
- [ ] ¿El usuario tiene facilities asignadas?
- [ ] ¿El facility está activo?
- [ ] ¿El facility tiene permisos para acceder?

---

## Troubleshooting

### Error: "Invalid credentials"
```
Causa: Email o password incorrecto
Solución: Verificar en BD remota que el usuario existe y contraseña es correcta
```

### Error: "User not found"
```
Causa: Email no existe en BD remota
Solución: Crear usuario en BD remota (requiere acceso SQL Server)
```

### Error: "Facility not found"
```
Causa: El usuario no tiene facilities asignadas
Solución: Asignar facilities al usuario en BD remota
```

### Error: "User inactive"
```
Causa: La cuenta del usuario está desactivada
Solución: Activar usuario en BD remota (isActive = 1)
```

---

## ¿Necesitas hacer algo específico?

1. **Listar todos los facilities** → Necesita acceso SQL Server a cubed-mr.app
2. **Probar credenciales específicas** → Proporciona email y contraseña
3. **Ver qué facilities puede acceder un usuario** → Loguea con ese email/password
4. **Crear nuevo usuario/facility** → Requiere acceso SQL Server
5. **Investigar por qué falla la autenticación** → Ver logs del servidor

¿Cuál es lo que necesitas verificar? 🔍

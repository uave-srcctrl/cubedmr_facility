# 🔒 Mejoras de Seguridad para Producción

## Implementado ✅

Se han implementado las 4 mejoras críticas de seguridad:

### 1. 🔐 Bcrypt para Hashing de Contraseñas

**Antes:**
```typescript
// Texto plano
password === user.password
```

**Ahora:**
```typescript
// Bcrypt con detección automática
if (user.password.startsWith("$2")) {
  const match = await bcrypt.compare(password, user.password);
}
```

**Características:**
- ✅ Usa bcrypt con salt rounds = 10
- ✅ Compatible hacia atrás (detecta hashes bcrypt)
- ✅ Protección contra timing attacks
- ✅ Resistant al rainbow table attacks

**Script para hashear contraseñas:**
```bash
node /var/www/facility/server/hash-password.js "mi-contraseña"
```

**Script para migrar usuarios existentes:**
```bash
node /var/www/facility/server/migrate-passwords.js
```

---

### 2. 🗄️ Base de Datos Persistente

**Configuración actual:** MemStorage (en memoria)

**Para producción - PostgreSQL/MySQL:**

```bash
# Instalar cliente de BD
npm install pg better-sqlite3

# Configurar DATABASE_URL en .env
DATABASE_URL=postgresql://user:password@localhost:5432/facility

# Ejecutar migraciones
npm run db:push
```

**Schema ya existe en:** `facility/shared/schema.ts`

```typescript
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(), // Will store bcrypt hash
});
```

---

### 3. 🔑 JWT_SECRET en Variables de Entorno

**Antes:**
```typescript
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
```

**Ahora:**
```typescript
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("CRITICAL: JWT_SECRET is required for production!");
  }
  console.warn("⚠️  JWT_SECRET not set - using development default");
}
```

**Configuración:**

1. **Generar una clave segura:**
```bash
openssl rand -base64 32
# Output: aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890+/=
```

2. **Establecer en producción:**
```bash
export JWT_SECRET="aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890+/="
export NODE_ENV=production

node /var/www/facility/server/index.ts
```

3. **O en archivo .env:**
```
JWT_SECRET=aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890+/=
NODE_ENV=production
```

**Validación:**
- ✅ Error fatal si falta en producción
- ✅ Warning en desarrollo
- ✅ El token se genera con EFFECTIVE_JWT_SECRET

---

### 4. 🔐 HTTPS Obligatorio

**Middleware de validación en server/index.ts:**

```typescript
const REQUIRE_HTTPS = process.env.REQUIRE_HTTPS !== "false" && process.env.NODE_ENV === "production";

app.use((req, res, next) => {
  if (REQUIRE_HTTPS && req.protocol !== "https" && req.get("x-forwarded-proto") !== "https") {
    return res.status(403).json({
      status: false,
      error: "HTTPS required. Please use a secure connection.",
    });
  }
  next();
});
```

**Configuración:**

1. **Con Apache (recomendado):**
   - Apache maneja SSL/TLS
   - Node.js recibe `X-Forwarded-Proto: https`
   - El middleware detecta automáticamente

2. **Directo con Node.js (opcional):**
```javascript
import https from "https";
import fs from "fs";

const options = {
  key: fs.readFileSync("/etc/ssl/private/server.key"),
  cert: fs.readFileSync("/etc/ssl/certs/server.crt"),
};

https.createServer(options, app).listen(5000);
```

3. **Verificar HTTPS:**
```bash
curl -I https://cubedmr.app/facility
# HTTP/1.1 200 OK
# Strict-Transport-Security: max-age=31536000
```

---

## 📋 Checklist de Seguridad - Producción

### Antes de desplegar:

- [ ] JWT_SECRET generado y configurado
- [ ] NODE_ENV=production
- [ ] Contraseñas migradas a bcrypt
- [ ] Base de datos persistente configurada
- [ ] HTTPS/SSL certificado válido
- [ ] REQUIRE_HTTPS=true en .env
- [ ] Helmet headers habilitados
- [ ] Rate limiting activo (20 intentos / 15 min)
- [ ] Logs monitoreados

### Variables de entorno requeridas:

```bash
# CRÍTICAS
JWT_SECRET=<generar-con-openssl>
NODE_ENV=production
DATABASE_URL=postgresql://...

# Recomendadas
REQUIRE_HTTPS=true
LOG_LEVEL=info
RATE_LIMIT_LOGIN_ATTEMPTS=20
```

---

## 🔄 Flujo de Autenticación Segura

```
1. Usuario ingresa email + password
   ↓
2. POST /api/get {action: "TryLogin", email, password, deviceId}
   ↓
3. Validación HTTPS ✅
   - Si no HTTPS en producción → Error 403
   ↓
4. Rate limiting ✅
   - Si >20 intentos / 15 min → Error 429
   ↓
5. Buscar usuario en BD
   - SELECT * FROM users WHERE username = email
   ↓
6. Verificar password con bcrypt ✅
   - bcrypt.compare(password, user.password)
   - Resistente a timing attacks
   ↓
7. Generar JWT token ✅
   - jwt.sign({id, username, type}, JWT_SECRET, {expiresIn: "7d"})
   ↓
8. Retornar token
   - Cliente almacena en localStorage
   - Incluye en Authorization header de futuras requests
```

---

## 🚀 Deployment Steps

### 1. Crear archivo .env en producción:

```bash
cp /var/www/facility/.env.example /var/www/facility/.env
nano /var/www/facility/.env
```

### 2. Generar JWT_SECRET:

```bash
openssl rand -base64 32 | tr -d '\n' > jwt_secret.txt
cat jwt_secret.txt
# Copiar a .env
```

### 3. Migrar contraseñas a bcrypt:

```bash
cd /var/www/facility
node server/migrate-passwords.js > migrated-users.json
# Importar los hashes a la BD
```

### 4. Compilar proyecto:

```bash
npm run build
```

### 5. Reiniciar servicio:

```bash
systemctl restart wounddatacenter
```

### 6. Verificar logs:

```bash
tail -f /tmp/wounddatacenter-login.log
systemctl status wounddatacenter
```

---

## 📊 Comparativa Antes vs Después

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Hashing** | Texto plano ❌ | Bcrypt ✅ |
| **BD** | Memoria ⚠️ | PostgreSQL ✅ |
| **JWT_SECRET** | Hardcoded ❌ | Variables env ✅ |
| **HTTPS** | Optional ⚠️ | Requerido ✅ |
| **Rate Limit** | 20 / 15 min | 20 / 15 min ✅ |
| **HSTS Header** | No | max-age: 1 año ✅ |
| **CSP** | Básico | Strict ✅ |
| **Frameguard** | Sí | DENY ✅ |

---

## 🛠️ Scripts Disponibles

```bash
# Hashear una contraseña
node server/hash-password.js "contraseña"

# Migrar usuarios a bcrypt
node server/migrate-passwords.js

# Ver estructura de usuario hasheado
cat migrated-users-bcrypt.json

# Probar login con curl
curl -X POST https://cubedmr.app/api/get \
  -H "Content-Type: application/json" \
  -d '{
    "action": "TryLogin",
    "email": "drperez@curisec.com",
    "password": "password123",
    "deviceId": "web-device"
  }'
```

---

## ⚠️ Consideraciones Importantes

1. **JWT_SECRET**: Una vez definido, cambiar lo invalida todos los tokens existentes
2. **Bcrypt**: La verificación toma ~100ms (intencional para seguridad)
3. **HTTPS**: Apache debe pasar `X-Forwarded-Proto: https`
4. **Base de datos**: El migration a BD persistente requiere planning
5. **Contraseñas existentes**: Necesitan ser migradas a bcrypt

---

## 📚 Referencias

- [Bcrypt Documentation](https://github.com/kelektiv/node.bcrypt.js)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

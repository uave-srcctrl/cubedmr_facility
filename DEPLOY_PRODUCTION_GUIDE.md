# Guía de Despliegue a Producción con HTTPS

## Paso 1: Obtener Certificados Let's Encrypt
```bash
# Instalar Certbot (Ubuntu/Debian)
sudo apt-get install certbot python3-certbot-apache

# Generar certificados para tu dominio
sudo certbot certonly --standalone -d cubed-mr.app -d www.cubed-mr.app
```

## Paso 2: Actualizar Configuración

### 2.1 Reemplazar httpd-vhosts.conf
```bash
sudo cp apache-production.conf /etc/apache2/sites-available/wounddatacenter.conf
sudo a2ensite wounddatacenter
sudo a2dissite 000-default
```

### 2.2 Habilitar módulos Apache
```bash
sudo a2enmod ssl
sudo a2enmod rewrite
sudo a2enmod headers
sudo apache2ctl configtest  # Verificar sintaxis
sudo systemctl restart apache2
```

### 2.3 Copiar variables de ambiente
```bash
cp .env.production .env
# Editar .env con valores reales de producción
nano .env
```

## Paso 3: Instalar y Ejecutar Express

### 3.1 Instalar dependencias
```bash
npm install
npm run build  # Compilar TypeScript a JavaScript
```

### 3.2 Ejecutar con PM2
```bash
npm install -g pm2
pm2 start npm --name wounddatacenter -- start
pm2 save
pm2 startup
```

## Paso 4: Verificar Stack Completo

### 4.1 Verificar Apache
```bash
curl -I https://cubed-mr.app/get
# Debe retornar 200 OK, no 301 redirect
```

### 4.2 Verificar Express
```bash
curl -X POST http://localhost:5000/api/get \
  -H "Content-Type: application/json" \
  -d '{"entity":"TryLogin","email":"test@test.com"}'
```

### 4.3 Verificar conectividad Express → Apache
```bash
curl -X GET http://localhost:5000/api/diagnose/backend-connectivity
```

## Paso 5: Renovación Automática de Certificados

### 5.1 Configurar renovación automática
```bash
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### 5.2 Verificar renovación
```bash
sudo certbot renew --dry-run
```

## Variables de Ambiente por Entorno

### Desarrollo (.env.local)
```
NODE_ENV=development
BACKEND_API_URL=http://127.0.0.1/get
```

### Producción (.env)
```
NODE_ENV=production
BACKEND_API_URL=https://cubed-mr.app/get
```

## Cambios Automáticos que ocurren en Producción:

1. **fetchWithTimeout**: Habilitará validación de certificados (`rejectUnauthorized: true`)
2. **BACKEND_API_URL**: Cambiará a HTTPS automáticamente
3. **Express**: Confiará en certificados válidos de Let's Encrypt
4. **Apache**: Redirigirá HTTP → HTTPS y usará certificados reales

## Monitoreo

```bash
# Ver logs de Express
pm2 logs wounddatacenter

# Ver logs de Apache
sudo tail -f /var/log/apache2/api-error.log
sudo tail -f /var/log/apache2/api-access.log

# Monitorear certificados (expiración)
sudo certbot certificates
```

## Rollback si hay problemas

```bash
# Parar Express
pm2 stop wounddatacenter

# Revertir Apache a HTTPS (sin certificado válido)
sudo cp apache-dev.conf /etc/apache2/sites-available/wounddatacenter.conf

# Reiniciar
sudo systemctl restart apache2
pm2 start wounddatacenter
```

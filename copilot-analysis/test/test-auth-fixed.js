import crypto from 'crypto';
import http from 'http';

// Parámetros
const email = 'drperez@curisec.com';
const passwd = '12345678';
const deviceId = 'web-test12345';  // Simulando un deviceId web generado

console.log('═══════════════════════════════════════════════════════════');
console.log('🧪 TEST DE AUTENTICACIÓN CON HASHING CORRECTO');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('📋 Parámetros:');
console.log(`  Email: ${email}`);
console.log(`  Passwd: ${passwd}`);
console.log(`  DeviceId: ${deviceId}\n`);

// Paso 1: SHA256(password)
console.log('📍 PASO 1: Primer SHA256 (password)');
const firstHash = crypto.createHash('sha256').update(passwd).digest('hex');
console.log(`  SHA256("${passwd}") = ${firstHash}\n`);

// Paso 2: Crear salt
console.log('📍 PASO 2: Crear SALT');
const salt = `${email}38457487${deviceId}`;
console.log(`  Salt = "${email}" + "38457487" + "${deviceId}"`);
console.log(`  Salt = "${salt}"\n`);

// Paso 3: SHA256(salt)
console.log('📍 PASO 3: Segundo SHA256 (salt)');
const hashedPassword = crypto.createHash('sha256').update(salt).digest('hex');
console.log(`  SHA256(salt) = ${hashedPassword}\n`);

// Payload a enviar
const payload = JSON.stringify({
  action: 'TryLogin',
  email: email,
  password: hashedPassword,
  deviceId: deviceId,
  name: email
});

console.log('═══════════════════════════════════════════════════════════');
console.log('🚀 ENVIANDO AL SERVIDOR LOCAL\n');

console.log('📤 Payload:');
console.log(JSON.stringify({
  action: 'TryLogin',
  email: email,
  password: hashedPassword,
  deviceId: deviceId,
  name: email
}, null, 2));
console.log('');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/get',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': payload.length
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('📥 Respuesta del servidor:\n');
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed, null, 2));
      
      console.log('\n═══════════════════════════════════════════════════════════');
      if (parsed.data && parsed.data[0]) {
        const result = parsed.data[0];
        if (result.status === 1 || result.status === '1') {
          console.log('✅ ✅ ✅ AUTENTICACIÓN EXITOSA ✅ ✅ ✅');
          console.log(`   Status: ${result.status}`);
          console.log(`   Token: ${result.token}`);
          console.log(`   Entity: ${result.entity}`);
          console.log(`   EntityName: ${result.entityName}`);
          if (result.facilities) {
            console.log(`   Facilities: ${JSON.stringify(result.facilities)}`);
          }
        } else {
          console.log('❌ AUTENTICACIÓN FALLIDA');
          console.log(`   Status: ${result.status}`);
          console.log(`   Reason: ${result.reason}`);
          console.log(`   Mensaje: ${result.msg}`);
          console.log(`\n💡 Hash enviado: ${hashedPassword}`);
          console.log(`   Si el hash es incorrecto, significa que:`);
          console.log(`   - La contraseña "12345678" NO es la correcta, O`);
          console.log(`   - El deviceId es diferente al de la BD`);
        }
      } else {
        console.log('⚠️  Respuesta inesperada:', parsed);
      }
    } catch (e) {
      console.log('⚠️  Error al parsear:', e.message);
      console.log('Raw:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error de conexión:', error.message);
  console.log('\n💡 Asegúrate de que:');
  console.log('   1. El servidor Express está corriendo en localhost:5000');
  console.log('   2. npm start fue ejecutado');
});

req.write(payload);
req.end();

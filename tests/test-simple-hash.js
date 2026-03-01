import crypto from 'crypto';
import http from 'http';

const email = 'drperez@curisec.com';
const passwd = '12345678';

console.log('═══════════════════════════════════════════════════════════');
console.log('🧪 TEST SOLO SHA256(PASSWORD) - SIN SALT');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('📋 Parámetros:');
console.log(`  Email: ${email}`);
console.log(`  Passwd: ${passwd}\n`);

// Solo SHA256(password)
console.log('📍 Hash: SHA256(password)');
const hashedPassword = crypto.createHash('sha256').update(passwd).digest('hex');
console.log(`  SHA256("${passwd}") = ${hashedPassword}\n`);

// Payload a enviar
const payload = JSON.stringify({
  action: 'TryLogin',
  email: email,
  password: hashedPassword,
  deviceId: 'web-test',
  name: email
});

console.log('═══════════════════════════════════════════════════════════');
console.log('🚀 ENVIANDO AL SERVIDOR LOCAL\n');

console.log('📤 Payload:');
console.log(JSON.stringify({
  action: 'TryLogin',
  email: email,
  password: hashedPassword,
  deviceId: 'web-test',
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
        } else {
          console.log('❌ AUTENTICACIÓN FALLIDA');
          console.log(`   Status: ${result.status}`);
          console.log(`   Reason: ${result.reason}`);
          console.log(`   Mensaje: ${result.msg}`);
          console.log(`\n💡 Hash enviado: ${hashedPassword}`);
        }
      }
    } catch (e) {
      console.log('⚠️  Error al parsear:', e.message);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
});

req.write(payload);
req.end();

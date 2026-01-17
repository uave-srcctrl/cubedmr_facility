import crypto from 'crypto';
import http from 'http';

const email = 'drperez@curisec.com';
const passwd = '12345678';
const deviceId = 'web-test12345';

console.log('═══════════════════════════════════════════════════════════');
console.log('🧪 SIMULACIÓN EXACTA DEL FLUJO DART/REACT');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('📋 Parámetros:');
console.log(`  Email: ${email}`);
console.log(`  Passwd: ${passwd}`);
console.log(`  DeviceId: ${deviceId}\n`);

// PASO 1: authenticate() en Dart/React
console.log('📍 PASO 1: authenticate() calcula SHA256(password)');
const passwordHash = crypto.createHash('sha256').update(passwd).digest('hex');
console.log(`  password = SHA256("${passwd}")`);
console.log(`  password = ${passwordHash}\n`);

// PASO 2: getData() en Dart calcula el salt
console.log('📍 PASO 2: getData() construye salt y calcula SHA256');
const salt = `${email}38457487${deviceId}`;
console.log(`  salt = "${email}" + "38457487" + "${deviceId}"`);
console.log(`  salt = "${salt}"\n`);

const encountertrackid = crypto.createHash('sha256').update(salt).digest('hex');
console.log(`📍 PASO 3: getData() calcula encountertrackid`);
console.log(`  encountertrackid = SHA256(salt)`);
console.log(`  encountertrackid = ${encountertrackid}\n`);

// PAYLOAD que se envía
const payload = JSON.stringify({
  action: 'TryLogin',
  email: email,
  password: passwordHash,
  deviceId: deviceId,
  name: email,
  encountertrackid: encountertrackid,
});

console.log('═══════════════════════════════════════════════════════════');
console.log('🚀 ENVIANDO AL SERVIDOR LOCAL\n');

console.log('📤 Payload (como lo envía Flutter/React):');
console.log(JSON.stringify({
  action: 'TryLogin',
  email: email,
  password: passwordHash,
  deviceId: deviceId,
  name: email,
  encountertrackid: encountertrackid,
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
          console.log(`   Token: ${result.token}`);
          console.log(`   Entity: ${result.entity}`);
        } else {
          console.log('❌ AUTENTICACIÓN FALLIDA');
          console.log(`   Reason: ${result.reason}`);
          console.log(`   Mensaje: ${result.msg}`);
          console.log('\n💡 Hashes enviados:');
          console.log(`   password: ${passwordHash}`);
          console.log(`   encountertrackid: ${encountertrackid}`);
        }
      }
    } catch (e) {
      console.log('Error:', e.message);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
});

req.write(payload);
req.end();

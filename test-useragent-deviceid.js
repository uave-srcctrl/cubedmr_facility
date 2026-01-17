import crypto from 'crypto';
import http from 'http';

// Parámetros
const email = 'drperez@curisec.com';
const passwd = '12345678';
const deviceId = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/114.0';

console.log('═══════════════════════════════════════════════════════════');
console.log('🔍 PROBANDO CON USER-AGENT COMO DEVICEID');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('📋 Parámetros:');
console.log(`  Email: ${email}`);
console.log(`  Passwd: ${passwd}`);
console.log(`  DeviceId: ${deviceId}\n`);

// Calcular hash
const firstHash = crypto.createHash('sha256').update(passwd).digest('hex');
console.log(`Step 1 - SHA256(passwd): ${firstHash}\n`);

const salt = `${email}38457487${deviceId}`;
console.log(`Step 2 - Salt formado:`);
console.log(`  "${email}" + "38457487" + "${deviceId}"\n`);

const finalHash = crypto.createHash('sha256').update(salt).digest('hex');
console.log(`Step 3 - SHA256(salt final):`);
console.log(`  ${finalHash}\n`);

const payload = JSON.stringify({
  entity: 'TryLogin',
  email: email,
  password: finalHash,
  deviceId: deviceId
});

console.log('🚀 Enviando al servidor...\n');

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
    console.log('📥 Respuesta del servidor:');
    try {
      const parsed = JSON.parse(data);
      
      console.log('\n═══════════════════════════════════════════════════════════');
      if (parsed.data && parsed.data[0]) {
        const result = parsed.data[0];
        if (result.status === 1 || result.status === '1') {
          console.log('✅ ✅ ✅ AUTENTICACIÓN EXITOSA ✅ ✅ ✅');
          console.log(`   Status: ${result.status}`);
          console.log(`   Token: ${result.token}`);
          console.log(`   Email: ${result.email}`);
          console.log(`\n🎯 Hash correcto encontrado:`);
          console.log(`   ${finalHash}`);
          console.log(`\n📱 DeviceId correcto:`);
          console.log(`   ${deviceId}`);
        } else {
          console.log('❌ AUTENTICACIÓN FALLIDA');
          console.log(`   Status: ${result.status}`);
          console.log(`   Reason: ${result.reason}`);
          console.log(`   Mensaje: ${result.msg}`);
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
});

req.write(payload);
req.end();

import crypto from 'crypto';
import http from 'http';

const email = 'drperez@curisec.com';
const passwd = '12345678';

// Diferentes deviceIds a probar
const deviceIds = [
  '',
  'web-client',
  'web',
  'web-app',
  'woundcare-web',
  'localhost',
  'browser',
  'rgkrghkhbgrjw', // El que estaba hardcodeado en Flutter
];

console.log('═══════════════════════════════════════════════════════════');
console.log('🔍 PROBANDO CON MÚLTIPLES DEVICEIDS (TryLogin + 12345678)');
console.log('═══════════════════════════════════════════════════════════\n');

let successCount = 0;
let tested = 0;

function hashPassword(email, passwd, deviceId) {
  const firstHash = crypto.createHash('sha256').update(passwd).digest('hex');
  const salt = `${email}38457487${deviceId}`;
  const hashedPassword = crypto.createHash('sha256').update(salt).digest('hex');
  return hashedPassword;
}

function testDeviceId(deviceId, index) {
  return new Promise((resolve) => {
    tested++;
    const hashedPassword = hashPassword(email, passwd, deviceId);
    
    const payload = JSON.stringify({
      action: 'TryLogin',
      email: email,
      password: hashedPassword,
      deviceId: deviceId,
      name: email
    });

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
        try {
          const parsed = JSON.parse(data);
          if (parsed.data && parsed.data[0]) {
            const result = parsed.data[0];
            if (result.status === 1 || result.status === '1') {
              successCount++;
              console.log(`✅ [${index}] ÉXITO con deviceId: "${deviceId}"`);
              console.log(`   Hash: ${hashedPassword}`);
              console.log(`   Token: ${result.token}\n`);
            }
          }
        } catch (e) {}
        resolve();
      });
    });

    req.on('error', () => {
      resolve();
    });

    req.write(payload);
    req.end();
  });
}

async function main() {
  for (let i = 0; i < deviceIds.length; i++) {
    await testDeviceId(deviceIds[i], i);
    // Pequeña pausa entre requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📊 Resultados: ${successCount}/${tested} deviceIds válidos\n`);
  
  if (successCount === 0) {
    console.log('❌ Ningún deviceId funcionó\n');
    console.log('💡 Conclusiones:');
    console.log('   1. La contraseña "12345678" NO es válida para este usuario');
    console.log('   2. O necesitas el deviceId exacto que se guardó en la BD');
    console.log('   3. Contacta al administrador para:');
    console.log('      - Confirmar la contraseña correcta');
    console.log('      - O resetear la contraseña');
    console.log('      - O proporcionar el deviceId correcto');
  }
}

main().catch(console.error);

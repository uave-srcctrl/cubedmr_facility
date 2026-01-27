import crypto from 'crypto';
import http from 'http';

// Parámetros base
const email = 'drperez@curisec.com';
const passwd = '12345678';

console.log('═══════════════════════════════════════════════════════════');
console.log('🔍 PROBANDO MÚLTIPLES DEVICEID POSIBLES');
console.log('═══════════════════════════════════════════════════════════\n');

// Lista de deviceIds posibles
const possibleDeviceIds = [
  'rgkrghkhbgrjw',                                      // Hardcodeado en provider.dart
  '',                                                    // Vacío
  'unknown',                                             // Genérico
  'test-device',                                         // Test
  '12345678901234567890123456789012',                   // UUID-like format
  crypto.randomUUID(),                                   // UUID random
];

// Agregar UUIDs más realistas
for (let i = 0; i < 5; i++) {
  possibleDeviceIds.push(crypto.randomUUID());
}

console.log(`📋 Probando ${possibleDeviceIds.length} deviceIds posibles:\n`);

let successCount = 0;
let tested = 0;

function testDeviceId(deviceId, index) {
  return new Promise((resolve) => {
    tested++;
    
    // Calcular hash
    const firstHash = crypto.createHash('sha256').update(passwd).digest('hex');
    const salt = `${email}38457487${deviceId}`;
    const finalHash = crypto.createHash('sha256').update(salt).digest('hex');

    const payload = JSON.stringify({
      entity: 'TryLogin',
      email: email,
      password: finalHash,
      deviceId: deviceId
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
            const status = result.status === 1 || result.status === '1';
            
            if (status) {
              successCount++;
              console.log(`✅ [${index}] ÉXITO con deviceId: "${deviceId}"`);
              console.log(`   Hash: ${finalHash}`);
              console.log(`   Token: ${result.token}\n`);
            } else {
              // No mostrar fallos para reducir output
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

// Ejecutar pruebas secuencialmente
async function runTests() {
  for (let i = 0; i < possibleDeviceIds.length; i++) {
    await testDeviceId(possibleDeviceIds[i], i);
  }
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📊 Resultados: ${successCount}/${tested} deviceIds válidos`);
  
  if (successCount === 0) {
    console.log('\n💡 Si ningún deviceId funciona:');
    console.log('   1. El usuario drperez@curisec.com NO existe');
    console.log('   2. O la contraseña es diferente a "12345678"');
    console.log('   3. O el mecanismo de hash es diferente');
  }
}

runTests();

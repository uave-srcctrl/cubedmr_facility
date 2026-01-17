import crypto from 'crypto';
import http from 'http';
import https from 'https';

// Parámetros del usuario
const email = 'drperez@curisec.com';
const passwd = '12345678';
const deviceId = 'rgkrghkhbgrjw';

console.log('═══════════════════════════════════════════════════════════');
console.log('🔐 VERIFICACIÓN CON HASH CORRECTO (DOBLE SHA256)');
console.log('═══════════════════════════════════════════════════════════\n');

// Calcular el hash correcto
const firstHash = crypto.createHash('sha256').update(passwd).digest('hex');
const salt = `${email}38457487${deviceId}`;
const finalHash = crypto.createHash('sha256').update(salt).digest('hex');

console.log('📋 Parámetros:');
console.log(`  Email: ${email}`);
console.log(`  Passwd: ${passwd}`);
console.log(`  DeviceId: ${deviceId}`);
console.log(`  Hash Final: ${finalHash}\n`);

const payload = JSON.stringify({
  entity: 'TryLogin',
  email: email,
  password: finalHash,
  deviceId: deviceId
});

// Intentar con servidor local primero
console.log('🔄 Intentando conexión local (localhost:5000)...\n');

const localOptions = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/get',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': payload.length
  }
};

const localReq = http.request(localOptions, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('✅ Respuesta de localhost:5000');
    console.log('Status:', res.statusCode);
    console.log('Datos:\n' + data + '\n');
    processResponse(data);
  });
});

localReq.on('error', (error) => {
  console.log('❌ Servidor local no disponible\n');
  console.log('🔄 Intentando conexión remota (cubed-mr.app)...\n');
  
  // Intentar con servidor remoto
  const remoteOptions = {
    hostname: 'cubed-mr.app',
    port: 443,
    path: '/api/get',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': payload.length
    }
  };

  const remoteReq = https.request(remoteOptions, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log('✅ Respuesta de cubed-mr.app');
      console.log('Status:', res.statusCode);
      console.log('Datos:\n' + data + '\n');
      processResponse(data);
    });
  });

  remoteReq.on('error', (err) => {
    console.error('❌ Error:', err.message);
  });

  remoteReq.write(payload);
  remoteReq.end();
});

localReq.write(payload);
localReq.end();

function processResponse(data) {
  try {
    const parsed = JSON.parse(data);
    
    console.log('═══════════════════════════════════════════════════════════');
    if (parsed.data && parsed.data[0]) {
      const result = parsed.data[0];
      if (result.status === 1 || result.status === '1') {
        console.log('✅ ✅ ✅ AUTENTICACIÓN EXITOSA ✅ ✅ ✅');
        console.log(`   Token: ${result.token}`);
        console.log(`   Email: ${result.email}`);
        console.log(`\n💡 El hash correcto es:`);
        console.log(`   ${finalHash}`);
      } else {
        console.log('❌ AUTENTICACIÓN FALLIDA');
        console.log(`   Status: ${result.status}`);
        console.log(`   Reason: ${result.reason}`);
        console.log(`   Mensaje: ${result.msg}`);
        console.log(`\n⚠️  El hash NO coincide con el de la BD:`);
        console.log(`   Hash enviado: ${finalHash}`);
      }
    } else {
      console.log('⚠️  Respuesta inesperada:', parsed);
    }
  } catch (e) {
    console.log('⚠️  Error al parsear:', e.message);
  }
}

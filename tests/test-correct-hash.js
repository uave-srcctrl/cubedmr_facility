import crypto from 'crypto';
import https from 'https';

// Parámetros del usuario
const email = 'drperez@curisec.com';
const passwd = '12345678';
const deviceId = 'rgkrghkhbgrjw'; // Hardcodeado en provider.dart línea 120

console.log('═══════════════════════════════════════════════════════════');
console.log('🔐 TEST CON DOBLE HASHING (EMAIL + DEVICEID + SALT)');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('📋 Parámetros:');
console.log(`  Email: ${email}`);
console.log(`  Passwd: ${passwd}`);
console.log(`  DeviceId: ${deviceId}\n`);

// Paso 1: Primera hash (solo passwd)
console.log('📍 PASO 1: Primer SHA256 (solo password)');
const firstHash = crypto.createHash('sha256').update(passwd).digest('hex');
console.log(`  SHA256("${passwd}") = ${firstHash}\n`);

// Paso 2: Crear el salt: email + "38457487" + deviceId
console.log('📍 PASO 2: Crear SALT');
const salt = `${email}38457487${deviceId}`;
console.log(`  Salt = email + "38457487" + deviceId`);
console.log(`  Salt = "${email}" + "38457487" + "${deviceId}"`);
console.log(`  Salt = "${salt}"\n`);

// Paso 3: Segunda hash (salt completo)
console.log('📍 PASO 3: Segundo SHA256 (salt completo)');
const finalHash = crypto.createHash('sha256').update(salt).digest('hex');
console.log(`  SHA256("${salt}") = ${finalHash}\n`);

// Paso 4: Enviar al servidor
console.log('═══════════════════════════════════════════════════════════');
console.log('🚀 ENVIANDO AL SERVIDOR LOCAL\n');

const payload = {
  entity: 'TryLogin',
  email: email,
  password: finalHash
};

console.log('📤 Payload enviado:');
console.log(JSON.stringify(payload, null, 2));
console.log('');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/get',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('📥 Respuesta del servidor:');
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed, null, 2));
      
      console.log('\n═══════════════════════════════════════════════════════════');
      if (parsed.data && parsed.data[0]) {
        const result = parsed.data[0];
        if (result.status === 1) {
          console.log('✅ AUTENTICACIÓN EXITOSA');
          console.log(`   Token: ${result.token}`);
        } else {
          console.log('❌ AUTENTICACIÓN FALLIDA');
          console.log(`   Reason: ${result.reason}`);
          console.log(`   Mensaje: ${result.msg}`);
        }
      }
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
  console.log('\n💡 Nota: Si no hay servidor en localhost:5000, instala dependencias:');
  console.log('   npm install express body-parser cors');
});

req.write(JSON.stringify(payload));
req.end();

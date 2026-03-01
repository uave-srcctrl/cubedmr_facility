#!/usr/bin/env node

/**
 * Test masivo de credenciales contra el API remoto
 * Prueba múltiples combinaciones de email y contraseña
 */

const testCases = [
  { email: 'drperez@curisec.com', password: '12345678', description: 'Dr. Perez - Credenciales proporcionadas' },
  { email: 'facility1@wounddatacenter.com', password: '12345678', description: 'Facility 1 - Password estándar' },
  { email: 'facility2@wounddatacenter.com', password: '12345678', description: 'Facility 2 - Password estándar' },
  { email: 'facility4@wounddatacenter.com', password: '12345678', description: 'Facility 4 - Password estándar' },
  { email: 'facility5@wounddatacenter.com', password: '12345678', description: 'Facility 5 - Password estándar' },
  { email: 'admin@curisec.com', password: 'admin', description: 'Admin - Admin credentials' },
  { email: 'drperez@curisec.com', password: 'password', description: 'Dr. Perez - Password genérico' },
];

console.log('🔐 Test Masivo de Credenciales');
console.log('═'.repeat(80));
console.log(`Fecha: ${new Date().toLocaleString()}`);
console.log(`Total de combinaciones a probar: ${testCases.length}`);
console.log('═'.repeat(80) + '\n');

let successCount = 0;
let failureCount = 0;
let results = [];

async function testCredentials(email, password, description) {
  const deviceId = 'test-' + Math.random().toString(36).substr(2, 9);
  
  try {
    const response = await fetch('https://cubed-mr.app/api/get', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity: 'TryLogin',
        email: email,
        password: password,
        deviceId: deviceId,
        name: email,
      }),
    });

    const data = await response.json();
    const dataItem = data.data && data.data[0];

    let status = '❌';
    let message = '';
    let isSuccess = false;

    if (data.status === true && dataItem?.status === 1) {
      status = '✅';
      message = 'LOGIN EXITOSO - Token generado';
      isSuccess = true;
      successCount++;
    } else if (data.status === false || dataItem?.status === 0) {
      if (dataItem?.reason === 1) {
        status = '⚠️ ';
        message = 'SESIÓN ACTIVA - Facility ya autenticado';
      } else if (dataItem?.reason === 3) {
        status = '❌';
        message = 'CREDENCIALES INVÁLIDAS';
        failureCount++;
      } else if (dataItem?.reason === 5) {
        status = '🚫';
        message = 'RATE LIMITING - Esperar 5 minutos';
      } else if (dataItem?.reason === 2) {
        status = '❌';
        message = `CREDENCIALES INVÁLIDAS - ${dataItem.msg}`;
        failureCount++;
      } else {
        status = '❓';
        message = `ESTADO DESCONOCIDO - ${dataItem?.msg}`;
      }
    }

    const result = {
      email,
      password,
      description,
      status,
      message,
      isSuccess,
      reason: dataItem?.reason,
      token: dataItem?.token ? 'Presente' : 'Ausente',
      entityId: dataItem?.entityId,
    };

    results.push(result);
    
    // Mostrar resultado
    console.log(`${status} ${description}`);
    console.log(`   Email: ${email}`);
    console.log(`   Pass: ${'*'.repeat(password.length)}`);
    console.log(`   Resultado: ${message}`);
    if (dataItem?.token) console.log(`   Token: ${dataItem.token.substring(0, 20)}...`);
    if (dataItem?.entityId) console.log(`   Entity ID: ${dataItem.entityId}`);
    console.log();

  } catch (error) {
    console.log(`❌ ${description}`);
    console.log(`   Email: ${email}`);
    console.log(`   Error: ${error.message}`);
    console.log();
    failureCount++;
  }

  // Pequeña pausa entre requests para evitar rate limiting
  await new Promise(resolve => setTimeout(resolve, 500));
}

async function runTests() {
  for (const testCase of testCases) {
    await testCredentials(testCase.email, testCase.password, testCase.description);
  }

  // Mostrar resumen
  console.log('═'.repeat(80));
  console.log('📊 RESUMEN DE RESULTADOS:\n');
  console.log(`Total de pruebas: ${testCases.length}`);
  console.log(`✅ Login exitosos: ${successCount}`);
  console.log(`❌ Credenciales inválidas: ${failureCount}`);
  console.log('═'.repeat(80) + '\n');

  // Mostrar tabla de resultados
  console.log('📋 TABLA RESUMIDA:\n');
  console.log('Status | Email                          | Descripción                    | Resultado');
  console.log('─'.repeat(110));
  
  results.forEach(r => {
    console.log(`${r.status} | ${r.email.padEnd(30)} | ${r.description.padEnd(30)} | ${r.message.substring(0, 40)}`);
  });

  console.log('\n' + '═'.repeat(80));
  
  if (successCount > 0) {
    console.log('\n🎉 SE ENCONTRARON CREDENCIALES VÁLIDAS:\n');
    results.filter(r => r.isSuccess).forEach(r => {
      console.log(`✅ ${r.email} / ${r.password}`);
      console.log(`   Description: ${r.description}`);
      console.log(`   Token: ${r.token}`);
    });
  } else {
    console.log('\n⚠️  No se encontraron credenciales válidas');
    console.log('    Las credenciales probadas no funcionan contra el API remoto');
  }
}

runTests().catch(console.error);

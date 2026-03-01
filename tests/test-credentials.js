#!/usr/bin/env node

/**
 * Test de autenticación con credenciales específicas
 * Email: drperez@curisec.com
 * Password: 12345678
 */

const email = 'drperez@curisec.com';
const password = '12345678';
const deviceId = 'test-' + Math.random().toString(36).substr(2, 9);

console.log('🔐 Test de Autenticación');
console.log('─'.repeat(60));
console.log(`Email: ${email}`);
console.log(`Password: ${'*'.repeat(password.length)}`);
console.log(`Device ID: ${deviceId}`);
console.log('─'.repeat(60));

async function testLogin() {
  try {
    console.log('\n📡 Intentando login contra API remoto...\n');
    
    const response = await fetch('https://cubed-mr.app/api/get', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        entity: 'TryLogin',
        email: email,
        password: password,
        deviceId: deviceId,
        name: email,
      }),
    });

    const data = await response.json();
    
    console.log('✓ Respuesta recibida:\n');
    console.log(JSON.stringify(data, null, 2));
    
    // Analizar resultado
    console.log('\n' + '─'.repeat(60));
    console.log('📊 ANÁLISIS DE RESULTADO:\n');
    
    if (data.status === true) {
      console.log('✅ LOGIN EXITOSO');
      const dataItem = data.data && data.data[0];
      if (dataItem) {
        console.log(`   • Status: ${dataItem.status}`);
        console.log(`   • Entity ID: ${dataItem.entityId}`);
        console.log(`   • Entity Name: ${dataItem.entityName}`);
        console.log(`   • Token: ${dataItem.token ? '✓ Presente' : '✗ NO PRESENTE'}`);
        console.log(`   • Facilities: ${dataItem.facilities ? dataItem.facilities.length + ' found' : 'none'}`);
        console.log(`   • Mensaje: ${dataItem.msg}`);
      }
    } else if (data.status === false) {
      const dataItem = data.data && data.data[0];
      if (dataItem?.status === 0 && dataItem?.reason === 1) {
        console.log('⚠️  SESIÓN ACTIVA EXISTENTE');
        console.log(`   • Facility ya está autenticado en otro dispositivo`);
        console.log(`   • Mensaje: ${dataItem.msg}`);
      } else if (dataItem?.status === 0 && dataItem?.reason === 3) {
        console.log('❌ CREDENCIALES INVÁLIDAS');
        console.log(`   • Email o contraseña incorrectos`);
        console.log(`   • Mensaje: ${dataItem.msg}`);
      } else if (dataItem?.status === 0 && dataItem?.reason === 5) {
        console.log('🚫 RATE LIMITING ACTIVO');
        console.log(`   • Demasiados intentos fallidos`);
        console.log(`   • Esperar 5 minutos antes de reintentar`);
        console.log(`   • Mensaje: ${dataItem.msg}`);
      } else {
        console.log('❌ LOGIN FALLIDO');
        console.log(`   • Status: ${dataItem?.status}`);
        console.log(`   • Reason: ${dataItem?.reason}`);
        console.log(`   • Mensaje: ${dataItem?.msg}`);
      }
    } else {
      console.log('❌ RESPUESTA INESPERADA');
      console.log(`   • Status: ${data.status}`);
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

testLogin();

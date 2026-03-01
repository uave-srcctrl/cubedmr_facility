#!/usr/bin/env node

/**
 * Análisis de Autenticación - Mecanismo Flutter
 * 
 * La app Flutter (woundcareapp) usa el siguiente mecanismo:
 * 1. Toma la contraseña en texto plano
 * 2. La hashea con SHA256
 * 3. Envía email y hash al backend con entity: "TryLogin"
 * 4. El backend compara el hash recibido con el hash en BD
 */

import crypto from 'crypto';
import fetch from 'node-fetch';

const email = 'drperez@curisec.com';
const password = '12345678';

console.log('🔐 Análisis de Autenticación - Mecanismo Flutter');
console.log('═'.repeat(80));
console.log(`\n📱 MECANISMO USADO EN WOUNDCAREAPP (Flutter):\n`);
console.log('Código de user.dart (líneas 134-148):');
console.log(`
  Future<Map<String,dynamic>> authenticate(String email,String passwd) async{
    Map<String,dynamic> parameters = {};
    var bytes = utf8.encode(passwd);              // Convertir a bytes UTF8
    var token = sha256.convert(bytes);            // SHA256 hash
    parameters.putIfAbsent('entity', () => 'TryLogin');
    parameters.putIfAbsent('email', () => email);
    parameters.putIfAbsent('password', () => token);  // ← Enviar el hash
    List<Map<String,dynamic>> results = await getData('get',parameters);
    return results[0];
  }
`);

console.log('\n' + '─'.repeat(80));
console.log('\n🔍 TEST: Autenticación con Mecanismo Flutter\n');
console.log(`Email: ${email}`);
console.log(`Password (texto plano): ${password}`);

// Generar SHA256 hash como lo hace Flutter
const bytes = Buffer.from(password, 'utf8');
const hash = crypto.createHash('sha256').update(bytes).digest('hex');

console.log(`\nPassword (SHA256 hash): ${hash}`);
console.log('\n' + '─'.repeat(80));

async function testAuthentication() {
  console.log('\n📡 Enviando autenticación al backend...\n');
  
  try {
    // Usar la ruta local de Express que actúa como proxy
    const localResponse = await fetch('http://localhost:5000/api/get', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'TryLogin',
        email: email,
        password: hash,  // ← Enviar el hash, no la contraseña
        deviceId: 'flutter-test-' + Math.random().toString(36).substr(2, 9),
        name: email,
      }),
    });

    const localData = await localResponse.json();
    console.log('✓ Respuesta (Local Express):\n');
    console.log(JSON.stringify(localData, null, 2));
    
    // Analizar resultado
    analyzeResult(localData, 'local');
    
  } catch (error) {
    console.error('❌ Error conectando a servidor local:', error.message);
    console.log('\n⚠️  Intento fallido. Probando directamente con API remoto...\n');
    
    try {
      const remoteResponse = await fetch('https://cubed-mr.app/api/get', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entity: 'TryLogin',
          email: email,
          password: hash,  // ← Enviar el hash
          deviceId: 'flutter-test-' + Math.random().toString(36).substr(2, 9),
          name: email,
        }),
      });

      const remoteData = await remoteResponse.json();
      console.log('✓ Respuesta (API Remoto - cubed-mr.app):\n');
      console.log(JSON.stringify(remoteData, null, 2));
      
      analyzeResult(remoteData, 'remote');
      
    } catch (remoteError) {
      console.error('❌ Error conectando a API remoto:', remoteError.message);
    }
  }
}

function analyzeResult(data, source) {
  console.log('\n' + '─'.repeat(80));
  console.log(`\n📊 ANÁLISIS DE RESULTADO (${source}):\n`);
  
  const dataItem = data.data && data.data[0];
  
  if (data.status === true && dataItem?.status === 1) {
    console.log('✅ AUTENTICACIÓN EXITOSA');
    console.log(`   • Status: ${dataItem.status}`);
    console.log(`   • Entity: ${dataItem.entity}`);
    console.log(`   • Entity Name: ${dataItem.entityName}`);
    console.log(`   • Token: ${dataItem.token ? '✓ Presente' : '✗ NO PRESENTE'}`);
    console.log(`   • Mensaje: ${dataItem.msg}`);
  } else if (dataItem?.reason === 2 || (data.status === true && dataItem?.status === 0)) {
    console.log('❌ HASH NO COINCIDE');
    console.log(`   • El hash SHA256 no coincide con el de la BD`);
    console.log(`   • Posibles causas:`);
    console.log(`     - La contraseña correcta es diferente`);
    console.log(`     - El BD almacena un hash diferente`);
    console.log(`   • Mensaje: ${dataItem?.msg}`);
  } else {
    console.log('❓ ESTADO DESCONOCIDO');
    console.log(`   • Status: ${dataItem?.status}`);
    console.log(`   • Reason: ${dataItem?.reason}`);
    console.log(`   • Mensaje: ${dataItem?.msg}`);
  }
}

testAuthentication();

#!/usr/bin/env node

/**
 * Test de Autenticación de Facilities contra DEV API
 * Endpoint: https://dev.cubed-mr.app/api/get
 * 
 * Prueba las credenciales de todos los facilities contra el servidor de desarrollo
 */

import crypto from 'crypto';

const DEV_API = 'https://cubed-mr.app/api';

// Facilities a probar
const FACILITIES = [
  { name: 'Facility 5', email: 'facility5@wounddatacenter.com', password: '12345678', id: 5 },
];

// Colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function log(msg, color = 'reset') {
  console.log(colors[color] + msg + colors.reset);
}

function logSection(title) {
  console.log('\n' + colors.bright + '═'.repeat(80) + colors.reset);
  console.log(colors.bright + title + colors.reset);
  console.log(colors.bright + '═'.repeat(80) + colors.reset);
}

function logSuccess(msg) {
  log('✅ ' + msg, 'green');
}

function logError(msg) {
  log('❌ ' + msg, 'red');
}

function logWarning(msg) {
  log('⚠️  ' + msg, 'yellow');
}

function logInfo(msg) {
  log('ℹ️  ' + msg, 'blue');
}

function logDebug(msg) {
  log('   ' + msg, 'gray');
}

/**
 * Hash password con SHA256 (como lo hace Flutter)
 */
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Prueba autenticación de un facility
 */
async function testFacilityAuth(facility) {
  const deviceId = `test-dev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const hashedPassword = hashPassword(facility.password);

  try {
    logInfo(`Probando: ${facility.name} (${facility.email})`);

    // Intentar con URLSearchParams (form-data)
    const formData = new URLSearchParams();
    formData.append('entity', 'TryLogin');
    formData.append('email', facility.email);
    formData.append('password', hashedPassword);
    formData.append('deviceId', deviceId);
    formData.append('name', facility.email);

    logDebug(`Device ID: ${deviceId}`);
    logDebug(`Hash: ${hashedPassword.substring(0, 20)}...`);

    const response = await fetch(`${DEV_API}/get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
      timeout: 10000,
    });

    const text = await response.text();
    logDebug(`Response text (primeros 150 chars): ${text.substring(0, 150)}`);

    // Intentar parsear JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      // Si es un Array de PHP, intentar extraerlo
      if (text.includes('Array')) {
        logWarning('Respuesta en formato PHP Array');
        // Buscar patrón "status" => 1 o similar
        const statusMatch = text.match(/\[status\]\s*=>\s*(\d+)/i) || text.match(/status["\']?\s*=>\s*(\d+)/);
        const tokenMatch = text.match(/\[token\]\s*=>\s*string\(\d+\)\s*"([^"]+)"/i);
        
        if (statusMatch && statusMatch[1] === '1') {
          data = {
            status: true,
            data: [{
              status: 1,
              token: tokenMatch ? tokenMatch[1] : null,
              entityId: null,
              entityName: null,
              msg: 'Success',
            }]
          };
        } else {
          data = { 
            status: false, 
            data: [{
              status: 0,
              reason: 3,
              msg: 'Invalid response format (PHP Array)',
            }],
            raw: text.substring(0, 200)
          };
        }
      } else {
        throw new Error(`Invalid response: ${text.substring(0, 100)}`);
      }
    }

    const dataItem = data.data && data.data[0];

    if (data.status === true && dataItem?.status === 1) {
      logSuccess(`Autenticación exitosa para ${facility.name}`);
      logDebug(`Status: ${dataItem.status}`);
      logDebug(`Entity ID: ${dataItem.entityId}`);
      logDebug(`Entity Name: ${dataItem.entityName}`);
      logDebug(`Token: ${dataItem.token ? 'Presente (' + dataItem.token.length + ' chars)' : 'Ausente'}`);
      
      if (dataItem.facilities) {
        logDebug(`Facilities asignados: ${dataItem.facilities.length}`);
        dataItem.facilities.forEach((f, idx) => {
          logDebug(`  [${idx + 1}] ${f.name || f} (ID: ${f.id || 'N/A'})`);
        });
      }

      return {
        facility: facility.name,
        email: facility.email,
        success: true,
        status: dataItem.status,
        entityId: dataItem.entityId,
        entityName: dataItem.entityName,
        token: dataItem.token,
        facilities: dataItem.facilities,
      };
    } else if (dataItem?.reason === 1) {
      logWarning(`Sesión activa existente para ${facility.name}`);
      logDebug(`Reason: ${dataItem.reason}`);
      logDebug(`Mensaje: ${dataItem.msg}`);
      return {
        facility: facility.name,
        email: facility.email,
        success: false,
        status: 'ACTIVE_SESSION',
        message: dataItem.msg,
      };
    } else if (dataItem?.reason === 3) {
      logError(`Credenciales inválidas para ${facility.name}`);
      logDebug(`Reason: 3 (Invalid credentials)`);
      logDebug(`Mensaje: ${dataItem.msg}`);
      return {
        facility: facility.name,
        email: facility.email,
        success: false,
        status: 'INVALID_CREDENTIALS',
        message: dataItem.msg,
      };
    } else {
      logWarning(`Estado desconocido para ${facility.name}`);
      logDebug(`Status: ${dataItem?.status}`);
      logDebug(`Reason: ${dataItem?.reason}`);
      logDebug(`Mensaje: ${dataItem?.msg}`);
      return {
        facility: facility.name,
        email: facility.email,
        success: false,
        status: 'UNKNOWN',
        reason: dataItem?.reason,
        message: dataItem?.msg,
      };
    }
  } catch (error) {
    logError(`Error probando ${facility.name}: ${error.message}`);
    return {
      facility: facility.name,
      email: facility.email,
      success: false,
      status: 'ERROR',
      error: error.message,
    };
  }
}

/**
 * Ejecutar todas las pruebas
 */
async function runAllTests() {
  logSection('🔐 TEST DE AUTENTICACIÓN - API PRODUCCIÓN');
  logInfo(`Endpoint: ${DEV_API}/get`);
  logInfo(`Total de facilities a probar: ${FACILITIES.length}`);
  logInfo(`Timestamp: ${new Date().toISOString()}`);

  const results = [];
  let successCount = 0;
  let failCount = 0;
  let errorCount = 0;

  // Probar cada facility
  for (let i = 0; i < FACILITIES.length; i++) {
    console.log(`\n[${i + 1}/${FACILITIES.length}]`);
    const result = await testFacilityAuth(FACILITIES[i]);
    results.push(result);

    if (result.success) {
      successCount++;
    } else if (result.status === 'ERROR') {
      errorCount++;
    } else {
      failCount++;
    }

    // Pequeña pausa entre requests
    if (i < FACILITIES.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Resumen
  logSection('📊 RESUMEN DE RESULTADOS');
  log(`Total de pruebas: ${FACILITIES.length}`, 'cyan');
  logSuccess(`Autenticaciones exitosas: ${successCount}`);
  logError(`Autenticaciones fallidas: ${failCount}`);
  logWarning(`Errores de conexión: ${errorCount}`);

  // Tabla detallada
  console.log('\n📋 DETALLE DE RESULTADOS:\n');
  log('Facility                 | Email                              | Status              ', 'bright');
  log('─'.repeat(110), 'gray');

  results.forEach((result) => {
    const statusIcon = result.success ? '✅' : result.status === 'ERROR' ? '❌' : '⚠️ ';
    const statusText = result.success ? 'SUCCESS' : result.status;
    
    const facilityCol = result.facility.padEnd(24);
    const emailCol = result.email.padEnd(35);
    const statusCol = statusText.padEnd(20);

    if (result.success) {
      log(`${facilityCol}| ${emailCol} | ${statusIcon} ${statusCol}`, 'green');
    } else if (result.status === 'ERROR') {
      log(`${facilityCol}| ${emailCol} | ${statusIcon} ${statusCol}`, 'red');
    } else {
      log(`${facilityCol}| ${emailCol} | ${statusIcon} ${statusCol}`, 'yellow');
    }

    if (result.error) {
      logDebug(`Error: ${result.error}`);
    } else if (result.message) {
      logDebug(`Mensaje: ${result.message}`);
    }
  });

  // Conclusiones
  logSection('🎯 CONCLUSIONES');

  if (successCount === FACILITIES.length) {
    logSuccess('✅ TODOS LOS FACILITIES ESTÁN AUTENTICADOS CORRECTAMENTE');
    logInfo('La aplicación React puede proceder con la integración de facilities');
  } else if (successCount > 0) {
    logWarning(`⚠️  ${successCount} de ${FACILITIES.length} facilities funcionan correctamente`);
    logInfo('Los facilities fallidos necesitan revisión');
  } else if (errorCount > 0) {
    logError('❌ ERROR DE CONEXIÓN AL DEV API');
    logInfo('Verificar que:');
    logDebug('1. https://dev.cubed-mr.app está accesible');
    logDebug('2. El endpoint /api/get existe');
    logDebug('3. La red permite conexiones HTTPS');
  } else {
    logError('❌ NINGÚN FACILITY PUDO AUTENTICARSE');
    logInfo('Posibles causas:');
    logDebug('1. Las credenciales son incorrectas');
    logDebug('2. Los usuarios no existen en la BD de desarrollo');
    logDebug('3. Los usuarios están desactivados');
    logDebug('4. El sistema de hashing es diferente');
  }

  console.log('\n' + colors.bright + '═'.repeat(80) + colors.reset + '\n');

  return {
    total: FACILITIES.length,
    successful: successCount,
    failed: failCount,
    errors: errorCount,
    results: results,
  };
}

// Ejecutar
runAllTests()
  .then((summary) => {
    process.exit(summary.successful === summary.total ? 0 : 1);
  })
  .catch((error) => {
    logError('Error fatal: ' + error.message);
    console.error(error);
    process.exit(1);
  });

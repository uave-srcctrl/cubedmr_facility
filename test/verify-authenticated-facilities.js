#!/usr/bin/env node

/**
 * Verificación de Facilities Autenticados en remoteWoundcareDB (cubed-mr.app)
 * 
 * Propósito: Verificar qué facilities están actualmente autenticados y pueden acceder
 * 
 * Uso:
 * node verify-authenticated-facilities.js
 */

import crypto from 'crypto';

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
  console.log('\n' + colors.bright + '═'.repeat(70) + colors.reset);
  console.log(colors.bright + title + colors.reset);
  console.log(colors.bright + '═'.repeat(70) + colors.reset);
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

// ============================================================================
// FACILITIES TO VERIFY
// ============================================================================

const FACILITIES_TO_TEST = [
  {
    name: 'Facility 1',
    email: 'facility1@wounddatacenter.com',
    password: '12345678',
    expectedId: 1
  },
  {
    name: 'Facility 2',
    email: 'facility2@wounddatacenter.com',
    password: '12345678',
    expectedId: 2
  },
  {
    name: 'Facility 4',
    email: 'facility4@wounddatacenter.com',
    password: '12345678',
    expectedId: 4
  },
  {
    name: 'Facility 5',
    email: 'facility5@wounddatacenter.com',
    password: '12345678',
    expectedId: 5
  },
];

const LOCAL_API = 'http://localhost:5000/api';
const REMOTE_API = 'https://cubed-mr.app/api';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function hashPasswordSHA256(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function testFacilityLogin(facility, useRemote = false) {
  const apiBase = useRemote ? REMOTE_API : LOCAL_API;
  const hashedPassword = hashPasswordSHA256(facility.password);
  
  try {
    const payload = {
      entity: 'TryLoginFacilities',
      email: facility.email,
      password: hashedPassword,
      deviceId: `verify-device-${Date.now()}`
    };

    const response = await fetch(`${apiBase}/get`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    return {
      success: data.status === true && data.data?.[0]?.status === 1,
      status: data.status,
      data: data.data,
      error: data.error || null,
      response: data
    };
  } catch (error) {
    return {
      success: false,
      status: false,
      data: null,
      error: error.message,
      response: null
    };
  }
}

async function verifyFacilitiesLocalServer() {
  logSection('🏥 VERIFICACIÓN DE FACILITIES - LOCAL SERVER (localhost:5000)');
  
  let authenticatedCount = 0;
  let failedCount = 0;
  const results = [];

  for (const facility of FACILITIES_TO_TEST) {
    log(`\n📋 Probando: ${facility.name} (${facility.email})`);
    
    const result = await testFacilityLogin(facility, false);

    if (result.success) {
      logSuccess(`${facility.name} autenticado correctamente`);
      
      const facilityData = result.data[0];
      logDebug(`Facility ID: ${facilityData.facilityId}`);
      logDebug(`Facility Name: ${facilityData.facilityName}`);
      logDebug(`Status: ${facilityData.status}`);
      logDebug(`Token Length: ${facilityData.token?.length || 0} chars`);
      
      if (facilityData.facilityId === facility.expectedId.toString()) {
        logSuccess(`✓ ID coincide (${facility.expectedId})`);
      } else {
        logWarning(`⚠ ID no coincide (esperado: ${facility.expectedId}, obtenido: ${facilityData.facilityId})`);
      }
      
      authenticatedCount++;
      results.push({
        facility: facility.name,
        email: facility.email,
        authenticated: true,
        facilityId: facilityData.facilityId,
        facilityName: facilityData.facilityName
      });
    } else {
      logError(`${facility.name} falló`);
      logDebug(`Error: ${result.error || 'Unknown error'}`);
      if (result.response) {
        logDebug(`Response: ${JSON.stringify(result.response)}`);
      }
      failedCount++;
      results.push({
        facility: facility.name,
        email: facility.email,
        authenticated: false,
        error: result.error
      });
    }
  }

  // Summary
  logSection('📊 RESUMEN - LOCAL SERVER');
  log(`Total Facilities: ${FACILITIES_TO_TEST.length}`);
  logSuccess(`Autenticados: ${authenticatedCount}`);
  logError(`Fallidos: ${failedCount}`);
  
  return results;
}

async function verifyFacilitiesRemote() {
  logSection('🌐 VERIFICACIÓN DE FACILITIES - REMOTE API (cubed-mr.app)');
  
  let authenticatedCount = 0;
  let failedCount = 0;
  const results = [];

  for (const facility of FACILITIES_TO_TEST) {
    log(`\n📋 Probando: ${facility.name} (${facility.email})`);
    
    const result = await testFacilityLogin(facility, true);

    if (result.success) {
      logSuccess(`${facility.name} autenticado correctamente`);
      
      const facilityData = result.data[0];
      logDebug(`Facility ID: ${facilityData.facilityId}`);
      logDebug(`Facility Name: ${facilityData.facilityName}`);
      logDebug(`Status: ${facilityData.status}`);
      logDebug(`Token Length: ${facilityData.token?.length || 0} chars`);
      
      if (facilityData.facilityId === facility.expectedId.toString()) {
        logSuccess(`✓ ID coincide (${facility.expectedId})`);
      } else {
        logWarning(`⚠ ID no coincide (esperado: ${facility.expectedId}, obtenido: ${facilityData.facilityId})`);
      }
      
      authenticatedCount++;
      results.push({
        facility: facility.name,
        email: facility.email,
        authenticated: true,
        facilityId: facilityData.facilityId,
        facilityName: facilityData.facilityName
      });
    } else {
      logError(`${facility.name} falló`);
      logDebug(`Error: ${result.error || 'Unknown error'}`);
      if (result.response) {
        logDebug(`Response: ${JSON.stringify(result.response)}`);
      }
      failedCount++;
      results.push({
        facility: facility.name,
        email: facility.email,
        authenticated: false,
        error: result.error
      });
    }
  }

  // Summary
  logSection('📊 RESUMEN - REMOTE API');
  log(`Total Facilities: ${FACILITIES_TO_TEST.length}`);
  logSuccess(`Autenticados: ${authenticatedCount}`);
  logError(`Fallidos: ${failedCount}`);
  
  return results;
}

// ============================================================================
// COMPARISON FUNCTION
// ============================================================================

function compareResults(localResults, remoteResults) {
  logSection('🔄 COMPARACIÓN: Local vs Remote');
  
  log('\nMatriz de Resultados:');
  log('\nFacility Name          | Local    | Remote   | Match');
  log('─'.repeat(60));
  
  for (let i = 0; i < FACILITIES_TO_TEST.length; i++) {
    const local = localResults[i];
    const remote = remoteResults[i];
    
    const localStatus = local.authenticated ? '✅' : '❌';
    const remoteStatus = remote.authenticated ? '✅' : '❌';
    const matchStatus = local.authenticated === remote.authenticated ? '✅' : '❌';
    
    log(`${local.facility.padEnd(20)} | ${localStatus.padEnd(8)} | ${remoteStatus.padEnd(8)} | ${matchStatus}`);
  }
  
  const allMatch = localResults.every((lr, i) => lr.authenticated === remoteResults[i].authenticated);
  
  if (allMatch) {
    logSuccess('\n✅ Resultados consistentes entre Local y Remote');
  } else {
    logWarning('\n⚠️  Hay inconsistencias entre Local y Remote');
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.clear();
  logSection('🔍 VERIFICADOR DE FACILITIES AUTENTICADOS EN remoteWoundcareDB');
  
  log('\nURL Local: ' + LOCAL_API, 'cyan');
  log('URL Remote: ' + REMOTE_API, 'cyan');
  
  try {
    // Check local server availability
    log('\n🔌 Verificando disponibilidad del servidor local...', 'blue');
    try {
      const healthResponse = await fetch(`${LOCAL_API}/health`);
      if (healthResponse.ok) {
        logSuccess('Servidor local disponible');
      } else {
        logWarning('Servidor local respondió con status: ' + healthResponse.status);
      }
    } catch (error) {
      logWarning('No se pudo conectar al servidor local: ' + error.message);
      logInfo('Ejecuta: npm run dev (desde la carpeta wounddatacenter)');
    }

    // Test Local Server
    const localResults = await verifyFacilitiesLocalServer();

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test Remote API
    const remoteResults = await verifyFacilitiesRemote();

    // Compare Results
    compareResults(localResults, remoteResults);

    // Final Summary
    logSection('📋 RESUMEN FINAL');
    
    const localAuthenticated = localResults.filter(r => r.authenticated).length;
    const remoteAuthenticated = remoteResults.filter(r => r.authenticated).length;
    
    log(`\nLocal Server:  ${localAuthenticated}/${FACILITIES_TO_TEST.length} facilities autenticados`, 'cyan');
    log(`Remote API:    ${remoteAuthenticated}/${FACILITIES_TO_TEST.length} facilities autenticados`, 'cyan');
    
    if (localAuthenticated > 0 && remoteAuthenticated > 0) {
      logSuccess('\n✅ VERIFICACIÓN EXITOSA: Facilities están autenticados en remoteWoundcareDB');
    } else if (localAuthenticated === 0 && remoteAuthenticated === 0) {
      logError('\n❌ PROBLEMA: Ningún facility puede autenticarse');
      logInfo('Posibles causas:');
      logDebug('1. Las credenciales son incorrectas');
      logDebug('2. Los usuarios no existen en remoteWoundcareDB');
      logDebug('3. Los usuarios están desactivados');
      logDebug('4. No hay facilities asignados a los usuarios');
    } else {
      logWarning('\n⚠️  INCONSISTENCIA: Resultados diferentes entre local y remote');
    }

  } catch (error) {
    logError('Error durante la verificación: ' + error.message);
    console.error(error);
  }
  
  console.log('');
}

// Run
main();

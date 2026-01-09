#!/usr/bin/env node

/**
 * Script de Validación: Facility Wound Report Data Connection
 * 
 * Verifica que los datos de Facility Wound Report realmente vienen del backend externo
 * 
 * Uso:
 * node validate-facility-wound-report.js [facilityId] [startDate] [endDate]
 * 
 * Ejemplos:
 * node validate-facility-wound-report.js
 * node validate-facility-wound-report.js 5 2025-06-23 2025-12-23
 * node validate-facility-wound-report.js 10 2025-01-01 2025-12-23
 */

const http = require('http');
const https = require('https');

// Colores para terminal
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
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function logSection(title) {
  log('\n' + '='.repeat(80), 'bright');
  log(title, 'bright');
  log('='.repeat(80) + '\n', 'bright');
}

function logSuccess(msg) {
  log(`✅ ${msg}`, 'green');
}

function logError(msg) {
  log(`❌ ${msg}`, 'red');
}

function logInfo(msg) {
  log(`ℹ️  ${msg}`, 'cyan');
}

function logDebug(msg) {
  log(`   ${msg}`, 'gray');
}

function logWarning(msg) {
  log(`⚠️  ${msg}`, 'yellow');
}

// Parse arguments
const facilityId = process.argv[2] || '5';
const today = new Date();
const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
const formatDate = (d) => d.toISOString().split('T')[0];
const startDate = process.argv[3] || formatDate(oneYearAgo);
const endDate = process.argv[4] || formatDate(today);

const backendBaseUrl = 'https://cubed-mr.app';
const remoteUrl = `${backendBaseUrl}/api/reports/facility-wound-outcome/${facilityId}/${startDate}/${endDate}`;

logSection('🏥 VALIDACIÓN DE FACILITY WOUND REPORT - DATOS DEL BACKEND');

log(`Facility ID: ${facilityId}`, 'cyan');
log(`Fecha Inicio: ${startDate}`, 'cyan');
log(`Fecha Fin: ${endDate}`, 'cyan');
log(`Backend Externo: ${backendBaseUrl}`, 'cyan');
log(`\nURL a validar:`, 'bright');
logDebug(remoteUrl + '\n');

// Función para hacer fetch HTTPS
function fetchRemote(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    log(`⏳ Conectando a backend externo...`, 'yellow');
    
    client.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      
      res.on('data', chunk => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed,
            rawBody: data,
            success: true,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: null,
            rawBody: data,
            error: e.message,
            success: false,
          });
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

// Función para analizar respuesta
function analyzeResponse(response) {
  logSection('📊 RESPUESTA DEL BACKEND EXTERNO');

  log(`HTTP Status: ${response.status}`, response.status === 200 ? 'green' : 'red');
  
  if (!response.success) {
    logError(`Error parsing JSON: ${response.error}`);
    logDebug(`Raw body (first 500 chars):`);
    logDebug(response.rawBody.substring(0, 500));
    return false;
  }

  const data = response.body;

  // Validar estructura básica
  log('\n📋 Estructura de Respuesta:', 'bright');
  logDebug(`✓ Status: ${data.status}`);
  logDebug(`✓ Has data: ${!!data.data}`);
  
  if (Array.isArray(data.data)) {
    logDebug(`✓ Data is array: ${data.data.length} elements`);
  }

  // VALIDACIÓN CRÍTICA
  if (response.status === 200 && data.status === true && data.data && Array.isArray(data.data) && data.data.length > 0) {
    logSuccess(`✅ CONFIRMADO: Datos REALES del backend externo`);
    
    const firstRecord = data.data[0];
    log('\n📈 Primer Registro (Muestra de Datos):', 'bright');
    
    // Mostrar campos principales
    const keyFields = [
      'Number of Active Wounds',
      'Percent of Wounds Improving',
      'Percent of Wounds Deteriorating',
      'Percent of Wounds Stable',
      'Number of New Wounds',
      'Percent of Wounds Resolved',
      'Date of Service',
      'Date',
    ];
    
    keyFields.forEach(field => {
      if (field in firstRecord) {
        let value = firstRecord[field];
        // Truncate long strings
        if (typeof value === 'string' && value.length > 50) {
          value = value.substring(0, 47) + '...';
        }
        logDebug(`  ${field}: ${value}`);
      }
    });

    log('\n📦 Respuesta JSON Completa:', 'bright');
    console.log(JSON.stringify(data, null, 2));
    
    return true;
  } else {
    logError(`No data available from backend`);
    if (response.status !== 200) {
      logDebug(`HTTP Status: ${response.status}`);
    }
    if (!data.status) {
      logDebug(`Response status not true: ${data.status}`);
    }
    if (!data.data || data.data.length === 0) {
      logDebug(`No data in response or empty array`);
    }
    
    log('\n📦 Respuesta Recibida:', 'bright');
    console.log(JSON.stringify(data, null, 2));
    
    return false;
  }
}

// Main execution
(async () => {
  try {
    const response = await fetchRemote(remoteUrl);
    const success = analyzeResponse(response);

    // Resumen final
    logSection('✨ RESUMEN DE VALIDACIÓN');

    if (success) {
      logSuccess(`Backend Externo: ALCANZABLE Y CON DATOS ✅`);
      logSuccess(`Status HTTP: 200 OK ✅`);
      logSuccess(`Estructura: Válida ✅`);
      logSuccess(`Período: ${startDate} a ${endDate} ✅`);
      logSuccess(`Facility ID: ${facilityId} ✅`);
      
      log('\n📌 Conclusión:', 'bright');
      logSuccess('✅ CONFIRMADO: Facility Wound Report trae datos REALES del backend externo');
      logSuccess('   URL: ' + remoteUrl);
      logSuccess('   Este es el endpoint directo que usa el componente');
    } else {
      logError(`Backend Externo: PROBLEMA DETECTADO ❌`);
      logWarning(`Verifica que:`);
      logDebug(`1. La URL es correcta: ${remoteUrl}`);
      logDebug(`2. El backend está disponible`);
      logDebug(`3. El facilityId es válido: ${facilityId}`);
      logDebug(`4. Las fechas están en rango válido: ${startDate} a ${endDate}`);
    }

    log('\n🔍 Detalles Técnicos:', 'bright');
    logDebug(`Backend Base URL: ${backendBaseUrl}`);
    logDebug(`Endpoint: /api/reports/facility-wound-outcome/{facilityId}/{startDate}/{endDate}`);
    logDebug(`Parámetros usados: facilityId=${facilityId}, startDate=${startDate}, endDate=${endDate}`);

  } catch (error) {
    logError(`Error ejecutando validación: ${error.message}`);
    logInfo('Posibles causas:');
    logDebug(`1. Backend no disponible: ${backendBaseUrl}`);
    logDebug(`2. Problema de conexión a internet`);
    logDebug(`3. Timeout (el backend tardó más de 10 segundos)`);
    logDebug(`4. URL inválida`);
  }
})();

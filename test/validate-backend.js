#!/usr/bin/env node

/**
 * Script de Validación: Backend Data Connection
 * 
 * Verifica que los datos realmente vienen del backend externo (cubed-mr.app)
 * 
 * Uso:
 * node validate-backend.js [facilityId] [period]
 * 
 * Ejemplos:
 * node validate-backend.js                    // Usa defaults: facilityId=5, period=30
 * node validate-backend.js 5 30               // ID de facility=5, período=30 días
 * node validate-backend.js 10 90              // ID de facility=10, período=90 días
 */

const http = require('http');

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
  log('\n' + '='.repeat(70), 'bright');
  log(title, 'bright');
  log('='.repeat(70) + '\n', 'bright');
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

// Parse arguments
const facilityId = process.argv[2] || '5';
const periodDays = process.argv[3] || '30';
const serverHost = 'localhost';
const serverPort = 5000;

logSection('🔐 VALIDACIÓN DE CONEXIÓN AL BACKEND EXTERNO');

log(`Facility ID: ${facilityId}`, 'cyan');
log(`Período: ${periodDays} días`, 'cyan');
log(`Servidor Local: http://${serverHost}:${serverPort}\n`, 'cyan');

// Función para hacer fetch HTTP local
function makeRequest(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'X-Facility-Id': facilityId,
      ...headers,
    };

    const options = {
      hostname: serverHost,
      port: serverPort,
      path: path,
      method: 'GET',
      headers: defaultHeaders,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: JSON.parse(data),
            rawBody: data,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: null,
            rawBody: data,
            error: e.message,
          });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Función para analizar respuesta
function analyzeKPIResponse(response) {
  logSection('📊 ANÁLISIS DE RESPUESTA KPIs');

  log(`HTTP Status: ${response.status}`, response.status === 200 ? 'green' : 'red');
  
  if (response.error) {
    logError(`Error parsing JSON: ${response.error}`);
    logDebug(`Raw body: ${response.rawBody.substring(0, 200)}`);
    return;
  }

  const data = response.body;

  // Validar estructura básica
  log('\n📋 Estructura de Respuesta:', 'bright');
  logDebug(`✓ Status: ${data.status}`);
  logDebug(`✓ Has data: ${!!data.data}`);
  logDebug(`✓ Has source: ${!!data.source}`);
  logDebug(`✓ Has period: ${!!data.period}`);

  // VALIDACIÓN CRÍTICA: Origen de datos
  log('\n🔑 ORIGEN DE DATOS (Crítico):', 'bright');
  if (data.source === 'backend') {
    logSuccess(`Datos REALES del backend externo (cubed-mr.app)`);
    logDebug(`Source: "${data.source}"`);
  } else if (data.source === 'backend-no-data') {
    logError(`Backend alcanzable pero SIN DATOS`);
    logDebug(`Source: "${data.source}"`);
  } else if (data.source === 'server-error') {
    logError(`Error en el servidor local`);
    logDebug(`Source: "${data.source}"`);
  } else {
    logError(`Origen desconocido: "${data.source}"`);
  }

  // Período
  log('\n⏰ Período de Datos:', 'bright');
  if (data.period) {
    logSuccess(`Período obtenido: ${data.period}`);
  } else {
    logError(`No se obtuvo período`);
  }

  // KPI Data
  if (data.data) {
    log('\n💰 Valores KPI:', 'bright');
    const kpis = data.data;
    
    if (kpis.activeWounds) {
      logDebug(`Active Wounds: ${kpis.activeWounds.value} (${kpis.activeWounds.period})`);
    }
    if (kpis.healingRate) {
      logDebug(`Healing Rate: ${kpis.healingRate.value}% (${kpis.healingRate.period})`);
    }
    if (kpis.reportsGenerated) {
      logDebug(`Reports Generated: ${kpis.reportsGenerated.value} (${kpis.reportsGenerated.period})`);
    }
    if (kpis.criticalCases) {
      logDebug(`Critical Cases: ${kpis.criticalCases.value} (${kpis.criticalCases.period})`);
    }
  }

  // Respuesta completa
  log('\n📦 Respuesta Completa (JSON):', 'bright');
  console.log(JSON.stringify(data, null, 2));
}

function analyzeWoundsByStatusResponse(response) {
  logSection('🔴 ANÁLISIS DE RESPUESTA - WOUNDS BY STATUS');

  log(`HTTP Status: ${response.status}`, response.status === 200 ? 'green' : 'red');
  
  if (response.error) {
    logError(`Error parsing JSON: ${response.error}`);
    return;
  }

  const data = response.body;

  log('\n📋 Estructura de Respuesta:', 'bright');
  logDebug(`✓ Status: ${data.status}`);
  logDebug(`✓ Has data: ${!!data.data && Array.isArray(data.data)}`);
  logDebug(`✓ Data length: ${data.data?.length || 0}`);

  if (data.data && Array.isArray(data.data)) {
    log('\n📊 Wounds by Status:', 'bright');
    data.data.forEach((item, idx) => {
      logDebug(`  [${idx}] ${item.status}: ${item.count} wounds`);
    });
  }

  log('\n📦 Respuesta Completa:', 'bright');
  console.log(JSON.stringify(data, null, 2));
}

// Main execution
(async () => {
  try {
    logInfo(`Conectando a servidor local: http://${serverHost}:${serverPort}`);

    // 1. Probar KPIs
    log('\n⏳ Obteniendo datos de KPIs...', 'yellow');
    const kpiResponse = await makeRequest('/api/dashboard/kpis');
    analyzeKPIResponse(kpiResponse);

    // 2. Probar Wounds by Status
    log('\n⏳ Obteniendo datos de Wounds by Status...', 'yellow');
    const woundsResponse = await makeRequest('/api/dashboard/wounds-by-status');
    analyzeWoundsByStatusResponse(woundsResponse);

    // 3. Resumen final
    logSection('✨ RESUMEN DE VALIDACIÓN');

    if (kpiResponse.body?.source === 'backend') {
      logSuccess('KPIs: Datos del backend externo confirmados ✅');
    } else {
      logError(`KPIs: Source = "${kpiResponse.body?.source}"`);
    }

    if (woundsResponse.status === 200) {
      logSuccess('Wounds by Status: Respuesta obtenida ✅');
    } else {
      logError(`Wounds by Status: Status = ${woundsResponse.status}`);
    }

    log('\n📌 Conclusión:', 'bright');
    if (kpiResponse.body?.source === 'backend') {
      logSuccess('✅ CONFIRMADO: Los datos realmente vienen del backend externo (cubed-mr.app)');
    } else {
      logError('❌ Los datos NO vienen del backend externo');
      logInfo('Verifica logs del servidor para detalles');
    }

  } catch (error) {
    logError(`Error ejecutando validación: ${error.message}`);
    logInfo('Asegúrate de que el servidor está corriendo: npm run dev');
  }
})();

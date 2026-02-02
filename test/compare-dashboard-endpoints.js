#!/usr/bin/env node

/**
 * Dashboard External vs Frontend Data Comparison
 * Compares the external endpoint responses with what the frontend receives/displays
 */

const BASE_URL = 'http://localhost:5000';
const FACILITY_ID = '1';

const endpoints = [
  {
    name: 'Dashboard KPIs',
    local: '/api/dashboard/kpis',
    external: 'https://cubed-mr.app/api/reports/facility-acuity-index',
    externalParams: `/${FACILITY_ID}/2025-01-04`,
    description: 'Aggregated KPI metrics'
  },
  {
    name: 'Wound Etiology',
    local: '/api/dashboard/wound-etiology',
    external: 'https://cubed-mr.app/api/reports/etiology-distribution',
    externalParams: `/${FACILITY_ID}/2025-01-04`,
    description: 'Wound type distribution'
  },
  {
    name: 'Wound Reduction',
    local: '/api/dashboard/wound-reduction',
    external: 'https://cubed-mr.app/api/reports/wound-reduction',
    externalParams: `/${FACILITY_ID}/2024-01-04/2025-01-04`,
    description: 'Monthly wound reduction trend'
  },
  {
    name: 'Healing Status',
    local: '/api/dashboard/healing-status',
    external: 'https://cubed-mr.app/api/reports/healing-status',
    externalParams: `/${FACILITY_ID}`,
    description: 'Patient healing status distribution'
  },
  {
    name: 'Wounds by Status',
    local: '/api/dashboard/wounds-by-status',
    external: 'https://cubed-mr.app/api/reports/wounds-by-status',
    externalParams: `/${FACILITY_ID}`,
    description: 'Active wound status breakdown'
  }
];

async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function compareEndpoints() {
  console.log('\n📊 Dashboard External vs Frontend Data Comparison\n');
  console.log('═'.repeat(100));

  for (const endpoint of endpoints) {
    console.log(`\n🔍 ${endpoint.name}`);
    console.log('─'.repeat(100));
    console.log(`Description: ${endpoint.description}`);
    console.log(`Local Endpoint: ${endpoint.local}`);
    console.log(`External Endpoint: ${endpoint.external}${endpoint.externalParams}`);

    try {
      // Fetch from external API
      console.log('\n📡 External API Response:');
      const externalResponse = await fetchWithTimeout(
        `${endpoint.external}${endpoint.externalParams}`,
        { method: 'GET', headers: { 'Content-Type': 'application/json' } }
      );

      let externalData = null;
      let externalStatus = externalResponse.status;
      
      if (externalResponse.ok) {
        externalData = await externalResponse.json();
        console.log(`   Status: ${externalStatus}`);
        console.log(`   Data (first 500 chars): ${JSON.stringify(externalData).substring(0, 500)}`);
        if (JSON.stringify(externalData).length > 500) console.log('   ...');
      } else {
        console.log(`   ❌ Error: HTTP ${externalStatus}`);
      }

      // Fetch from local API
      console.log('\n🖥️  Local API Response (Frontend receives):');
      const localResponse = await fetchWithTimeout(
        `${BASE_URL}${endpoint.local}`,
        { 
          method: 'GET',
          headers: { 
            'Content-Type': 'application/json',
            'X-Facility-Id': FACILITY_ID
          }
        }
      );

      let localData = null;
      let localStatus = localResponse.status;
      
      if (localResponse.ok) {
        localData = await localResponse.json();
        console.log(`   Status: ${localStatus}`);
        console.log(`   Response Structure:`);
        console.log(`   - status: ${localData.status}`);
        console.log(`   - source: ${localData.source}`);
        console.log(`   - data type: ${Array.isArray(localData.data) ? 'Array' : typeof localData.data}`);
        if (Array.isArray(localData.data)) {
          console.log(`   - data length: ${localData.data.length} items`);
          if (localData.data.length > 0) {
            console.log(`   - data[0] keys: ${Object.keys(localData.data[0]).join(', ')}`);
            console.log(`   - data[0] sample: ${JSON.stringify(localData.data[0]).substring(0, 300)}`);
          }
        } else if (typeof localData.data === 'object') {
          console.log(`   - data keys: ${Object.keys(localData.data).join(', ')}`);
          console.log(`   - data sample: ${JSON.stringify(localData.data).substring(0, 300)}`);
        }
      } else {
        console.log(`   ❌ Error: HTTP ${localStatus}`);
      }

      // Comparison
      console.log('\n🔄 Comparison:');
      if (externalStatus === 200 && localStatus === 200) {
        if (externalData && localData) {
          const externalSize = JSON.stringify(externalData).length;
          const localDataSize = JSON.stringify(localData.data).length;
          const transformationRatio = ((externalSize - localDataSize) / externalSize * 100).toFixed(2);
          
          console.log(`   ✅ Both endpoints responding`);
          console.log(`   - External data size: ${externalSize} bytes`);
          console.log(`   - Transformed data size: ${localDataSize} bytes`);
          console.log(`   - Size change: ${transformationRatio}%`);
          console.log(`   - Data transformation: ${localData.source === 'backend' ? '✅ Backend transformation applied' : '⚠️  Mock data used'}`);
        }
      } else {
        console.log(`   ⚠️  One or both endpoints failed`);
      }

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    console.log('\n' + '─'.repeat(100));
  }

  console.log('\n' + '═'.repeat(100));
  console.log('\n📝 Summary:');
  console.log(`   - Facility ID: ${FACILITY_ID}`);
  console.log(`   - Local API Base: ${BASE_URL}`);
  console.log(`   - External API Base: https://cubed-mr.app`);
  console.log(`   - Comparison Date: ${new Date().toISOString()}`);
  console.log('\n');
}

// Run comparison
compareEndpoints().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

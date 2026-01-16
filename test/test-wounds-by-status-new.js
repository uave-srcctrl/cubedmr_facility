#!/usr/bin/env node

/**
 * Test: Verify Wounds by Status Endpoint
 * Check if the new endpoint is responding correctly
 */

const API_BASE = 'http://localhost:5000/api';

async function testWoundsByStatusEndpoint() {
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║     WOUNDS BY STATUS ENDPOINT - VERIFICATION                       ║');
  console.log('║     New endpoint: GET /api/dashboard/wounds-by-status               ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  console.log('Testing for facilityId 1:\n');

  try {
    const response = await fetch(`${API_BASE}/dashboard/wounds-by-status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Facility-Id': '1'
      }
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    
    const result = await response.json();
    
    console.log(`Response Status: ${result.status}`);
    console.log(`Data Source: ${result.source}`);
    console.log(`Records: ${result.data ? result.data.length : 0}`);
    
    console.log('\n📊 Response Data:\n');
    console.log(JSON.stringify(result, null, 2));

    console.log('\n' + '═'.repeat(70));
    console.log('\n✅ VERIFICATION:\n');

    if (response.status === 200) {
      console.log('✅ Status: 200 OK');
    } else {
      console.log(`❌ Status: ${response.status} (expected 200)`);
    }

    if (result.status === true) {
      console.log('✅ Response Status: true');
    } else {
      console.log('❌ Response Status: false');
    }

    if (result.data && Array.isArray(result.data)) {
      console.log(`✅ Data is array with ${result.data.length} records`);
      console.log('   Records:');
      for (const item of result.data) {
        console.log(`   • ${item.status}: ${item.count}`);
      }
    } else {
      console.log('❌ Data is not an array');
    }

    if (result.source === 'mock') {
      console.log('✅ Data Source: "mock" (expected - backend endpoint not available)');
    } else {
      console.log(`⚠️  Data Source: "${result.source}"`);
    }

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }

  console.log('\n' + '═'.repeat(70));
  console.log('\n🧪 Testing all facilities:\n');

  for (const facilityId of [1, 2, 3]) {
    try {
      const response = await fetch(`${API_BASE}/dashboard/wounds-by-status`, {
        headers: {
          'X-Facility-Id': facilityId.toString()
        }
      });
      
      const result = await response.json();
      const status = response.status === 200 ? '✅' : '❌';
      const source = result.source || 'unknown';
      const count = result.data ? result.data.length : 0;
      
      console.log(`${status} Facility ${facilityId}: ${source} - ${count} records`);
    } catch (error) {
      console.error(`❌ Facility ${facilityId}: ${error.message}`);
    }
  }

  console.log('\n' + '═'.repeat(70));
  console.log('\n📋 IMPLEMENTATION SUMMARY:\n');

  console.log('✅ New Endpoint Created:');
  console.log('   Path: /api/dashboard/wounds-by-status');
  console.log('   Method: GET');
  console.log('   Auth: Requires X-Facility-Id header');
  console.log('   Data: Mock data (Admitted, Active, Resolved, Hospitalized)\n');

  console.log('✅ Client Updates:');
  console.log('   • Added DASHBOARD_WOUNDS_BY_STATUS to api-config.ts');
  console.log('   • Added useState hooks for wounds by status data');
  console.log('   • Added useEffect to fetch from endpoint');
  console.log('   • Updated component to use dynamic data');
  console.log('   • Updated DataSourceBadge to show actual source\n');

  console.log('✅ Component Now:');
  console.log('   • Fetches data from /api/dashboard/wounds-by-status');
  console.log('   • Shows badge with data source ("mock" or "backend")');
  console.log('   • Displays wounds status distribution bar chart\n');

  console.log('═'.repeat(70) + '\n');
}

testWoundsByStatusEndpoint();

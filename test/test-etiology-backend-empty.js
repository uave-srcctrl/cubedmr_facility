#!/usr/bin/env node

/**
 * Test: Wound Etiology Distribution - Backend Empty Data Handling
 * Verify: Empty data from backend returns source: "backend"
 */

const API_BASE = 'http://localhost:5000/api';

async function testEtiologyDataSource() {
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║     WOUND ETIOLOGY - DATA SOURCE FOR EMPTY BACKEND                  ║');
  console.log('║     Verify: Empty backend data returns source: "backend"            ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  try {
    console.log('📡 Fetching Wound Etiology data for facilityId: 1\n');
    
    const response = await fetch(`${API_BASE}/dashboard/wound-etiology`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Facility-Id': '1'
      }
    });

    const result = await response.json();
    
    console.log('Response Status:', response.status);
    console.log('Data Source:', result.source);
    console.log('Data Length:', result.data ? result.data.length : 'null');
    console.log('\n📊 Full Response:\n');
    console.log(JSON.stringify(result, null, 2));

    console.log('\n' + '═'.repeat(70));
    console.log('\n🔍 VERIFICATION:\n');
    
    if (result.source === 'backend') {
      console.log('✅ Data Source is "backend" - CORRECT');
    } else {
      console.log(`❌ Data Source is "${result.source}" - Expected "backend"`);
    }
    
    if (result.data && Array.isArray(result.data)) {
      if (result.data.length === 0) {
        console.log('✅ Data Array is empty - CORRECT');
        console.log('   Backend returned no etiology data for facility 1');
      } else {
        console.log(`✅ Data Array has ${result.data.length} records`);
      }
    }

    console.log('\n' + '═'.repeat(70));
    console.log('\n📋 BEHAVIOR:\n');
    
    if (result.source === 'backend' && result.data && result.data.length === 0) {
      console.log('Current Behavior: CORRECT ✅');
      console.log('  • Backend returned: { status: true, data: [], source: "backend" }');
      console.log('  • Component should display: "No data available" message');
      console.log('  • Badge should show: "BACKEND" (blue)\n');
    }

    console.log('═'.repeat(70) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function testAllFacilities() {
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║     ALL FACILITIES - ETIOLOGY DATA SOURCE CHECK                     ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  for (const facilityId of [1, 2, 3]) {
    try {
      const response = await fetch(`${API_BASE}/dashboard/wound-etiology`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Facility-Id': facilityId.toString()
        }
      });

      const result = await response.json();
      
      const dataInfo = result.data && Array.isArray(result.data) 
        ? `${result.data.length} records`
        : 'null';
      const sourceIcon = result.source === 'backend' ? '✅' : '⚠️';
      
      console.log(`${sourceIcon} Facility ${facilityId}:`);
      console.log(`   Source: ${result.source}`);
      console.log(`   Data: ${dataInfo}`);
      console.log('');
    } catch (error) {
      console.error(`❌ Facility ${facilityId}: ${error.message}`);
    }
  }

  console.log('═'.repeat(70) + '\n');
}

(async () => {
  await testEtiologyDataSource();
  await testAllFacilities();
})();

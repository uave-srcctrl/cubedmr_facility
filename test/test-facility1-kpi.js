#!/usr/bin/env node

/**
 * Test: Verify KPI data for facilityId 1
 * Check if backend is returning 0 or 42 for activeWounds
 */

const API_BASE = 'http://localhost:5000/api';

async function testFacility1KPI() {
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║     FACILITY 1 KPI DATA TEST                                         ║');
  console.log('║     Verify: activeWounds should be 0, not 42                         ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  try {
    console.log('📡 Fetching KPI data for facilityId: 1\n');
    
    const response = await fetch(`${API_BASE}/dashboard/kpis`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Facility-Id': '1'
      }
    });

    const result = await response.json();
    
    console.log('Response Status:', response.status);
    console.log('Response Status Text:', response.statusText);
    console.log('\n📊 Data Received:\n');
    console.log(JSON.stringify(result, null, 2));

    if (result.data) {
      console.log('\n🔍 KPI Values Analysis:\n');
      const data = result.data;
      
      console.log(`activeWounds: ${data.activeWounds} (Expected: 0, Got: ${data.activeWounds})`);
      console.log(`  Status: ${data.activeWounds === 0 ? '✅ CORRECT' : '❌ INCORRECT - Should be 0'}`);
      
      console.log(`\nhealingRate: ${data.healingRate} (Expected: 0, Got: ${data.healingRate})`);
      console.log(`  Status: ${data.healingRate === 0 ? '✅ CORRECT' : '❌ INCORRECT - Should be 0'}`);
      
      console.log(`\nreportsGenerated: ${data.reportsGenerated} (Expected: 0, Got: ${data.reportsGenerated})`);
      console.log(`  Status: ${data.reportsGenerated === 0 ? '✅ CORRECT' : '❌ INCORRECT - Should be 0'}`);
      
      console.log(`\ncriticalCases: ${data.criticalCases} (Expected: 10, Got: ${data.criticalCases})`);
      console.log(`  Status: ${data.criticalCases === 10 ? '✅ CORRECT' : '❌ INCORRECT - Should be 10'}`);
      
      console.log(`\nData Source: ${result.source}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n═'.repeat(70) + '\n');
}

testFacility1KPI();

#!/usr/bin/env node

/**
 * Test: Verify Wound Etiology Distribution data source for facilityId 1
 * Check if backend is returning real data or mock data
 */

const API_BASE = 'http://localhost:5000/api';

async function testWoundEtiologyData() {
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║     WOUND ETIOLOGY DISTRIBUTION DATA SOURCE TEST                   ║');
  console.log('║     Facility ID: 1                                                 ║');
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
    console.log('\n📊 Data Received:\n');
    console.log(JSON.stringify(result, null, 2));

    if (result.data && Array.isArray(result.data)) {
      console.log('\n🔍 Data Analysis:\n');
      console.log(`Total Records: ${result.data.length}`);
      console.log('\nBreakdown:');
      
      let totalValue = 0;
      for (let i = 0; i < result.data.length; i++) {
        const item = result.data[i];
        const value = item.value || 0;
        totalValue += value;
        console.log(`  ${i + 1}. ${item.name}: ${value} (${item.fill})`);
      }
      
      console.log(`\nTotal Cases: ${totalValue}`);
      
      console.log('\n📋 Source Verification:\n');
      if (result.source === 'backend') {
        console.log('✅ Data Source: BACKEND');
        console.log('   Backend returned real data from: https://cubed-mr.app/api/reports/etiology-distribution/1/<date>');
      } else if (result.source === 'mock') {
        console.log('⚠️  Data Source: MOCK');
        console.log('   Backend failed or returned no data. Using mock/default data.');
        console.log('   Mock data: Pressure Ulcer(45), Venous Stasis(25), Diabetic(20), Arterial(5)');
      } else {
        console.log(`❓ Data Source: ${result.source}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n' + '═'.repeat(70) + '\n');
}

async function testAllFacilities() {
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║     WOUND ETIOLOGY DATA SOURCE FOR ALL FACILITIES                  ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  for (const facilityId of [1, 2, 3]) {
    try {
      console.log(`📡 Facility ${facilityId}:`);
      
      const response = await fetch(`${API_BASE}/dashboard/wound-etiology`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Facility-Id': facilityId.toString()
        }
      });

      const result = await response.json();
      
      if (result.data && Array.isArray(result.data)) {
        const totalValue = result.data.reduce((sum, item) => sum + (item.value || 0), 0);
        const source = result.source === 'backend' ? '✅ BACKEND' : '⚠️  MOCK';
        console.log(`   Source: ${source}`);
        console.log(`   Records: ${result.data.length}`);
        console.log(`   Total Cases: ${totalValue}`);
        console.log(`   Data: ${result.data.map(d => `${d.name}(${d.value})`).join(', ')}`);
      }
      console.log('');
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }

  console.log('═'.repeat(70) + '\n');
}

(async () => {
  await testWoundEtiologyData();
  await testAllFacilities();
})();

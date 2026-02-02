#!/usr/bin/env node

/**
 * Debug: Check what's happening with the backend etiology endpoint
 */

const BACKEND_URL = 'https://cubed-mr.app/api';
const today = new Date().toISOString().split('T')[0];

async function debugEtiologyBackend() {
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║     DEBUG: WOUND ETIOLOGY BACKEND ENDPOINT                          ║');
  console.log('║     Checking: https://cubed-mr.app/api/reports/etiology-distribution ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  for (const facilityId of [1, 2, 3]) {
    const url = `${BACKEND_URL}/reports/etiology-distribution/${facilityId}/${today}`;
    console.log(`\n🔍 Facility ${facilityId}:`);
    console.log(`   URL: ${url}`);
    
    try {
      console.log(`   Fetching...`);
      const response = await fetch(url);
      console.log(`   Status: ${response.status} ${response.statusText}`);
      
      const contentType = response.headers.get('content-type');
      console.log(`   Content-Type: ${contentType}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Response received`);
        console.log(`   Data: ${JSON.stringify(data, null, 2).substring(0, 300)}...`);
      } else {
        const text = await response.text();
        console.log(`   ❌ Response error`);
        console.log(`   Body: ${text.substring(0, 200)}...`);
      }
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }

  console.log('\n' + '═'.repeat(70) + '\n');
}

debugEtiologyBackend();

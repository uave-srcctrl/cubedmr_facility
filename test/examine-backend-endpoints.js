#!/usr/bin/env node

/**
 * Test: Examine Existing Backend Endpoints for Wounds by Status Data
 * Check if we can extract status information from existing endpoints
 */

const BACKEND_URL = 'https://cubed-mr.app/api';

async function examineBackendEndpoints() {
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║     EXAMINE: Existing Backend Endpoints                             ║');
  console.log('║     Looking for wounds status/administrative status data             ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  const facilityId = 1;
  const today = new Date().toISOString().split('T')[0];

  // Check wound-outcome endpoint
  console.log('1. Wound Outcome Endpoint:\n');
  try {
    const url = `${BACKEND_URL}/reports/facility-wound-outcome/${facilityId}/2025-01-01/${today}`;
    console.log(`   URL: ${url}`);
    
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Status: 200 OK`);
      if (data.data && Array.isArray(data.data)) {
        console.log(`   Data records: ${data.data.length}`);
        console.log(`   Sample: ${JSON.stringify(data.data[0], null, 2).substring(0, 400)}...`);
      }
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  console.log('\n' + '═'.repeat(70));
  console.log('\n2. Acuity Index Endpoint:\n');
  try {
    const url = `${BACKEND_URL}/reports/facility-acuity-index/${facilityId}`;
    console.log(`   URL: ${url}`);
    
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Status: 200 OK`);
      if (data.data && Array.isArray(data.data)) {
        console.log(`   Data records: ${data.data.length}`);
        console.log(`   Sample: ${JSON.stringify(data.data[0], null, 2).substring(0, 400)}...`);
      }
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  console.log('\n' + '═'.repeat(70));
  console.log('\n3. Healing Status Endpoint:\n');
  try {
    const url = `${BACKEND_URL}/reports/facility-healing-status/${facilityId}`;
    console.log(`   URL: ${url}`);
    
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Status: 200 OK`);
      if (data.data && Array.isArray(data.data)) {
        console.log(`   Data records: ${data.data.length}`);
        console.log(`   Sample: ${JSON.stringify(data.data[0], null, 2).substring(0, 400)}...`);
      }
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  console.log('\n' + '═'.repeat(70));
  console.log('\n🔍 FINDINGS:\n');
  
  console.log('The backend does not have a dedicated "wounds-by-status" endpoint.');
  console.log('');
  console.log('Options:');
  console.log('1. Keep using mock data (current implementation)');
  console.log('2. Request backend team to add wounds-by-status endpoint');
  console.log('3. Derive status from other endpoints if possible');
  console.log('4. Use acuity-index data to estimate wound distribution\n');

  console.log('═'.repeat(70) + '\n');
}

examineBackendEndpoints();

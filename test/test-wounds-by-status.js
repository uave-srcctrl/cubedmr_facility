#!/usr/bin/env node

/**
 * Test: Verify Wounds by Status Endpoint
 * Check if backend endpoint is responding and returning data
 */

const API_BASE = 'http://localhost:5000/api';
const BACKEND_URL = 'https://cubed-mr.app/api';

async function testWoundsByStatusEndpoint() {
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║     WOUNDS BY STATUS - ENDPOINT VERIFICATION                       ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  // First check local endpoint
  console.log('📡 1. Testing Local Server Endpoint\n');
  console.log('Endpoint: GET /api/dashboard/wounds-by-status');
  console.log('Headers: X-Facility-Id: 1\n');

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
    
    console.log(`Response Data Source: ${result.source}`);
    console.log(`Response Status: ${result.status}`);
    console.log(`Data Records: ${result.data ? (Array.isArray(result.data) ? result.data.length : 'object') : 'null'}`);
    
    console.log('\n📊 Response:');
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }

  console.log('\n' + '═'.repeat(70));

  // Check backend endpoint directly
  console.log('\n📡 2. Testing Backend Remote Endpoint\n');
  
  const today = new Date().toISOString().split('T')[0];
  const backendUrl = `${BACKEND_URL}/reports/facility-wound-status/1/${today}`;
  console.log(`Endpoint: ${backendUrl}\n`);

  try {
    const response = await fetch(backendUrl);
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend is responding\n');
      console.log('Response:');
      console.log(JSON.stringify(data, null, 2).substring(0, 500));
    } else {
      const text = await response.text();
      console.log('❌ Backend returned error\n');
      console.log('Response:');
      console.log(text.substring(0, 300));
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }

  console.log('\n' + '═'.repeat(70));
  console.log('\n🔍 SUMMARY:\n');
  console.log('Wounds by Status endpoint checks all 3 facilities:');
  console.log('');

  for (const facilityId of [1, 2, 3]) {
    try {
      const response = await fetch(`${API_BASE}/dashboard/wounds-by-status`, {
        headers: {
          'X-Facility-Id': facilityId.toString()
        }
      });
      
      const result = await response.json();
      const dataInfo = result.data 
        ? (Array.isArray(result.data) ? `${result.data.length} records` : 'object data')
        : 'null';
      
      console.log(`✅ Facility ${facilityId}: ${result.source} - ${dataInfo}`);
    } catch (error) {
      console.error(`❌ Facility ${facilityId}: ${error.message}`);
    }
  }

  console.log('\n' + '═'.repeat(70) + '\n');
}

testWoundsByStatusEndpoint();

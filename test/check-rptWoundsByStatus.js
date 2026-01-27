#!/usr/bin/env node

/**
 * Test: Check if rptWoundsByStatus endpoint exists in backend
 */

const BACKEND_URL = 'https://cubed-mr.app/api';

async function checkRptWoundsByStatusEndpoint() {
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║     BACKEND ENDPOINT SEARCH: rptWoundsByStatus                      ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  const facilityId = 1;
  const today = new Date().toISOString().split('T')[0];

  // Possible variations of the endpoint
  const possibleEndpoints = [
    { name: 'rptWoundsByStatus', path: `/rptWoundsByStatus/${facilityId}` },
    { name: 'rptWoundsByStatus with date', path: `/rptWoundsByStatus/${facilityId}/${today}` },
    { name: 'reports/wounds-by-status', path: `/reports/wounds-by-status/${facilityId}` },
    { name: 'reports/wounds-by-status with date', path: `/reports/wounds-by-status/${facilityId}/${today}` },
    { name: 'reports/rptWoundsByStatus', path: `/reports/rptWoundsByStatus/${facilityId}` },
    { name: 'get endpoint with entity', path: `/get` },
  ];

  console.log('Testing possible endpoints:\n');

  for (const endpoint of possibleEndpoints) {
    const url = `${BACKEND_URL}${endpoint.path}`;
    console.log(`Testing: ${endpoint.name}`);
    console.log(`  URL: ${url}`);
    
    try {
      const response = await fetch(url);
      
      if (response.status === 200) {
        const data = await response.json();
        console.log(`  ✅ Status: 200 OK`);
        
        if (data.data) {
          if (Array.isArray(data.data)) {
            console.log(`  ✅ Has data: ${data.data.length} records`);
            if (data.data.length > 0) {
              console.log(`  Sample: ${JSON.stringify(data.data[0]).substring(0, 150)}...`);
            }
          } else {
            console.log(`  ✅ Data type: ${typeof data.data}`);
            console.log(`  Structure: ${JSON.stringify(data.data).substring(0, 200)}...`);
          }
        }
      } else {
        console.log(`  ❌ Status: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    console.log('');
  }

  console.log('═'.repeat(70));
  console.log('\n🔍 ADDITIONAL SEARCH:\n');

  // Check if it's a POST endpoint or requires parameters
  console.log('Checking if rptWoundsByStatus is a POST endpoint:\n');
  
  try {
    const url = `${BACKEND_URL}/rptWoundsByStatus`;
    console.log(`URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        facilityId: facilityId,
        date: today
      })
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Response received`);
      console.log(`Data: ${JSON.stringify(data).substring(0, 300)}...`);
    }
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }

  console.log('\n' + '═'.repeat(70));
  console.log('\n📋 FINDINGS:\n');

  console.log('Checking for rptWoundsByStatus endpoint...');
  console.log('');
  console.log('If the endpoint exists, it would return data in format:');
  console.log('{');
  console.log('  "status": true,');
  console.log('  "data": [');
  console.log('    { "status": "Admitted", "count": 12 },');
  console.log('    { "status": "Active", "count": 45 },');
  console.log('    { "status": "Resolved", "count": 32 },');
  console.log('    { "status": "Hospitalized", "count": 4 }');
  console.log('  ]');
  console.log('}');
  console.log('');
  console.log('═'.repeat(70) + '\n');
}

checkRptWoundsByStatusEndpoint();

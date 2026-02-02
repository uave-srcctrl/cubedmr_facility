#!/usr/bin/env node

/**
 * Test: Find Backend Endpoint for Wounds by Status
 * Check available backend endpoints that might have wound status data
 */

const BACKEND_URL = 'https://cubed-mr.app/api';

async function findWoundStatusEndpoint() {
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║     SEARCH: Backend Endpoint for Wounds by Status                   ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  const today = new Date().toISOString().split('T')[0];
  const facilityId = 1;

  // Possible endpoint patterns
  const possibleEndpoints = [
    { name: 'Wound Status', path: `/reports/facility-wound-status/${facilityId}/${today}` },
    { name: 'Wound Status (no date)', path: `/reports/facility-wound-status/${facilityId}` },
    { name: 'Wounds Administrative', path: `/reports/wounds-administrative-status/${facilityId}/${today}` },
    { name: 'Facility Wounds List', path: `/reports/facility-wounds-list/${facilityId}/${today}` },
    { name: 'Active Wounds', path: `/reports/active-wounds/${facilityId}/${today}` },
    { name: 'Facility Report', path: `/reports/facility-report/${facilityId}/${today}` },
    { name: 'Wound Acuity', path: `/reports/facility-acuity-index/${facilityId}` },
  ];

  console.log('Testing possible backend endpoints:\n');

  for (const endpoint of possibleEndpoints) {
    const url = `${BACKEND_URL}${endpoint.path}`;
    console.log(`Testing: ${endpoint.name}`);
    console.log(`  URL: ${url}`);
    
    try {
      const response = await fetch(url);
      
      if (response.status === 200) {
        const data = await response.json();
        console.log(`  ✅ Status: 200 OK`);
        
        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
          console.log(`  ✅ Has data: ${data.data.length} records`);
          console.log(`  Sample: ${JSON.stringify(data.data[0]).substring(0, 150)}...`);
        } else if (data.data && Array.isArray(data.data) && data.data.length === 0) {
          console.log(`  ℹ️  Empty array`);
        } else if (data.data) {
          console.log(`  ℹ️  Data type: ${typeof data.data}`);
          console.log(`  Structure: ${JSON.stringify(data.data).substring(0, 200)}...`);
        }
      } else {
        console.log(`  ❌ Status: ${response.status}`);
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    console.log('');
  }

  console.log('═'.repeat(70) + '\n');
}

findWoundStatusEndpoint();

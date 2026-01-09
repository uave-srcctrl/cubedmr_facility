#!/usr/bin/env node

/**
 * Find the real wounds by status endpoint in the backend
 */

const BACKEND_URL = 'https://cubed-mr.app/api';
const facilityId = 1;

const endpoints = [
  { path: `/rptWoundsByStatus/${facilityId}`, name: 'rptWoundsByStatus' },
  { path: `/reports/wounds-by-status/${facilityId}`, name: 'wounds-by-status' },
  { path: `/dashboard/wounds-by-status/${facilityId}`, name: 'dashboard wounds-by-status' },
  { path: `/wounds-by-status/${facilityId}`, name: 'wounds-by-status direct' },
  { path: `/facility-wounds-status/${facilityId}`, name: 'facility-wounds-status' },
  { path: `/reports/facility-wounds-status/${facilityId}`, name: 'reports facility-wounds-status' },
];

async function findEndpoint() {
  console.log('\n🔍 Searching for real wounds by status endpoint...\n');

  for (const endpoint of endpoints) {
    try {
      const url = `${BACKEND_URL}${endpoint.path}`;
      console.log(`Testing: ${endpoint.name}`);
      console.log(`  URL: ${url}`);
      
      const response = await fetch(url);
      console.log(`  Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`  ✅ SUCCESS - Found real data!`);
        console.log(`  Response: ${JSON.stringify(data, null, 2).substring(0, 300)}...`);
        console.log('\n✅ USE THIS ENDPOINT:', endpoint.path, '\n');
        return endpoint.path;
      } else if (response.status === 404) {
        console.log(`  ❌ Not found\n`);
      } else {
        console.log(`  ⚠️  Error: ${response.statusText}\n`);
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}\n`);
    }
  }

  console.log('❌ No real endpoint found. Using acuity-index fallback.\n');
  return null;
}

findEndpoint();

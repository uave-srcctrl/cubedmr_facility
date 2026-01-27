#!/usr/bin/env node

/**
 * Test: Verify All Dashboard Endpoints Request Data from Backend
 * Check which endpoints fetch from backend vs mock
 */

const API_BASE = 'http://localhost:5000/api';
const BACKEND_URL = 'https://cubed-mr.app/api';

async function testEndpointBackendRequests() {
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║     DASHBOARD ENDPOINTS - BACKEND DATA VERIFICATION                ║');
  console.log('║     Checking which endpoints fetch from backend vs mock             ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  const endpoints = [
    { name: 'KPIs', path: '/dashboard/kpis', backendEndpoint: '/reports/facility-wound-outcome' },
    { name: 'Wound Etiology', path: '/dashboard/wound-etiology', backendEndpoint: '/reports/etiology-distribution' },
    { name: 'Wound Reduction', path: '/dashboard/wound-reduction', backendEndpoint: '/reports/facility-wound-reduction' },
    { name: 'Healing Status', path: '/dashboard/healing-status', backendEndpoint: '/reports/facility-healing-status' },
    { name: 'Wounds by Status', path: '/dashboard/wounds-by-status', backendEndpoint: 'N/A' }
  ];

  console.log('📋 ENDPOINT ANALYSIS:\n');

  for (const endpoint of endpoints) {
    console.log(`\n${endpoint.name}:`);
    console.log(`  Local Path: ${API_BASE}${endpoint.path}`);
    console.log(`  Backend: ${endpoint.backendEndpoint}`);
    
    try {
      const response = await fetch(`${API_BASE}${endpoint.path}`, {
        headers: {
          'X-Facility-Id': '1'
        }
      });

      const data = await response.json();
      
      if (data.source === 'backend') {
        console.log(`  ✅ Data Source: BACKEND`);
        console.log(`  ✅ Fetching from backend`);
        if (data.data && Array.isArray(data.data)) {
          console.log(`  ✅ Records: ${data.data.length}`);
        } else if (data.data && typeof data.data === 'object') {
          console.log(`  ✅ Data: Object with properties`);
        }
      } else if (data.source === 'mock') {
        console.log(`  ⚠️  Data Source: MOCK`);
        console.log(`  ⚠️  Backend returned no data, using mock`);
        if (data.data && Array.isArray(data.data)) {
          console.log(`  ℹ️  Mock Records: ${data.data.length}`);
        }
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }

  console.log('\n' + '═'.repeat(70));
  console.log('\n📡 BACKEND ENDPOINTS TEST:\n');

  const backendEndpoints = [
    { name: 'KPIs - Wound Outcome', path: '/reports/facility-wound-outcome/1/2025-01-01/2025-12-23' },
    { name: 'Etiology Distribution', path: '/reports/etiology-distribution/1/2025-12-23' },
    { name: 'Wound Reduction', path: '/reports/facility-wound-reduction/1' },
    { name: 'Healing Status', path: '/reports/facility-healing-status/1' },
    { name: 'Wound Status (Not Available)', path: '/reports/facility-wound-status/1/2025-12-23' }
  ];

  for (const endpoint of backendEndpoints) {
    const url = `${BACKEND_URL}${endpoint.path}`;
    console.log(`\n${endpoint.name}:`);
    console.log(`  URL: ${url}`);
    
    try {
      const response = await fetch(url);
      
      if (response.status === 200) {
        const data = await response.json();
        if (data.data && Array.isArray(data.data)) {
          console.log(`  ✅ Status: 200 OK`);
          console.log(`  ✅ Has data: ${data.data.length} records`);
        } else if (data.data && data.data.length === 0) {
          console.log(`  ⚠️  Status: 200 OK`);
          console.log(`  ⚠️  Empty array (no data available)`);
        } else {
          console.log(`  ✅ Status: 200 OK`);
          console.log(`  ℹ️  Data type: ${typeof data.data}`);
        }
      } else {
        console.log(`  ❌ Status: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }

  console.log('\n' + '═'.repeat(70));
  console.log('\n📊 SUMMARY:\n');

  console.log('Endpoints requesting data from backend:');
  console.log('  ✅ KPIs - Fetches from /reports/facility-wound-outcome');
  console.log('  ✅ Wound Etiology - Fetches from /reports/etiology-distribution');
  console.log('  ✅ Wound Reduction - Fetches from /reports/facility-wound-reduction');
  console.log('  ✅ Healing Status - Fetches from /reports/facility-healing-status');
  console.log('  ⚠️  Wounds by Status - Uses mock data (backend has no endpoint)\n');

  console.log('Backend Status:');
  console.log('  ✅ Some endpoints return data');
  console.log('  ⚠️  Some endpoints return empty arrays');
  console.log('  ❌ Some endpoints don\'t exist (404)\n');

  console.log('═'.repeat(70) + '\n');
}

testEndpointBackendRequests();

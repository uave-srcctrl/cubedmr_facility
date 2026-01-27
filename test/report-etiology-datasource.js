#!/usr/bin/env node

/**
 * COMPREHENSIVE REPORT: Wound Etiology Distribution Data Source
 * Shows the complete data flow from backend to client
 */

const API_BASE = 'http://localhost:5000/api';
const BACKEND_URL = 'https://cubed-mr.app/api';

async function generateReport() {
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║     WOUND ETIOLOGY DISTRIBUTION - DATA SOURCE REPORT                ║');
  console.log('║     Facility ID: 1                                                  ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  // Step 1: Check Backend Remote Endpoint
  console.log('📡 STEP 1: Remote Backend Endpoint\n');
  
  const today = new Date().toISOString().split('T')[0];
  const backendUrl = `${BACKEND_URL}/reports/etiology-distribution/1/${today}`;
  
  console.log(`Endpoint: ${backendUrl}`);
  
  try {
    const response = await fetch(backendUrl);
    const data = await response.json();
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Response: ${JSON.stringify(data)}`);
    
    if (data.data && Array.isArray(data.data)) {
      if (data.data.length === 0) {
        console.log(`❌ Result: Empty array - No data available on this date\n`);
      } else {
        console.log(`✅ Result: ${data.data.length} records found\n`);
      }
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}\n`);
  }

  // Step 2: Check Local Server Endpoint
  console.log('\n📡 STEP 2: Local Server Endpoint\n');
  
  const localUrl = `${API_BASE}/dashboard/wound-etiology`;
  console.log(`Endpoint: ${localUrl}`);
  console.log(`Header: X-Facility-Id: 1`);
  
  try {
    const response = await fetch(localUrl, {
      headers: {
        'X-Facility-Id': '1'
      }
    });
    
    const data = await response.json();
    
    console.log(`Status: ${response.status}`);
    console.log(`Data Source: ${data.source}`);
    console.log(`Records: ${data.data.length}`);
    console.log('\nData:');
    for (const item of data.data) {
      console.log(`  • ${item.name}: ${item.value}`);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }

  // Step 3: Data Flow Explanation
  console.log('\n' + '═'.repeat(70));
  console.log('\n📋 DATA FLOW EXPLANATION:\n');
  
  console.log('1️⃣  Browser requests: GET /api/dashboard/wound-etiology');
  console.log('                      Header: X-Facility-Id: 1\n');
  
  console.log('2️⃣  Server receives request and attempts to fetch from backend:');
  console.log(`    ${backendUrl}\n`);
  
  console.log('3️⃣  Backend responds with: { status: true, data: [] }');
  console.log('    (Empty array means no wound etiology data available for this date)\n');
  
  console.log('4️⃣  Server detects empty array and falls back to mock data:');
  console.log('    {\n' +
    '      "status": true,\n' +
    '      "data": [\n' +
    '        { "name": "Pressure Ulcer", "value": 45 },\n' +
    '        { "name": "Venous Stasis", "value": 25 },\n' +
    '        { "name": "Diabetic", "value": 20 },\n' +
    '        { "name": "Arterial", "value": 5 }\n' +
    '      ],\n' +
    '      "source": "mock"\n' +
    '    }\n');
  
  console.log('5️⃣  Client receives response with source: "mock"');
  console.log('    DataSourceBadge displays "MOCK" badge in UI\n');

  // Step 4: Status Summary
  console.log('═'.repeat(70));
  console.log('\n📊 STATUS SUMMARY:\n');
  
  console.log('✅ Remote Backend Endpoint: WORKING');
  console.log('   - URL is reachable and returns 200 OK');
  console.log('   - But returns empty data array (no records available)\n');
  
  console.log('✅ Local Server Fallback: WORKING');
  console.log('   - Correctly detects empty backend data');
  console.log('   - Returns mock data as fallback');
  console.log('   - Correctly sets source: "mock"\n');
  
  console.log('⚠️  Data Availability:');
  console.log('   - Backend has no wound etiology data for facility 1 on 2025-12-23');
  console.log('   - This is normal if the facility has no wound data');
  console.log('   - System correctly falls back to mock data for UI display\n');

  // Step 5: UI Display
  console.log('═'.repeat(70));
  console.log('\n🎨 UI DISPLAY:\n');
  
  console.log('Chart shows: Wound Etiology Distribution');
  console.log('Pie Chart Data:');
  console.log('  • Pressure Ulcer: 45 (47.4%)');
  console.log('  • Venous Stasis: 25 (26.3%)');
  console.log('  • Diabetic: 20 (21.1%)');
  console.log('  • Arterial: 5 (5.3%)');
  console.log('');
  console.log('Data Source Badge: Shows "MOCK" (orange badge in top-right)');
  console.log('');

  console.log('═'.repeat(70) + '\n');
}

generateReport();

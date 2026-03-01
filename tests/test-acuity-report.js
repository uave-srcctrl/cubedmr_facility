#!/usr/bin/env node

/**
 * Test Facility Acuity Index API Endpoint
 * 
 * Tests the complete flow:
 * 1. React Client → Express → Apache → Slim → PHP → SQL Server
 * 
 * Run: npm run dev (must be running first)
 * Then in another terminal: node test-acuity-report.js
 */

const http = require('http');

const API_BASE = 'http://localhost:5000/facility/api';
const facilityId = '1';
const testDate = '2026-01-20';

console.log('╔════════════════════════════════════════════════════════════════════════╗');
console.log('║      TEST: Facility Acuity Index for facilityId=1, date=2026-01-20    ║');
console.log('╚════════════════════════════════════════════════════════════════════════╝\n');

// ============================================================
// TEST 1: Check Express server is running
// ============================================================
console.log('TEST 1: Check if Express server is running');
console.log('─'.repeat(70));

const checkHealth = new Promise((resolve) => {
  const req = http.get(`${API_BASE}/health`, (res) => {
    if (res.statusCode === 200) {
      console.log('✅ Express server is running on localhost:5000\n');
      resolve(true);
    } else {
      console.log(`❌ Express server returned status ${res.statusCode}\n`);
      resolve(false);
    }
  });

  req.on('error', (err) => {
    console.log(`❌ Cannot connect to Express server: ${err.message}`);
    console.log('   Make sure: npm run dev is running\n');
    resolve(false);
  });
});

checkHealth.then((serverRunning) => {
  if (!serverRunning) {
    console.log('⚠️  Cannot proceed without Express server\n');
    process.exit(1);
  }

  // ============================================================
  // TEST 2: Call Facility Acuity Index with both dates
  // ============================================================
  console.log('TEST 2: Call Facility Acuity Index Endpoint');
  console.log('─'.repeat(70));
  console.log('Endpoint: POST /facility/api/facility-acuity-index');
  console.log(`Request Body:\n${JSON.stringify({
    facility_id: facilityId,
    facilityId: facilityId,
    dos: testDate
  }, null, 2)}\n`);

  const postData = JSON.stringify({
    facility_id: facilityId,
    facilityId: facilityId,
    dos: testDate
  });

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/facility/api/facility-acuity-index',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'X-Facility-Id': facilityId
    }
  };

  const req = http.request(options, (res) => {
    let responseData = '';

    res.on('data', (chunk) => {
      responseData += chunk;
    });

    res.on('end', () => {
      console.log(`Status Code: ${res.statusCode}`);
      console.log(`Response:\n${responseData}\n`);

      // Parse and analyze response
      try {
        const parsedResponse = JSON.parse(responseData);
        
        if (res.statusCode === 200) {
          if (parsedResponse.data && parsedResponse.data.length > 0) {
            console.log(`✅ API returned ${parsedResponse.data.length} row(s)\n`);
            
            console.log('Data Structure:');
            parsedResponse.data.forEach((row, idx) => {
              console.log(`  Row ${idx + 1}:`);
              Object.entries(row).forEach(([key, value]) => {
                console.log(`    ${key}: ${value}`);
              });
            });
            console.log('');
            
            console.log('═'.repeat(70));
            console.log('✅ SUCCESS - Data is returned from API');
            console.log('═'.repeat(70));
            console.log('\nNow check in React:');
            console.log('1. Open http://localhost:5173 (or your dev server URL)');
            console.log('2. Navigate to AcuityReport page');
            console.log('3. Check browser console (F12) for any errors');
            console.log('4. Component should display data in cards above');
            
          } else if (parsedResponse.data && parsedResponse.data.length === 0) {
            console.log('⚠️  API returned empty array\n');
            console.log('═'.repeat(70));
            console.log('❌ ISSUE: SQL SP returned no rows');
            console.log('═'.repeat(70));
            console.log('\nPossible causes:');
            console.log('1. No wound_encounters data for facility 1');
            console.log('2. No data on or near date 2026-01-20');
            console.log('3. SP [facility].[report_FacilityAcuityIndex] not returning data');
            console.log('\nCheck SQL Server directly with:');
            console.log('  EXEC [facility].[report_FacilityAcuityIndex] @facilityId = 1, @startDate = \'2026-01-20\'');
            
          } else {
            console.log('⚠️  Unexpected response format\n');
            console.log(JSON.stringify(parsedResponse, null, 2));
          }
        } else {
          console.log(`❌ API returned error status ${res.statusCode}\n`);
          if (parsedResponse.error) {
            console.log(`Error: ${parsedResponse.error}`);
          }
          if (parsedResponse.details) {
            console.log(`Details: ${parsedResponse.details}`);
          }
        }
      } catch (e) {
        console.log(`❌ Failed to parse JSON response: ${e.message}`);
        console.log(`Raw response: ${responseData}`);
      }

      console.log('\n');
    });
  });

  req.on('error', (err) => {
    console.log(`❌ Request failed: ${err.message}\n`);
    console.log('Possible issues:');
    console.log('1. Express server not running');
    console.log('2. Port 5000 is in use');
    console.log('3. Network connectivity issue');
  });

  req.write(postData);
  req.end();
});

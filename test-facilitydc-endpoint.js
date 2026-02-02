#!/usr/bin/env node

/**
 * Test script for FacilityDataCenter endpoint
 * 
 * This script simulates the client request to test the server handler
 * for the new FacilityDataCenter entity with lstFacilitiesByWounds method
 */

const http = require('http');

// Test payload - same as what React client sends
const testPayload = {
  entity: "FacilityDataCenter",
  method: "lstFacilitiesByWounds",
  email: "drperez@curisec.com",
  token: "E95C2109-9945-4CE5-8026-82844C13E8FE",
  providerId: "5"
};

console.log('\n===== FacilityDataCenter Endpoint Test =====\n');
console.log('Test Payload:', JSON.stringify(testPayload, null, 2));

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/get',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(JSON.stringify(testPayload))
  }
};

const req = http.request(options, (res) => {
  console.log(`\nStatus: ${res.statusCode}`);
  console.log('Headers:', res.headers);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\nResponse Body:');
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed, null, 2));
      
      if (parsed.status && parsed.data && Array.isArray(parsed.data)) {
        console.log(`\n✅ Success! Received ${parsed.data.length} facilities`);
        if (parsed.data.length > 0) {
          console.log('First facility:', JSON.stringify(parsed.data[0], null, 2));
        }
      } else if (parsed.error) {
        console.log(`\n❌ Error: ${parsed.error}`);
      } else {
        console.log('\n⚠️  Unexpected response format');
      }
    } catch (e) {
      console.log(data);
      console.log('\n❌ Failed to parse response as JSON');
    }
    process.exit(0);
  });
});

req.on('error', (error) => {
  console.error('\n❌ Request failed:', error.message);
  if (error.code === 'ECONNREFUSED') {
    console.error('   → Server is not running on localhost:5000');
    console.error('   → Start the server with: npm start (in server directory)');
  }
  process.exit(1);
});

console.log('Sending request to http://localhost:5000/api/get...\n');
req.write(JSON.stringify(testPayload));
req.end();

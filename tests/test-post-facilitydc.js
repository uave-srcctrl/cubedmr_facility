#!/usr/bin/env node
import http from 'http';

const testPayload = {
  entity: "FacilityDataCenter",
  method: "lstFacilitiesByWounds",
  email: "drperez@curisec.com",
  token: "E95C2109-9945-4CE5-8026-82844C13E8FE",
  providerId: "5"
};

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/facility/api/get',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(JSON.stringify(testPayload))
  }
};

console.log('\n═════════════════════════════════════════════════════════');
console.log('Testing FacilityDataCenter Endpoint');
console.log('═════════════════════════════════════════════════════════\n');

console.log('Request:');
console.log('  Method: POST');
console.log('  URL: http://localhost:5000/facility/api/get');
console.log('  Content-Type: application/json\n');

console.log('Payload:');
console.log(JSON.stringify(testPayload, null, 2));
console.log('\n─────────────────────────────────────────────────────────\n');

const req = http.request(options, (res) => {
  console.log('Response Status:', res.statusCode);
  console.log('Response Headers:', JSON.stringify(res.headers, null, 2));
  console.log('\n─────────────────────────────────────────────────────────\n');
  console.log('Response Body:\n');

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed, null, 2));
      
      console.log('\n─────────────────────────────────────────────────────────\n');
      
      if (parsed.status && parsed.data) {
        console.log('✅ SUCCESS');
        console.log('   Status: true');
        console.log(`   Facilities count: ${parsed.data.length}`);
        
        if (parsed.data.length > 0) {
          console.log('\n📋 First Facility Details:');
          const first = parsed.data[0];
          console.log(`   ID: ${first.id}`);
          console.log(`   Name: ${first.name}`);
          console.log(`   Total Encounters: ${first.total_wound_encounters}`);
          console.log(`   Active Wounds: ${first.active_wounds}`);
          console.log(`   Acuity Level: ${first.acuity_level}`);
          console.log(`   Average PUSH Score: ${first.average_push_score}`);
        }
      } else if (parsed.error) {
        console.log('❌ ERROR');
        console.log(`   Error: ${parsed.error}`);
        if (parsed.details) {
          console.log(`   Details: ${parsed.details}`);
        }
      } else {
        console.log('⚠️  UNEXPECTED RESPONSE FORMAT');
        console.log(JSON.stringify(parsed, null, 2));
      }
      
      console.log('\n═════════════════════════════════════════════════════════\n');
      process.exit(0);
    } catch (e) {
      console.log('❌ Failed to parse JSON response');
      console.log('Raw response:', data);
      console.log('\nParse error:', e.message);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
  console.error('   Make sure the server is running on port 5000');
  process.exit(1);
});

req.on('timeout', () => {
  console.error('❌ Request timeout');
  req.abort();
  process.exit(1);
});

req.setTimeout(5000);
req.write(JSON.stringify(testPayload));
req.end();

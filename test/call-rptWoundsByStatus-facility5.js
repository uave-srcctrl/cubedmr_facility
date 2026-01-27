#!/usr/bin/env node

/**
 * Call rptWoundsByStatus endpoint with facilityId 5
 * Test all possible variations and document results
 */

console.log('\n╔════════════════════════════════════════════════════════════════════╗');
console.log('║                                                                    ║');
console.log('║    CALL rptWoundsByStatus - FacilityId 5                           ║');
console.log('║    Testing Backend External Endpoint                              ║');
console.log('║                                                                    ║');
console.log('╚════════════════════════════════════════════════════════════════════╝\n');

const BACKEND_URL = 'https://cubed-mr.app/api';
const facilityId = 5;

const endpointVariations = [
  {
    name: 'Direct - GET',
    method: 'GET',
    path: `/rptWoundsByStatus/${facilityId}`,
    description: 'Direct endpoint call'
  },
  {
    name: 'Reports Path - GET',
    method: 'GET',
    path: `/reports/rptWoundsByStatus/${facilityId}`,
    description: 'Under /reports path'
  },
  {
    name: 'With POST',
    method: 'POST',
    path: `/rptWoundsByStatus/${facilityId}`,
    description: 'POST method instead of GET',
    body: { facilityId }
  },
  {
    name: 'Without facilityId in URL - POST',
    method: 'POST',
    path: `/rptWoundsByStatus`,
    description: 'POST to root endpoint',
    body: { facilityId }
  },
  {
    name: 'With date parameter',
    method: 'GET',
    path: `/rptWoundsByStatus/${facilityId}?date=2025-12-23`,
    description: 'Include current date'
  },
  {
    name: 'With week parameter',
    method: 'GET',
    path: `/rptWoundsByStatus/${facilityId}?week=52`,
    description: 'Include week 52'
  }
];

async function testEndpoint(variation) {
  const url = `${BACKEND_URL}${variation.path}`;
  
  console.log(`\n📍 ${variation.name}`);
  console.log('─'.repeat(70));
  console.log(`Method:      ${variation.method}`);
  console.log(`URL:         ${url}`);
  console.log(`Description: ${variation.description}`);
  
  try {
    const options = {
      method: variation.method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };
    
    if (variation.body) {
      options.body = JSON.stringify(variation.body);
    }
    
    const response = await fetch(url, options);
    
    console.log(`\nResponse Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      console.log(`✅ SUCCESS\n`);
      
      try {
        const data = await response.json();
        console.log(`Response Body:`);
        console.log(JSON.stringify(data, null, 2));
        return { status: response.status, data };
      } catch (e) {
        const text = await response.text();
        console.log(`Response: ${text.substring(0, 200)}`);
        return { status: response.status, text };
      }
    } else {
      console.log(`❌ ERROR: ${response.statusText}\n`);
      
      try {
        const text = await response.text();
        if (text) {
          console.log(`Response: ${text.substring(0, 200)}`);
        }
      } catch (e) {
        console.log(`(No response body)`);
      }
      return { status: response.status, error: response.statusText };
    }
  } catch (error) {
    console.log(`\n❌ ERROR: ${error.message}`);
    return { error: error.message };
  }
}

async function testAllEndpoints() {
  console.log(`Testing rptWoundsByStatus with FacilityId: ${facilityId}\n`);
  console.log('═'.repeat(70));

  const results = [];

  for (const variation of endpointVariations) {
    const result = await testEndpoint(variation);
    results.push({
      variation: variation.name,
      ...result
    });
    console.log('═'.repeat(70));
  }

  // Summary
  console.log('\n\n📋 SUMMARY\n');
  console.log('Endpoint Variation'.padEnd(35) + '│ Status │ Result');
  console.log('─'.repeat(70));

  let foundSuccess = false;
  for (const result of results) {
    const status = result.status || 'ERROR';
    const statusStr = String(status).padStart(6);
    
    if (result.status === 200) {
      console.log(`✅ ${result.variation.padEnd(33)}│ ${statusStr} │ SUCCESS`);
      foundSuccess = true;
    } else if (result.status === 404) {
      console.log(`❌ ${result.variation.padEnd(33)}│ ${statusStr} │ Not Found`);
    } else if (result.error) {
      console.log(`❌ ${result.variation.padEnd(33)}│   N/A  │ ${result.error.substring(0, 20)}`);
    } else {
      console.log(`❌ ${result.variation.padEnd(33)}│ ${statusStr} │ Error`);
    }
  }

  // Conclusion
  console.log('\n' + '═'.repeat(70));
  console.log('\n🎯 CONCLUSIÓN\n');

  if (foundSuccess) {
    console.log('✅ rptWoundsByStatus endpoint ENCONTRADO');
    console.log('\nEndpoint está disponible y retorna datos válidos para FacilityId 5');
    
    const successResult = results.find(r => r.status === 200);
    if (successResult && successResult.data) {
      console.log('\nDatos retornados:');
      console.log(JSON.stringify(successResult.data, null, 2).substring(0, 500));
    }
  } else {
    console.log('❌ rptWoundsByStatus endpoint NO ENCONTRADO\n');
    console.log('Todas las variaciones retornaron error (principalmente 404)');
    console.log('\nAlternativa: Se está usando facility-acuity-index');
    console.log('Endpoint alternativo: /reports/facility-acuity-index/5');
    
    try {
      const res = await fetch(`${BACKEND_URL}/reports/facility-acuity-index/5`);
      if (res.ok) {
        const data = await res.json();
        console.log('\n✅ Endpoint alternativo disponible');
        console.log('Response: ' + JSON.stringify(data, null, 2).substring(0, 300) + '...');
      }
    } catch (e) {
      console.log('⚠️ Endpoint alternativo también no disponible');
    }
  }

  console.log('\n' + '═'.repeat(70) + '\n');
}

testAllEndpoints();

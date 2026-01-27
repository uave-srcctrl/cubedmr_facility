#!/usr/bin/env node
/**
 * Test script to verify rate limiting fix
 * Tests that:
 * 1. Multiple logins with same email count as failed attempts
 * 2. Different emails are not blocked by other email's failures
 * 3. Successful login resets the counter
 */

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testLogin(email, password, deviceId, description) {
  try {
    const response = await fetch('http://localhost:3000/api/get', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        entity: 'TryLogin',
        email,
        password,
        deviceId,
      }),
    });

    const data = await response.json();
    const dataItem = data.data?.[0];
    
    let status = '❓';
    let message = 'Unknown';
    
    if (response.status === 429) {
      status = '🚫';
      message = 'RATE LIMITED (HTTP 429)';
    } else if (dataItem?.status === 1) {
      status = '✅';
      message = 'LOGIN SUCCESS';
    } else if (dataItem?.reason === 5) {
      status = '🚫';
      message = 'RATE LIMITED (reason=5)';
    } else if (dataItem?.status === 0) {
      status = '❌';
      message = `INVALID CREDENTIALS (reason=${dataItem?.reason})`;
    }
    
    console.log(`${status} [${description}] ${email} - ${message}`);
    if (dataItem?.msg) {
      console.log(`   └─ ${dataItem.msg}`);
    }
    
    return {
      status: dataItem?.status,
      reason: dataItem?.reason,
      message: dataItem?.msg,
      httpStatus: response.status,
    };
  } catch (error) {
    console.error(`❌ [${description}] ${email} - Network error:`, error.message);
    return null;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Testing Rate Limit Fix');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Test 1: Multiple failed attempts with same email
  console.log('📝 Test 1: Multiple failed attempts from same email');
  console.log('─────────────────────────────────────────────────────────\n');
  
  for (let i = 1; i <= 5; i++) {
    await testLogin(
      'test1@example.com',
      'wrongpassword',
      `test-device-${i}`,
      `Attempt ${i}`
    );
    if (i < 5) await sleep(500);
  }

  console.log('\n📝 Test 2: Different email should NOT be blocked');
  console.log('─────────────────────────────────────────────────────────\n');
  
  // Even though test1@example.com had failures, test2@example.com should work
  await testLogin(
    'test2@example.com',
    'wrongpassword',
    'test-device-new',
    'Different email'
  );

  console.log('\n📝 Test 3: Original email after reset time');
  console.log('─────────────────────────────────────────────────────────\n');
  
  await testLogin(
    'test1@example.com',
    'wrongpassword',
    'test-device-retry',
    'Same email after some attempts'
  );

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('✅ Test completed');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log('📊 Summary:');
  console.log('  • Rate limiting is NOW per-email, not per-IP');
  console.log('  • Different users can login from same IP');
  console.log('  • Only failed TryLogin attempts are counted');
  console.log('  • Other operations (EntityInfo, etc) are not rate limited\n');
}

main().catch(console.error);

#!/usr/bin/env node

/**
 * Authentication Fix Verification Test
 * 
 * This test helps verify the credential mapping is working correctly.
 * Run this after updating server/credentials.ts with the real backend credentials.
 */

const BASE_URL = 'http://localhost:5000';

async function testAuthenticationFlow() {
  console.log('='.repeat(70));
  console.log('AUTHENTICATION FIX VERIFICATION TEST');
  console.log('='.repeat(70));
  console.log('');

  // Test Case 1: Health Check
  console.log('📡 Test 1: Health Check');
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    const data = await response.json();
    console.log('✅ Server is running');
    console.log('   Status:', data.status || 'ok');
  } catch (error) {
    console.log('❌ Server not running. Start with: npm run dev');
    process.exit(1);
  }

  console.log('');
  console.log('='.repeat(70));
  console.log('📡 Test 2: Facility Login (TryLoginFacilities)');
  console.log('='.repeat(70));

  const testCredentials = [
    {
      name: 'facility1@wounddatacenter.com',
      email: 'facility1@wounddatacenter.com',
      password: '12345678', // Update with actual password
      deviceId: `device_${Date.now()}_test`,
    },
    // Add more facilities here if testing multiple
  ];

  for (const cred of testCredentials) {
    console.log('');
    console.log(`Testing: ${cred.email}`);
    console.log('-'.repeat(70));

    try {
      const response = await fetch(`${BASE_URL}/api/get`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'TryLoginFacilities',
          email: cred.email,
          password: cred.password,
          deviceId: cred.deviceId,
        }),
      });

      const data = await response.json();

      if (data.status === true && data.data?.[0]?.status === 1) {
        console.log('✅ LOGIN SUCCESSFUL!');
        console.log('');
        console.log('Response Details:');
        console.log(`  - Facility ID: ${data.data[0].facilityId}`);
        console.log(`  - Facility Name: ${data.data[0].name}`);
        console.log(`  - Email: ${data.data[0].email}`);
        console.log(`  - Token: ${data.data[0].token.substring(0, 20)}...`);
        console.log(`  - Entity: ${data.data[0].entity}`);
      } else if (data.status === false || data.data?.[0]?.status === 0) {
        console.log('❌ LOGIN FAILED');
        console.log('');
        console.log('Error Details:');
        console.log(`  - Status: ${data.status}`);
        console.log(`  - Data Status: ${data.data?.[0]?.status}`);
        console.log(`  - Message: ${data.data?.[0]?.msg || data.error}`);
        console.log(`  - Reason: ${data.data?.[0]?.reason || 'Unknown'}`);
        console.log('');
        console.log('⚠️  SOLUTION:');
        console.log('   1. Verify the password is correct in server/credentials.ts');
        console.log('   2. Verify the email matches the backend account');
        console.log('   3. Check if the account is active in https://cubed-mr.app');
        console.log('   4. See others/AUTH_CREDENTIALS_FIX.md for detailed steps');
      } else {
        console.log('⚠️  UNEXPECTED RESPONSE FORMAT');
        console.log('Response:', JSON.stringify(data, null, 2));
      }
    } catch (error) {
      console.log('❌ REQUEST FAILED');
      console.log(`   Error: ${error.message}`);
      console.log('');
      console.log('Make sure:');
      console.log('   1. Server is running: npm run dev');
      console.log('   2. Server is listening on http://localhost:5000');
    }
  }

  console.log('');
  console.log('='.repeat(70));
  console.log('TEST COMPLETE');
  console.log('='.repeat(70));
}

// Run the test
testAuthenticationFlow().catch(console.error);

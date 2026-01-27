#!/usr/bin/env node

/**
 * Test script for GET /api/user/facilities endpoint
 * Lists all facilities that a user has access to
 */

const BASE_URL = "http://localhost:5000";

// Test 1: Get facilities by email (GET method)
async function testGetFacilitiesByEmail() {
  console.log("\n=== Test 1: GET /api/user/facilities?email=... ===");

  const email = "facility1@wounddatacenter.com";

  try {
    const response = await fetch(`${BASE_URL}/api/user/facilities?email=${encodeURIComponent(email)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    console.log("Response:", JSON.stringify(data, null, 2));

    if (data.status && data.facilities && data.facilities.length > 0) {
      console.log(`✅ Found ${data.facilities.length} facilities`);
      console.log(`   Entity: ${data.entityName} (ID: ${data.entityId})`);
      console.log(`   Facilities: ${data.facilities.join(", ")}`);
    } else {
      console.log("⚠️  No facilities found. User may need to login first.");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

// Test 2: Get facilities by email (POST method)
async function testPostFacilitiesByEmail() {
  console.log("\n=== Test 2: POST /api/user/facilities ===");

  const email = "facility1@wounddatacenter.com";

  try {
    const response = await fetch(`${BASE_URL}/api/user/facilities`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    console.log("Response:", JSON.stringify(data, null, 2));

    if (data.status && data.facilities && data.facilities.length > 0) {
      console.log(`✅ Found ${data.facilities.length} facilities`);
      console.log(`   Entity: ${data.entityName} (ID: ${data.entityId})`);
      console.log(`   Facilities: ${data.facilities.join(", ")}`);
    } else {
      console.log("⚠️  No facilities found. User may need to login first.");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

// Test 3: Full workflow - Login then get facilities
async function testFullWorkflow() {
  console.log("\n=== Test 3: Full Workflow (Login → Get Facilities) ===");

  const email = "facility1@wounddatacenter.com";
  const password = "12345678";

  try {
    // Step 1: Login
    console.log("\nStep 1: Logging in...");
    const loginResponse = await fetch(`${BASE_URL}/api/get`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "TryLoginFacilities",
        email,
        password,
        deviceId: "test-device-" + Date.now(),
      }),
    });

    const loginData = await loginResponse.json();

    if (loginData.status !== 1 && loginData.status !== true) {
      console.log("❌ Login failed:", loginData);
      return;
    }

    console.log("✅ Login successful");
    console.log(`   Token received: ${loginData.data?.[0]?.token?.substring(0, 20)}...`);

    // Step 2: Get facilities
    console.log("\nStep 2: Getting facilities for user...");
    const facilitiesResponse = await fetch(`${BASE_URL}/api/user/facilities?email=${encodeURIComponent(email)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const facilitiesData = await facilitiesResponse.json();
    console.log("✅ Facilities retrieved:");
    console.log(JSON.stringify(facilitiesData, null, 2));

    if (facilitiesData.facilities && facilitiesData.facilities.length > 0) {
      console.log(`\n✅ User has access to ${facilitiesData.facilities.length} facility/facilities:`);
      facilitiesData.facilities.forEach((fac) => {
        console.log(`   - ${fac}`);
      });
    } else {
      console.log("\n⚠️  No facilities associated with this user");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

// Test 4: Test multiple users
async function testMultipleUsers() {
  console.log("\n=== Test 4: Multiple Users ===");

  const users = [
    "facility1@wounddatacenter.com",
    "facility2@wounddatacenter.com",
    "facility5@wounddatacenter.com",
  ];

  for (const email of users) {
    try {
      const response = await fetch(`${BASE_URL}/api/user/facilities?email=${encodeURIComponent(email)}`, {
        method: "GET",
      });
      const data = await response.json();

      const status = data.facilities && data.facilities.length > 0 ? "✅" : "⚠️ ";
      const facilityList = data.facilities ? data.facilities.join(", ") : "None";
      console.log(`${status} ${email}: [${facilityList}]`);
    } catch (error) {
      console.error(`❌ ${email}: ${error.message}`);
    }
  }
}

// Run all tests
async function runAllTests() {
  console.log("═".repeat(70));
  console.log("Testing /api/user/facilities Endpoint");
  console.log("═".repeat(70));

  await testGetFacilitiesByEmail();
  await testPostFacilitiesByEmail();
  await testFullWorkflow();
  await testMultipleUsers();

  console.log("\n" + "═".repeat(70));
  console.log("Tests completed!");
  console.log("═".repeat(70));
}

runAllTests().catch(console.error);

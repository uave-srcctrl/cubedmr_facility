#!/usr/bin/env node

/**
 * Force logout script for all authenticated facilities
 * Calls the remote backend to log out all facilities
 */

import crypto from "crypto";
const FACILITIES_API_URL = "https://cubed-mr.app/api/";

// List of facilities that need to be logged out
const facilitiesToLogout = [
  { email: "facility1@wounddatacenter.com", facilityId: 1 },
  { email: "facility4@wounddatacenter.com", facilityId: 4 },
  { email: "facility5@wounddatacenter.com", facilityId: 5 },
];

async function logoutFacility(email, facilityId) {
  try {
    console.log(`\n📤 Logging out ${email} (Facility ID: ${facilityId})...`);
    
    // facility-logout with proper parameters
    const formData = new URLSearchParams();
    formData.append("entity", "facility-logout");
    formData.append("facility_id", facilityId);
    formData.append("email", email);
    formData.append("deviceId", "force-logout-device");
    formData.append("encountertrackid", crypto.randomBytes(16).toString("hex"));
    
    const response = await fetch(FACILITIES_API_URL + "get", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });
    
    const responseText = await response.text();
    
    // Extract JSON if response contains HTML + JSON
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    let jsonResponse = {};
    if (jsonMatch) {
      try {
        jsonResponse = JSON.parse(jsonMatch[0]);
      } catch (e) {
        // Ignore JSON parse errors
      }
    }
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Status API: ${jsonResponse.status || 'unknown'}`);
    console.log(`   Message: ${jsonResponse.error || jsonResponse.msg || 'N/A'}`);
    
    return response.status === 200;
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function forceLogoutAll() {
  console.log("🔓 Starting forced logout for all facilities...\n");
  
  let successCount = 0;
  let failCount = 0;
  
  for (const facility of facilitiesToLogout) {
    const success = await logoutFacility(facility.email, facility.facilityId);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    // Wait 500ms between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log("\n" + "=".repeat(50));
  console.log(`✅ Logout Summary:`);
  console.log(`   - Successful: ${successCount}`);
  console.log(`   - Failed: ${failCount}`);
  console.log(`   - Total: ${facilitiesToLogout.length}`);
  console.log("=".repeat(50) + "\n");
}

forceLogoutAll().catch(console.error);

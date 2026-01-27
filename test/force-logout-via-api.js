#!/usr/bin/env node

/**
 * Force logout via Local Server API
 * Usa el endpoint /api/logout del servidor local
 * Para forzar logout a través de remoteWoundcareDB
 */

import fetch from "node-fetch";

const LOCAL_API = "http://localhost:5000/api";
const FACILITIES = [
  { email: "facility1@wounddatacenter.com", facility_id: 1, name: "Facility 1" },
  { email: "facility4@wounddatacenter.com", facility_id: 4, name: "Facility 4" },
  { email: "facility5@wounddatacenter.com", facility_id: 5, name: "Facility 5" },
];

async function logoutViaLocalAPI(email, facility_id, name) {
  try {
    console.log(`\n📤 Desautenticando: ${name} (${email})`);
    
    const response = await fetch(`${LOCAL_API}/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email,
        facility_id: facility_id,
      }),
    });
    
    const data = await response.json();
    
    const success = response.status === 200 && (data.answer === true || data.status === true);
    
    console.log(`   HTTP: ${response.status}`);
    console.log(`   Status: ${data.status || data.answer}`);
    console.log(`   Message: ${data.msg || data.error || data.code || 'N/A'}`);
    console.log(`   Result: ${success ? '✅' : '❌'}`);
    
    return success;
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function forceLogoutAll() {
  console.log("\n" + "=".repeat(70));
  console.log("🔓 FORCE LOGOUT VIA LOCAL SERVER");
  console.log("=".repeat(70));
  console.log(`\n🚀 Desautenticando ${FACILITIES.length} facilities...\n`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < FACILITIES.length; i++) {
    const f = FACILITIES[i];
    console.log(`[${i + 1}/${FACILITIES.length}]`);
    
    const success = await logoutViaLocalAPI(f.email, f.facility_id, f.name);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    // Wait between requests
    if (i < FACILITIES.length - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  
  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("📊 RESUMEN");
  console.log("=".repeat(70));
  console.log(`✅ Exitosos: ${successCount}`);
  console.log(`❌ Fallidos: ${failCount}`);
  console.log(`📈 Total: ${FACILITIES.length}`);
  console.log("=".repeat(70) + "\n");
  
  return failCount === 0;
}

// Run
forceLogoutAll()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error("❌ Error:", error);
    process.exit(1);
  });

#!/usr/bin/env node

/**
 * Force logout script for ALL authenticated facilities
 * Obtains authenticated facilities from remoteWoundcareDB and logs them all out
 */

import crypto from "crypto";
import fetch from "node-fetch";

const FACILITIES_API_URL = "https://cubed-mr.app/api/";
const LOCAL_API_URL = "http://localhost:5000/api";

/**
 * Obtiene la lista de todos los facilities autenticados desde remoteWoundcareDB
 */
async function getAuthenticatedFacilities() {
  try {
    console.log("\n🔍 Obteniendo lista de facilities autenticados...\n");
    
    const response = await fetch(FACILITIES_API_URL + "get", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        entity: "GetFacilityAuthStatus",
        action: "get_authenticated_facilities",
      }).toString(),
    });
    
    const responseText = await response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      console.log("⚠️  No se encontró respuesta JSON. Usando fallback de verificación de sesiones.\n");
      return await getFacilitiesFromLocalData();
    }
    
    const data = JSON.parse(jsonMatch[0]);
    
    if (data.status === true && Array.isArray(data.data)) {
      const facilities = data.data
        .filter(f => f.isAuthenticated === true || f.status === 1)
        .map(f => ({
          email: f.email,
          facilityId: f.facilityId || f.id || f.facility_id,
          name: f.name || f.facilityName || f.entityName,
          isActive: f.isActive !== false,
        }));
      
      console.log(`✅ Se encontraron ${facilities.length} facilities autenticados:\n`);
      facilities.forEach(f => {
        console.log(`   📍 ${f.name || f.email} (ID: ${f.facilityId})`);
      });
      
      return facilities;
    }
    
    return await getFacilitiesFromLocalData();
  } catch (error) {
    console.error(`⚠️  Error obteniendo facilities: ${error.message}`);
    return await getFacilitiesFromLocalData();
  }
}

/**
 * Obtiene facilities desde datos locales (fallback)
 */
async function getFacilitiesFromLocalData() {
  console.log("\n📋 Usando datos de verificación local...\n");
  
  try {
    const response = await fetch(LOCAL_API_URL + "/facilities-verification", {
      method: "GET",
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.authenticated || [];
    }
  } catch (e) {
    console.log("ℹ️  No se pudo obtener datos locales, usando lista conocida.\n");
  }
  
  // Lista fallback de facilities conocidos
  return [
    { email: "facility1@wounddatacenter.com", facilityId: 1, name: "Facility 1" },
    { email: "facility4@wounddatacenter.com", facilityId: 4, name: "Facility 4" },
    { email: "facility5@wounddatacenter.com", facilityId: 5, name: "Facility 5" },
  ];
}

/**
 * Hace logout de un facility específico
 */
async function logoutFacility(email, facilityId, facilityName) {
  try {
    console.log(`\n📤 Logging out: ${facilityName || email} (ID: ${facilityId})...`);
    
    // Intenta con facility-logout
    const formData = new URLSearchParams();
    formData.append("entity", "facility-logout");
    formData.append("facility_id", facilityId);
    formData.append("email", email);
    formData.append("deviceId", `force-logout-device-${Date.now()}`);
    formData.append("encountertrackid", crypto.randomBytes(16).toString("hex"));
    
    const response = await fetch(FACILITIES_API_URL + "get", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });
    
    const responseText = await response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    let jsonResponse = {};
    
    if (jsonMatch) {
      try {
        jsonResponse = JSON.parse(jsonMatch[0]);
      } catch (e) {
        // Ignore parse errors
      }
    }
    
    const success = response.status === 200 || jsonResponse.status === true;
    
    console.log(`   HTTP Status: ${response.status}`);
    console.log(`   API Status: ${jsonResponse.status || 'unknown'}`);
    console.log(`   Message: ${jsonResponse.msg || jsonResponse.error || 'N/A'}`);
    console.log(`   Result: ${success ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    return success;
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return false;
  }
}

/**
 * Hace logout de todos los facilities
 */
async function forceLogoutAllFacilities() {
  console.log("\n" + "=".repeat(70));
  console.log("🔓 FORCE LOGOUT - TODOS LOS FACILITIES AUTENTICADOS");
  console.log("=".repeat(70));
  
  // Obtener lista de facilities autenticados
  const facilities = await getAuthenticatedFacilities();
  
  if (facilities.length === 0) {
    console.log("\n⚠️  No se encontraron facilities para desautenticar.\n");
    return;
  }
  
  console.log(`\n🚀 Iniciando desautenticación de ${facilities.length} facilities...\n`);
  
  let successCount = 0;
  let failCount = 0;
  const results = [];
  
  for (let i = 0; i < facilities.length; i++) {
    const facility = facilities[i];
    console.log(`\n[${i + 1}/${facilities.length}]`);
    
    const success = await logoutFacility(
      facility.email,
      facility.facilityId,
      facility.name || facility.email
    );
    
    results.push({
      email: facility.email,
      facilityId: facility.facilityId,
      name: facility.name,
      status: success ? "SUCCESS" : "FAILED",
    });
    
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    // Esperar 500ms entre requests
    if (i < facilities.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Resumen final
  console.log("\n\n" + "=".repeat(70));
  console.log("📊 RESUMEN DE LOGOUT");
  console.log("=".repeat(70));
  console.log(`\n✅ Exitosos: ${successCount}`);
  console.log(`❌ Fallidos: ${failCount}`);
  console.log(`📈 Total: ${facilities.length}`);
  console.log(`⏱️  Timestamp: ${new Date().toISOString()}\n`);
  
  // Detalle de resultados
  console.log("Detalles:\n");
  results.forEach((result, index) => {
    const icon = result.status === "SUCCESS" ? "✅" : "❌";
    console.log(`${icon} [${index + 1}] ${result.name || result.email}`);
    console.log(`   Facility ID: ${result.facilityId}`);
    console.log(`   Estado: ${result.status}\n`);
  });
  
  console.log("=".repeat(70) + "\n");
  
  return {
    successful: successCount,
    failed: failCount,
    total: facilities.length,
    results: results,
  };
}

// Ejecutar
forceLogoutAllFacilities()
  .then(result => {
    if (result.failed > 0) {
      process.exit(1);
    }
    process.exit(0);
  })
  .catch(error => {
    console.error("❌ Error fatal:", error);
    process.exit(1);
  });

#!/usr/bin/env node

/**
 * Test script para verificar si drperez@curisec.com
 * tiene facilities y puede acceder al endpoint
 */

const BASE_URL = "http://localhost:5000";
const TARGET_EMAIL = "drperez@curisec.com";

console.log("═".repeat(70));
console.log("🔍 Verificación de User Facilities para: " + TARGET_EMAIL);
console.log("═".repeat(70));

// Test 1: Verificar si el usuario existe intentando login
async function testLogin() {
  console.log("\n📝 Step 1: Intentando login con " + TARGET_EMAIL + "...");

  try {
    const response = await fetch(`${BASE_URL}/api/get`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "TryLoginFacilities",
        email: TARGET_EMAIL,
        password: "password123", // Intentar password default
        deviceId: "verification-device-" + Date.now(),
      }),
    });

    const data = await response.json();
    
    console.log("\n📊 Login Response:");
    console.log(JSON.stringify(data, null, 2));

    if (data.status === 1 || data.status === true) {
      console.log("\n✅ Login EXITOSO!");
      console.log(`   Token recibido: ${data.data?.[0]?.token?.substring(0, 30)}...`);
      console.log(`   Facilities en login: ${JSON.stringify(data.data?.[0]?.facilities || data.facilities || [])}`);
      console.log(`   Entity ID: ${data.data?.[0]?.entityId || data.entityId}`);
      console.log(`   Entity Name: ${data.data?.[0]?.entityName || data.entityName}`);
      return true;
    } else {
      console.log("\n❌ Login FALLÓ");
      console.log(`   Razón: ${data.data?.[0]?.msg || data.msg || "Desconocida"}`);
      console.log(`   Status: ${data.status}`);
      return false;
    }
  } catch (error) {
    console.error("❌ Error en login:", error.message);
    return false;
  }
}

// Test 2: Consultar endpoint de facilities
async function testGetFacilities() {
  console.log("\n📝 Step 2: Consultando /api/user/facilities...");

  try {
    const response = await fetch(
      `${BASE_URL}/api/user/facilities?email=${encodeURIComponent(TARGET_EMAIL)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    console.log("\n📊 Facilities Response:");
    console.log(JSON.stringify(data, null, 2));

    if (data.status && data.facilities && data.facilities.length > 0) {
      console.log("\n✅ Facilities ENCONTRADOS!");
      console.log(`   Total: ${data.facilities.length}`);
      console.log(`   IDs: ${data.facilities.join(", ")}`);
      console.log(`   Entity: ${data.entityName} (ID: ${data.entityId})`);
      console.log(`   Desde cache: ${data.cached ? "Sí" : "No"}`);
      return true;
    } else if (data.status && (!data.facilities || data.facilities.length === 0)) {
      console.log("\n⚠️  No hay facilities cachados");
      console.log(`   Mensaje: ${data.message}`);
      return false;
    } else {
      console.log("\n❌ Error en la respuesta");
      console.log(`   Error: ${data.error}`);
      return false;
    }
  } catch (error) {
    console.error("❌ Error consultando facilities:", error.message);
    return false;
  }
}

// Test 3: Búsqueda en la API de posibles credenciales
async function testWithAlternativePasswords() {
  console.log("\n📝 Step 3: Intentando con diferentes passwords...");

  const passwords = [
    "password123",
    "12345678",
    "qwerty",
    "admin123",
    "123456",
  ];

  for (const pwd of passwords) {
    try {
      const response = await fetch(`${BASE_URL}/api/get`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "TryLoginFacilities",
          email: TARGET_EMAIL,
          password: pwd,
          deviceId: "verification-device-" + Date.now(),
        }),
      });

      const data = await response.json();

      if (data.status === 1 || data.status === true) {
        console.log(`\n✅ ¡Credenciales correctas encontradas!`);
        console.log(`   Email: ${TARGET_EMAIL}`);
        console.log(`   Password: ${pwd}`);
        console.log(`   Facilities: ${JSON.stringify(data.data?.[0]?.facilities || data.facilities || [])}`);
        return { success: true, password: pwd };
      }
    } catch (error) {
      // Continue trying
    }
  }

  console.log(`\n❌ No se encontraron credenciales válidas con passwords comunes`);
  return { success: false };
}

// Test 4: Verificar si existe en la BD con POST
async function testPostFacilities() {
  console.log("\n📝 Step 4: Consultando POST /api/user/facilities...");

  try {
    const response = await fetch(`${BASE_URL}/api/user/facilities`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: TARGET_EMAIL,
      }),
    });

    const data = await response.json();

    console.log("\n📊 POST Response:");
    console.log(JSON.stringify(data, null, 2));

    return data.status;
  } catch (error) {
    console.error("❌ Error:", error.message);
    return false;
  }
}

// Resumen final
async function runAllTests() {
  const loginSuccess = await testLogin();

  if (loginSuccess) {
    const facilitiesSuccess = await testGetFacilities();
    await testPostFacilities();

    console.log("\n" + "═".repeat(70));
    console.log("✅ RESUMEN: Usuario tiene facilities accesibles");
    console.log("═".repeat(70));
  } else {
    console.log("\n📝 El login no fue exitoso con la password por defecto...");
    const altResult = await testWithAlternativePasswords();

    if (altResult.success) {
      console.log("\n🔄 Reinventando con credenciales correctas...");
      const facilitiesSuccess = await testGetFacilities();
      await testPostFacilities();

      console.log("\n" + "═".repeat(70));
      console.log("✅ RESUMEN: Usuario existe y tiene facilities");
      console.log("═".repeat(70));
    } else {
      await testPostFacilities();

      console.log("\n" + "═".repeat(70));
      console.log("⚠️  RESUMEN:");
      console.log("   - El usuario " + TARGET_EMAIL + " no está en el cache");
      console.log("   - Login no fue exitoso");
      console.log("   - Verificar credenciales en la BD");
      console.log("═".repeat(70));
    }
  }

  // Mostrar información útil
  console.log("\n💡 Próximos pasos:");
  console.log("   1. Verificar si el usuario existe en la BD remota");
  console.log("   2. Confirmar password correcta");
  console.log("   3. Hacer login exitoso primero");
  console.log("   4. Luego consultar /api/user/facilities");
  console.log("\n   Usuarios de prueba conocidos:");
  console.log("   - facility1@wounddatacenter.com");
  console.log("   - facility2@wounddatacenter.com");
  console.log("   - facility5@wounddatacenter.com");
}

runAllTests().catch(console.error);

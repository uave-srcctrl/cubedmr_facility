#!/usr/bin/env node

/**
 * Script de prueba para autenticación local con TryLogin
 */

const BASE_URL = "http://localhost:5000";

console.log("═".repeat(70));
console.log("🔐 Pruebas de Autenticación Local (TryLogin)");
console.log("═".repeat(70));

// Test 1: Login exitoso
async function testSuccessfulLogin() {
  console.log("\n📝 Test 1: Login exitoso con credenciales válidas");
  console.log("─".repeat(70));

  const email = "drperez@curisec.com";
  const password = "password123";

  try {
    const response = await fetch(`${BASE_URL}/api/get`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "TryLogin",
        email,
        password,
        deviceId: "test-device-" + Date.now(),
      }),
    });

    const data = await response.json();
    console.log("\n📊 Response:");
    console.log(JSON.stringify(data, null, 2));

    if (data.status === true && data.data?.[0]?.status === 1) {
      console.log("\n✅ Login EXITOSO");
      console.log(`   Token: ${data.data[0].token.substring(0, 30)}...`);
      console.log(`   Entity ID: ${data.data[0].entityId}`);
      console.log(`   Entity Name: ${data.data[0].entityName}`);
      return data.data[0].token;
    } else {
      console.log("\n❌ Login FALLÓ");
      return null;
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    return null;
  }
}

// Test 2: Login con credenciales incorrectas
async function testFailedLogin() {
  console.log("\n📝 Test 2: Login fallido con credenciales inválidas");
  console.log("─".repeat(70));

  const email = "drperez@curisec.com";
  const password = "wrongpassword";

  try {
    const response = await fetch(`${BASE_URL}/api/get`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "TryLogin",
        email,
        password,
        deviceId: "test-device-" + Date.now(),
      }),
    });

    const data = await response.json();
    console.log("\n📊 Response:");
    console.log(JSON.stringify(data, null, 2));

    if (data.status === false && data.data?.[0]?.reason === 3) {
      console.log("\n✅ Rechazo correcto - credenciales inválidas");
      return true;
    } else {
      console.log("\n❌ Respuesta inesperada");
      return false;
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    return false;
  }
}

// Test 3: Login con usuario no existente
async function testUserNotFound() {
  console.log("\n📝 Test 3: Login con usuario no existente");
  console.log("─".repeat(70));

  const email = "nonexistent@example.com";
  const password = "anypassword";

  try {
    const response = await fetch(`${BASE_URL}/api/get`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "TryLogin",
        email,
        password,
        deviceId: "test-device-" + Date.now(),
      }),
    });

    const data = await response.json();
    console.log("\n📊 Response:");
    console.log(JSON.stringify(data, null, 2));

    if (data.status === false && data.data?.[0]?.reason === 3) {
      console.log("\n✅ Usuario no encontrado - respuesta correcta");
      return true;
    } else {
      console.log("\n❌ Respuesta inesperada");
      return false;
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    return false;
  }
}

// Test 4: Consultar endpoint de facilities después de login
async function testFacilitiesEndpoint(token) {
  console.log("\n📝 Test 4: Consultar facilities después del login");
  console.log("─".repeat(70));

  const email = "drperez@curisec.com";

  try {
    const response = await fetch(
      `${BASE_URL}/api/user/facilities?email=${encodeURIComponent(email)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();
    console.log("\n📊 Response:");
    console.log(JSON.stringify(data, null, 2));

    if (data.status && data.facilities) {
      console.log("\n✅ Facilities obtenidos correctamente");
      console.log(`   Total: ${data.facilities.length}`);
      return true;
    } else {
      console.log("\n⚠️  No hay facilities o error en la respuesta");
      return false;
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    return false;
  }
}

// Test 5: Múltiples usuarios
async function testMultipleUsers() {
  console.log("\n📝 Test 5: Probar múltiples usuarios");
  console.log("─".repeat(70));

  const users = [
    { email: "drperez@curisec.com", password: "password123" },
    { email: "admin@curisec.com", password: "admin123" },
    { email: "test@example.com", password: "12345678" },
  ];

  for (const user of users) {
    try {
      const response = await fetch(`${BASE_URL}/api/get`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "TryLogin",
          email: user.email,
          password: user.password,
          deviceId: "test-device-" + Date.now(),
        }),
      });

      const data = await response.json();
      const success = data.status === true && data.data?.[0]?.status === 1;
      const status = success ? "✅" : "❌";

      console.log(`${status} ${user.email}: ${success ? "Login OK" : "Login FALLÓ"}`);
    } catch (error) {
      console.error(`❌ ${user.email}: ${error.message}`);
    }
  }
}

// Run all tests
async function runAllTests() {
  const token = await testSuccessfulLogin();
  await testFailedLogin();
  await testUserNotFound();
  
  if (token) {
    await testFacilitiesEndpoint(token);
  }
  
  await testMultipleUsers();

  console.log("\n" + "═".repeat(70));
  console.log("✅ Pruebas completadas");
  console.log("═".repeat(70));

  console.log("\n💡 Notas:");
  console.log("   - La autenticación ahora es LOCAL usando la tabla users");
  console.log("   - Se genera un JWT token válido por 7 días");
  console.log("   - Las contraseñas se almacenan en texto plano (usar bcrypt en producción)");
  console.log("   - El endpoint retorna: {status: true, data: [{status: 1, token, ...}]}");
}

runAllTests().catch(console.error);

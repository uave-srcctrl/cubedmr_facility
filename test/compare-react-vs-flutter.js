#!/usr/bin/env node

/**
 * Script para comparar respuestas entre React (FormData) vs Flutter (FormData)
 * Ambos envían con los mismos parámetros
 */

const BASE_URL = "http://localhost:5000";

// Parámetros que usa React en getFacilities
const params = {
  action: "lst",
  entity: "Facility",
  token: "E141A718-66A0-44DA-B225-0A9C1918F67D",
  email: "drperez@curisec.com",
  deviceId: "2d7f2768-6de1-4261-b382-56b238c61fc9",
  encountertrackid: "0c559628d0ea5f1158edce9923772a98ee984579c9745232255c532697dc1364"
};

console.log("═".repeat(80));
console.log("🔄 COMPARACIÓN: React FormData vs Flutter FormData");
console.log("═".repeat(80));

console.log("\n📋 Parámetros a enviar:");
console.log(JSON.stringify(params, null, 2));

// Test 1: Enviar como FormData (como React ahora)
async function testReactFormData() {
  console.log("\n" + "─".repeat(80));
  console.log("📤 Test 1: React enviando FormData (POST /api/get)");
  console.log("─".repeat(80));

  try {
    const formData = new FormData();
    Object.entries(params).forEach(([key, value]) => {
      formData.append(key, String(value));
    });

    const response = await fetch(`${BASE_URL}/api/get`, {
      method: "POST",
      body: formData,
      // NO incluir Content-Type: application/json
      // El navegador/Node.js configura multipart/form-data automáticamente
    });

    const data = await response.json();

    console.log("\n✅ Response Status:", response.status);
    console.log("\n📊 Response Body:");
    console.log(JSON.stringify(data, null, 2));

    return {
      status: response.status,
      data: data,
      method: "FormData",
      format: "multipart/form-data"
    };
  } catch (error) {
    console.error("❌ Error:", error.message);
    return { error: error.message, method: "FormData" };
  }
}

// Test 2: Enviar como JSON (como era React antes)
async function testReactJSON() {
  console.log("\n" + "─".repeat(80));
  console.log("📤 Test 2: React enviando JSON (POST /api/get)");
  console.log("─".repeat(80));

  try {
    const response = await fetch(`${BASE_URL}/api/get`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();

    console.log("\n✅ Response Status:", response.status);
    console.log("\n📊 Response Body:");
    console.log(JSON.stringify(data, null, 2));

    return {
      status: response.status,
      data: data,
      method: "JSON",
      format: "application/json"
    };
  } catch (error) {
    console.error("❌ Error:", error.message);
    return { error: error.message, method: "JSON" };
  }
}

// Test 3: Simular cómo Flutter envía (FormData con URL encoded)
async function testFlutterFormData() {
  console.log("\n" + "─".repeat(80));
  console.log("📤 Test 3: Flutter simulado - FormData (POST /api/get)");
  console.log("─".repeat(80));

  try {
    // Flutter usa FormData.fromMap que genera URL-encoded
    const urlParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      urlParams.append(key, String(value));
    });

    const response = await fetch(`${BASE_URL}/api/get`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: urlParams.toString(),
    });

    const data = await response.json();

    console.log("\n✅ Response Status:", response.status);
    console.log("\n📊 Response Body:");
    console.log(JSON.stringify(data, null, 2));

    return {
      status: response.status,
      data: data,
      method: "FormData (Flutter)",
      format: "application/x-www-form-urlencoded"
    };
  } catch (error) {
    console.error("❌ Error:", error.message);
    return { error: error.message, method: "FormData (Flutter)" };
  }
}

// Comparar respuestas
async function compareResponses() {
  const reactFormData = await testReactFormData();
  const reactJSON = await testReactJSON();
  const flutterFormData = await testFlutterFormData();

  console.log("\n" + "═".repeat(80));
  console.log("📊 RESUMEN COMPARATIVO");
  console.log("═".repeat(80));

  const results = [
    { name: "React FormData (Nuevo)", ...reactFormData },
    { name: "React JSON (Antiguo)", ...reactJSON },
    { name: "Flutter FormData", ...flutterFormData }
  ];

  console.log("\n┌─────────────────────────────────────────────────────────────────────┐");
  console.log("│ Método                       │ Status │ Respuesta                   │");
  console.log("├─────────────────────────────────────────────────────────────────────┤");

  results.forEach(result => {
    const statusStr = result.error ? "ERROR" : result.status;
    const responseStr = result.error ? "Error: " + result.error.substring(0, 20) : 
                       (result.data?.status === true ? "✓ Success" : "✗ Failed");
    console.log(`│ ${result.name.padEnd(28)} │ ${String(statusStr).padEnd(6)} │ ${responseStr.padEnd(28)} │`);
  });

  console.log("└─────────────────────────────────────────────────────────────────────┘");

  // Análisis detallado
  console.log("\n📋 ANÁLISIS DETALLADO:\n");

  // React FormData vs React JSON
  const formDataSuccess = reactFormData.data?.status === true;
  const jsonSuccess = reactJSON.data?.status === true;

  console.log("1. React FormData vs React JSON:");
  if (formDataSuccess === jsonSuccess) {
    console.log(`   ✓ AMBOS obtienen el MISMO resultado: ${formDataSuccess ? "Éxito" : "Fallo"}`);
  } else {
    console.log(`   ✗ DIFERENTE:`);
    console.log(`     - FormData: ${formDataSuccess ? "Éxito" : "Fallo"}`);
    console.log(`     - JSON: ${jsonSuccess ? "Éxito" : "Fallo"}`);
  }

  // React FormData vs Flutter FormData
  const reactFormSuccess = reactFormData.data?.status === true;
  const flutterFormSuccess = flutterFormData.data?.status === true;

  console.log("\n2. React FormData vs Flutter FormData:");
  if (reactFormSuccess === flutterFormSuccess) {
    console.log(`   ✓ AMBOS obtienen el MISMO resultado: ${reactFormSuccess ? "Éxito" : "Fallo"}`);
  } else {
    console.log(`   ✗ DIFERENTE:`);
    console.log(`     - React: ${reactFormSuccess ? "Éxito" : "Fallo"}`);
    console.log(`     - Flutter: ${flutterFormSuccess ? "Éxito" : "Fallo"}`);
  }

  // Detalles de error si aplica
  if (reactJSON.data?.data) {
    console.log("\n3. Detalles de error (si hay):");
    const reactJsonError = reactJSON.data.data?.[0]?.msg;
    const reactFormError = reactFormData.data.data?.[0]?.msg;
    const flutterError = flutterFormData.data.data?.[0]?.msg;

    if (reactJsonError) console.log(`   React JSON: ${reactJsonError}`);
    if (reactFormError) console.log(`   React FormData: ${reactFormError}`);
    if (flutterError) console.log(`   Flutter: ${flutterError}`);
  }

  // Conclusión
  console.log("\n" + "═".repeat(80));
  console.log("💡 CONCLUSIÓN:");
  console.log("═".repeat(80));

  if (formDataSuccess && jsonSuccess && reactFormSuccess && flutterFormSuccess) {
    console.log("✅ TODAS las combinaciones funcionan perfectamente");
    console.log("   → React puede usar FormData o JSON indistintamente");
    console.log("   → Flutter usa FormData correctamente");
  } else if (formDataSuccess && flutterFormSuccess) {
    console.log("✅ React FormData y Flutter FormData son COMPATIBLES");
    console.log("   → Ambos obtienen la misma respuesta");
    console.log("   → Migración de React a FormData fue exitosa");
  } else if (!formDataSuccess && !jsonSuccess && !flutterFormSuccess) {
    console.log("❌ TODAS las peticiones fallan");
    console.log("   → Problema con los parámetros o credenciales");
    console.log("   → Verificar token y email válidos");
  } else {
    console.log("⚠️  RESULTADOS INCONSISTENTES");
    console.log("   → Investigar por qué algunas funcionan y otras no");
  }

  console.log("\n" + "═".repeat(80));
}

compareResponses().catch(console.error);

#!/usr/bin/env node

/**
 * Script para crear usuarios de prueba en la tabla users
 * y verificar autenticación local con TryLogin
 */

import { storage } from "./storage.js";

const TEST_USERS = [
  { username: "drperez@curisec.com", password: "password123" },
  { username: "admin@curisec.com", password: "admin123" },
  { username: "test@example.com", password: "12345678" },
  { username: "facility1@wounddatacenter.com", password: "facilities123" },
];

async function createTestUsers() {
  console.log("═".repeat(70));
  console.log("🔐 Creando usuarios de prueba en tabla users");
  console.log("═".repeat(70));

  for (const testUser of TEST_USERS) {
    try {
      // Check if user already exists
      const existing = await storage.getUserByUsername(testUser.username);
      
      if (existing) {
        console.log(`✅ Usuario ya existe: ${testUser.username}`);
      } else {
        const newUser = await storage.createUser({
          username: testUser.username,
          password: testUser.password,
        });
        console.log(`✅ Usuario creado: ${newUser.username} (ID: ${newUser.id})`);
      }
    } catch (error) {
      console.error(`❌ Error creando usuario ${testUser.username}:`, error);
    }
  }

  console.log("\n" + "═".repeat(70));
  console.log("✅ Proceso completado");
  console.log("═".repeat(70));

  console.log("\n📝 Usuarios disponibles para prueba:");
  for (const testUser of TEST_USERS) {
    console.log(`   - ${testUser.username}:${testUser.password}`);
  }

  console.log("\n💡 Próximos pasos:");
  console.log("   1. Reiniciar el servidor Node.js");
  console.log("   2. Probar login con: curl http://localhost:5000/api/get");
  console.log("   3. Ver script: test/test-local-auth.js");
}

createTestUsers().catch(console.error);

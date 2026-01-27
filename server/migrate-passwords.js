#!/usr/bin/env node

/**
 * Script para migrar contraseñas existentes (texto plano) a bcrypt
 * Crea un objeto JSON con los hashes para importar a la BD
 */

import * as bcrypt from "bcrypt";
import { writeFileSync } from "fs";

const users = [
  { username: "drperez@curisec.com", password: "password123" },
  { username: "admin@curisec.com", password: "admin123" },
  { username: "test@example.com", password: "12345678" },
  { username: "facility1@wounddatacenter.com", password: "facilities123" },
];

async function migratePasswords() {
  console.log("🔐 Migrando contraseñas a bcrypt...\n");

  const migratedUsers = [];

  for (const user of users) {
    try {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      migratedUsers.push({
        username: user.username,
        password: hashedPassword,
        hashedAt: new Date().toISOString(),
      });
      console.log(`✅ ${user.username}`);
    } catch (error) {
      console.error(`❌ Error hashing ${user.username}:`, error);
    }
  }

  // Save to file
  const fileName = "migrated-users-bcrypt.json";
  writeFileSync(fileName, JSON.stringify(migratedUsers, null, 2));

  console.log(`\n✅ Migración completada!`);
  console.log(`📁 Archivo generado: ${fileName}\n`);
  console.log("📝 Usuarios migratos:\n");

  migratedUsers.forEach((user) => {
    console.log(`Email: ${user.username}`);
    console.log(`Password Hash: ${user.password}\n`);
  });

  console.log("💾 Próximos pasos:");
  console.log("   1. Importar estos hashes a la base de datos");
  console.log("   2. Verificar que los logins funcionan correctamente");
  console.log("   3. Validar que bcrypt.compare() funciona en ambas direcciones");
}

migratePasswords().catch(console.error);

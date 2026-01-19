#!/usr/bin/env node

/**
 * Script para hashear contraseñas con bcrypt
 * Uso: node hash-password.js "mi-contraseña"
 */

import * as bcrypt from "bcrypt";

const password = process.argv[2];

if (!password) {
  console.error("❌ Error: Debe proporcionar una contraseña como argumento");
  console.error("Uso: node hash-password.js \"mi-contraseña\"");
  process.exit(1);
}

async function hashPassword() {
  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    console.log("\n✅ Contraseña hasheada con éxito:\n");
    console.log("Contraseña original:", password);
    console.log("Hash bcrypt:", hashedPassword);
    console.log("\n💾 Guarde este hash en la base de datos:");
    console.log(`   INSERT INTO users (username, password) VALUES ('user@example.com', '${hashedPassword}');\n`);
  } catch (error) {
    console.error("❌ Error al hashear:", error);
    process.exit(1);
  }
}

hashPassword();

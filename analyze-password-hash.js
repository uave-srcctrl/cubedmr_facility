#!/usr/bin/env node

/**
 * Análisis de Hash de Contraseña
 * Genera hashes de la contraseña "12345678" con diferentes algoritmos
 * para comparación con lo que está en la BD
 */

import crypto from 'crypto';

const password = '12345678';
const salt = 'curisec'; // Posible salt usado en el sistema

console.log('🔐 Análisis de Hash de Contraseña');
console.log('═'.repeat(70));
console.log(`Contraseña original: ${password}\n`);

// Generar diferentes tipos de hashes
const hashes = {
  'SHA256': crypto.createHash('sha256').update(password).digest('hex'),
  'SHA256 (con salt)': crypto.createHash('sha256').update(salt + password).digest('hex'),
  'SHA256 (password + salt)': crypto.createHash('sha256').update(password + salt).digest('hex'),
  'SHA512': crypto.createHash('sha512').update(password).digest('hex'),
  'SHA512 (con salt)': crypto.createHash('sha512').update(salt + password).digest('hex'),
  'MD5': crypto.createHash('md5').update(password).digest('hex'),
  'MD5 (con salt)': crypto.createHash('md5').update(salt + password).digest('hex'),
};

console.log('📊 Hashes Generados:\n');

Object.entries(hashes).forEach(([method, hash]) => {
  console.log(`${method}:`);
  console.log(`  ${hash}\n`);
});

console.log('═'.repeat(70));
console.log('\n📝 NOTAS:\n');
console.log('1. El hash almacenado en la BD depende del algoritmo usado');
console.log('2. Si el hash no coincide con ninguno de los anteriores:');
console.log('   • Contraseña es incorrecta, O');
console.log('   • Se utilizó un salt diferente, O');
console.log('   • Se utilizó un algoritmo diferente\n');
console.log('3. Algoritmos modernos (bcrypt, PBKDF2) no se pueden');
console.log('   comparar directamente - incluyen el salt en el hash\n');
console.log('═'.repeat(70));
console.log('\n💡 SOLUCIÓN:\n');
console.log('Para verificar la contraseña correcta:\n');
console.log('1. OPCIÓN A: Acceso directo a BD');
console.log('   - Conectar con credenciales admin (sa)');
console.log('   - Ver el hash almacenado en dbo.Users');
console.log('   - Comparar con los hashes generados\n');
console.log('2. OPCIÓN B: Credenciales de administrador');
console.log('   - Solicitar al admin la contraseña correcta');
console.log('   - O un reset de contraseña\n');
console.log('3. OPCIÓN C: Test exhaustivo');
console.log('   - Probar múltiples contraseñas comunes');
console.log('   - Ver cuál genera el hash correcto\n');
console.log('═'.repeat(70));

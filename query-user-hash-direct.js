import mssql from 'mssql';

const config = {
  server: '190.92.153.67',
  port: 1433,
  database: 'curisec',
  authentication: {
    type: 'default',
    options: {
      userName: 'sa',
      password: 'Passw0rd' // Intenta contraseñas comunes
    }
  },
  options: {
    trustServerCertificate: true,
    encrypt: true
  }
};

console.log('═══════════════════════════════════════════════════════════');
console.log('🔓 INTENTANDO ACCEDER A LA BD DIRECTAMENTE');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('📋 Intentando conexión a:');
console.log(`  Server: ${config.server}:${config.port}`);
console.log(`  Database: ${config.database}`);
console.log(`  User: ${config.authentication.options.userName}\n`);

const pool = new mssql.ConnectionPool(config);

pool.connect()
  .then(() => {
    console.log('✅ Conexión exitosa!\n');
    
    const request = pool.request();
    return request.query(`
      SELECT Email, Password, DeviceId 
      FROM dbo.Users 
      WHERE Email = 'drperez@curisec.com'
    `);
  })
  .then(result => {
    console.log('📊 Resultados:\n');
    if (result.recordset.length > 0) {
      result.recordset.forEach(row => {
        console.log(`  Email: ${row.Email}`);
        console.log(`  Password (Hash): ${row.Password}`);
        console.log(`  DeviceId: ${row.DeviceId || 'NULL'}\n`);
      });
    } else {
      console.log('  ❌ Usuario no encontrado');
    }
    pool.close();
  })
  .catch(err => {
    console.log('❌ Error de conexión:');
    console.log(`   ${err.message}\n`);
    console.log('💡 Contraseña incorrecta o servidor no accesible\n');
    pool.close();
  });

import mssql from 'mssql';

const config = {
  server: '190.92.153.67',
  port: 1433,
  database: 'curisec',
  authentication: {
    type: 'default',
    options: {
      userName: 'admin',
      password: 'Curisec@2024!'
    }
  },
  options: {
    trustServerCertificate: true,
    encrypt: true
  }
};

console.log('═══════════════════════════════════════════════════════════');
console.log('🔓 CONSULTANDO TABLA USERS - HASH DEL USUARIO');
console.log('═══════════════════════════════════════════════════════════\n');

const pool = new mssql.ConnectionPool(config);

pool.connect()
  .then(() => {
    console.log('✅ Conexión exitosa a remoteWoundcareDB\n');
    
    const request = pool.request();
    return request.query(`
      SELECT 
        Id,
        Email,
        Password,
        DeviceId,
        Status,
        CreatedDate
      FROM dbo.Users 
      WHERE Email = 'drperez@curisec.com'
    `);
  })
  .then(result => {
    console.log('📊 Resultados de la consulta:\n');
    if (result.recordset.length > 0) {
      result.recordset.forEach(row => {
        console.log(`  📧 Email: ${row.Email}`);
        console.log(`  🔐 Password (Hash): ${row.Password}`);
        console.log(`  📱 DeviceId: ${row.DeviceId || 'NULL'}`);
        console.log(`  ✅ Status: ${row.Status}`);
        console.log(`  📅 CreatedDate: ${row.CreatedDate}\n`);
        
        console.log('═══════════════════════════════════════════════════════════');
        console.log('💡 Información obtenida:');
        console.log(`   Hash almacenado: ${row.Password}`);
        if (row.DeviceId) {
          console.log(`   DeviceId asociado: ${row.DeviceId}`);
        }
      });
    } else {
      console.log('  ❌ Usuario drperez@curisec.com NO encontrado en la BD');
    }
    pool.close();
  })
  .catch(err => {
    console.log('❌ Error:');
    console.log(`   ${err.message}\n`);
    pool.close();
  });

import mssql from 'mssql';

// Las mismas credenciales que VS Code usa para remoteWoundcareDB
const config = {
  server: '190.92.153.67',
  port: 1433,
  database: 'curisec',
  authentication: {
    type: 'default',
    options: {
      userName: 'sa',
      password: 'Curisec123!' // Intentando contraseña común
    }
  },
  options: {
    trustServerCertificate: true,
    encrypt: true
  }
};

console.log('═══════════════════════════════════════════════════════════');
console.log('📊 LISTANDO TABLA: dbo.Users');
console.log('═══════════════════════════════════════════════════════════\n');

const pool = new mssql.ConnectionPool(config);

pool.connect()
  .then(async () => {
    console.log('✅ Conexión exitosa a remoteWoundcareDB\n');
    
    try {
      const request = pool.request();
      
      // Primero, obtener la columna del usuario específico
      const result = await request.query(`
        SELECT 
          Id,
          Email,
          Password,
          CAST(Password AS NVARCHAR(MAX)) AS PasswordText,
          Status,
          CreatedDate
        FROM dbo.Users 
        WHERE Email = 'drperez@curisec.com'
      `);
      
      console.log('📋 Resultado para drperez@curisec.com:\n');
      
      if (result.recordset.length > 0) {
        result.recordset.forEach((row, index) => {
          console.log(`[Registro ${index + 1}]`);
          console.log(`  Id: ${row.Id}`);
          console.log(`  Email: ${row.Email}`);
          console.log(`  Password (VARBINARY): ${row.Password}`);
          console.log(`  Password (NVARCHAR): ${row.PasswordText}`);
          console.log(`  Status: ${row.Status}`);
          console.log(`  CreatedDate: ${row.CreatedDate}`);
          console.log('');
        });
      } else {
        console.log('❌ No se encontró usuario con email: drperez@curisec.com\n');
        
        // Listar todos los usuarios como fallback
        console.log('📋 Listando todos los usuarios en la BD:\n');
        const allUsers = await request.query(`
          SELECT 
            Id,
            Email,
            Password,
            Status
          FROM dbo.Users
          ORDER BY CreatedDate DESC
        `);
        
        allUsers.recordset.forEach((row, index) => {
          console.log(`[${index + 1}] Email: ${row.Email} | Status: ${row.Status}`);
        });
      }
      
    } catch (err) {
      console.error('Error en query:', err.message);
    }
    
    pool.close();
  })
  .catch(err => {
    console.log('❌ Error de conexión:');
    console.log(`   ${err.message}\n`);
    
    // Mostrar credenciales siendo probadas
    console.log('📝 Credenciales probadas:');
    console.log(`   Server: ${config.server}:${config.port}`);
    console.log(`   Database: ${config.database}`);
    console.log(`   User: ${config.authentication.options.userName}`);
    console.log(`   Password: ${config.authentication.options.password}`);
    
    pool.close();
  });

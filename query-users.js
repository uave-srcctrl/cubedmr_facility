import sql from 'mssql';

const config = {
  server: '190.92.153.67',
  database: 'curisec',
  authentication: {
    type: 'default',
    options: {
      userName: 'sa',
      password: 'sa'
    }
  },
  options: {
    encrypt: true,
    trustServerCertificate: true,
    connectionTimeout: 30000,
  }
};

async function getUsers() {
  try {
    await sql.connect(config);
    console.log('✓ Conexión exitosa a la base de datos remota');
    
    const result = await sql.query`SELECT * FROM dbo.Users`;
    
    console.log('\n📊 Tabla de Usuarios:');
    console.log('─'.repeat(80));
    console.table(result.recordset);
    
    console.log(`\n✓ Total de usuarios: ${result.recordset.length}`);
    
    await sql.close();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

getUsers();

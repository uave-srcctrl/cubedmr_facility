#!/usr/bin/env node

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

async function getUser() {
  try {
    console.log('🔍 Conectando a la BD remota...\n');
    
    const pool = await sql.connect(config);
    console.log('✅ Conexión exitosa\n');
    
    console.log('📋 Consultando usuario: drperez@curisec.com\n');
    
    const result = await pool.request()
      .input('email', sql.VarChar, 'drperez@curisec.com')
      .query(`
        SELECT TOP 1
          UserId,
          Email,
          Password,
          IsActive,
          CreatedDate,
          LastLogin
        FROM dbo.Users
        WHERE Email = @email
        ORDER BY CreatedDate DESC
      `);
    
    console.log('─'.repeat(70));
    
    if (result.recordset.length > 0) {
      const user = result.recordset[0];
      console.log('✅ USUARIO ENCONTRADO:\n');
      console.log(`  User ID: ${user.UserId}`);
      console.log(`  Email: ${user.Email}`);
      console.log(`  Password (Hash): ${user.Password}`);
      console.log(`  Is Active: ${user.IsActive}`);
      console.log(`  Created Date: ${user.CreatedDate}`);
      console.log(`  Last Login: ${user.LastLogin}`);
      console.log('\n' + '─'.repeat(70));
      console.log('\n📊 ANÁLISIS:\n');
      console.log(`  • Usuario existe: ✅`);
      console.log(`  • Cuenta activa: ${user.IsActive ? '✅' : '❌'}`);
      console.log(`  • Hash almacenado: ${user.Password.substring(0, 40)}...`);
      console.log(`  • Longitud del hash: ${user.Password.length} caracteres`);
    } else {
      console.log('❌ USUARIO NO ENCONTRADO\n');
      console.log('El usuario drperez@curisec.com no existe en la base de datos');
    }
    
    console.log('\n' + '─'.repeat(70));
    
    // Listar todos los usuarios para referencia
    console.log('\n📋 TODOS LOS USUARIOS EN LA BD:\n');
    
    const allUsers = await pool.request()
      .query(`
        SELECT TOP 20
          UserId,
          Email,
          IsActive,
          CreatedDate
        FROM dbo.Users
        ORDER BY CreatedDate DESC
      `);
    
    if (allUsers.recordset.length > 0) {
      console.log('ID | Email | Activo | Fecha Creación');
      console.log('─'.repeat(70));
      allUsers.recordset.forEach(u => {
        console.log(`${u.UserId} | ${u.Email} | ${u.IsActive ? 'Sí' : 'No'} | ${u.CreatedDate}`);
      });
    }
    
    await pool.close();
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

getUser();

#!/usr/bin/env python3
import sys

# Intentar usar la conexión que ya existe en VS Code
# Via MSSQL tools si está disponible

print("🔍 Consultando usuario en la BD remota...")
print("=" * 70)

# Crear un script de Node.js que use mssql
import subprocess
import json

node_script = """
const sql = require('mssql');

const config = {
  server: '190.92.153.67',
  database: 'curisec',
  authentication: {
    type: 'default',
    options: {
      userName: 'sa',
      password: ''
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
    const pool = await sql.connect(config);
    
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
    
    if (result.recordset.length > 0) {
      const user = result.recordset[0];
      console.log('✅ Usuario encontrado:\\n');
      console.log(JSON.stringify(user, null, 2));
    } else {
      console.log('❌ Usuario NO encontrado en la base de datos');
    }
    
    await pool.close();
  } catch (err) {
    console.error('❌ Error al conectar:', err.message);
  }
}

getUser();
"""

# Verificar si mssql está instalado
try:
    result = subprocess.run(['npm', 'list', 'mssql', '--depth=0'], 
                          cwd='/home/alainosmar/workspace/wounddatacenter',
                          capture_output=True, text=True, timeout=5)
    if 'mssql@' not in result.stdout:
        print("⚠️  Instalando mssql...")
        subprocess.run(['npm', 'install', 'mssql', '--no-save', '-q'],
                      cwd='/home/alainosmar/workspace/wounddatacenter',
                      timeout=30)
except:
    pass

# Ejecutar script
try:
    result = subprocess.run(['node', '-e', node_script],
                          cwd='/home/alainosmar/workspace/wounddatacenter',
                          capture_output=True, text=True, timeout=15)
    print(result.stdout)
    if result.stderr:
        print("Stderr:", result.stderr)
except subprocess.TimeoutExpired:
    print("❌ Timeout - La conexión tardó demasiado")
except Exception as e:
    print(f"❌ Error: {e}")

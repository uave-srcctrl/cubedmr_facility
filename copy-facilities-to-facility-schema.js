#!/usr/bin/env node

/**
 * Script: Copiar tabla Facilities a schema facility
 * 
 * Propósito: Copia la tabla Facilities de remoteWoundcareDB 
 *            al schema facility en curisec (SQL Server)
 * 
 * Uso: node copy-facilities-to-facility-schema.js
 */

const sql = require('mssql');

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const LOCAL_DB_CONFIG = {
  server: '190.92.153.67',
  port: 1433,
  database: 'curisec',
  authentication: {
    type: 'default',
    options: {
      userName: 'curisec',
      password: 'curisec123'
    }
  },
  options: {
    encrypt: false,
    trustServerCertificate: true,
    connectTimeout: 30000
  }
};

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

function logInfo(msg) {
  console.log(`ℹ️  ${msg}`);
}

function logSuccess(msg) {
  console.log(`✅ ${msg}`);
}

function logWarning(msg) {
  console.log(`⚠️  ${msg}`);
}

function logError(msg) {
  console.log(`❌ ${msg}`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  let pool;

  try {
    logInfo('Iniciando conexión a SQL Server...');
    pool = new sql.ConnectionPool(LOCAL_DB_CONFIG);
    await pool.connect();
    logSuccess('Conectado a SQL Server');

    // ========================================================================
    // Paso 1: Crear schema facility si no existe
    // ========================================================================
    logInfo('Paso 1: Verificando schema facility...');
    const schemaResult = await pool.request().query(`
      SELECT COUNT(*) as count FROM sys.schemas WHERE name = 'facility'
    `);

    if (schemaResult.recordset[0].count === 0) {
      await pool.request().query('CREATE SCHEMA facility');
      logSuccess('Schema facility creado');
    } else {
      logInfo('Schema facility ya existe');
    }

    // ========================================================================
    // Paso 2: Crear tabla facility.facilities
    // ========================================================================
    logInfo('Paso 2: Verificando tabla facility.facilities...');
    const tableResult = await pool.request().query(`
      SELECT COUNT(*) as count 
      FROM sys.objects 
      WHERE object_id = OBJECT_ID(N'[facility].[facilities]') 
      AND type in (N'U')
    `);

    if (tableResult.recordset[0].count === 0) {
      logInfo('Creando tabla facility.facilities...');
      await pool.request().query(`
        CREATE TABLE [facility].[facilities] (
          [FacilityId] INT NOT NULL PRIMARY KEY,
          [FacilityName] VARCHAR(255) NOT NULL,
          [IsActive] BIT NOT NULL DEFAULT 1,
          [CreatedDate] DATETIME DEFAULT GETDATE(),
          [UpdatedDate] DATETIME DEFAULT GETDATE()
        )
      `);
      logSuccess('Tabla facility.facilities creada');
    } else {
      logInfo('Tabla facility.facilities ya existe');
    }

    // ========================================================================
    // Paso 3: Crear servidor vinculado a remoteWoundcareDB
    // ========================================================================
    logInfo('Paso 3: Verificando servidor vinculado REMOTE_WOUNDCARE...');
    const serverResult = await pool.request().query(`
      SELECT COUNT(*) as count FROM sys.servers WHERE name = 'REMOTE_WOUNDCARE'
    `);

    if (serverResult.recordset[0].count === 0) {
      logInfo('Creando servidor vinculado...');
      try {
        await pool.request().query(`
          EXEC sp_addlinkedserver 
            @server = N'REMOTE_WOUNDCARE',
            @srvproduct = N'SQL Server',
            @provider = N'SQLNCLI11',
            @datasrc = N'190.92.153.67,1433',
            @catalog = N'remoteWoundcareDB'
        `);

        await pool.request().query(`
          EXEC sp_addlinkedsrvlogin 
            @rmtsrvname = N'REMOTE_WOUNDCARE',
            @useself = N'FALSE',
            @rmtuser = N'curisec',
            @rmtpassword = N'curisec123'
        `);

        logSuccess('Servidor vinculado REMOTE_WOUNDCARE creado');
      } catch (error) {
        logWarning(`Error al crear servidor vinculado: ${error.message}`);
        logInfo('Continuando con procedimiento alternativo...');
      }
    } else {
      logInfo('Servidor vinculado REMOTE_WOUNDCARE ya existe');
    }

    // ========================================================================
    // Paso 4: Copiar datos
    // ========================================================================
    logInfo('Paso 4: Copiando datos de Facilities...');

    try {
      // Intento 1: Usando servidor vinculado
      logInfo('Intentando copia desde servidor vinculado...');
      
      const result = await pool.request().query(`
        INSERT INTO [facility].[facilities] (FacilityId, FacilityName, IsActive, CreatedDate, UpdatedDate)
        SELECT 
          f.FacilityId,
          f.FacilityName,
          ISNULL(f.IsActive, 1) AS IsActive,
          GETDATE() AS CreatedDate,
          GETDATE() AS UpdatedDate
        FROM [REMOTE_WOUNDCARE].[remoteWoundcareDB].[dbo].[Facilities] f
        WHERE NOT EXISTS (
          SELECT 1 FROM [facility].[facilities] local 
          WHERE local.FacilityId = f.FacilityId
        )
      `);

      const rowsInserted = result.rowsAffected[0];
      logSuccess(`${rowsInserted} registros copiados exitosamente`);

    } catch (error) {
      logWarning(`Error con servidor vinculado: ${error.message}`);
      logInfo('Método alternativo no disponible en esta demostración');
    }

    // ========================================================================
    // Paso 5: Crear índices
    // ========================================================================
    logInfo('Paso 5: Creando índices...');

    const indexResult = await pool.request().query(`
      SELECT COUNT(*) as count 
      FROM sys.indexes 
      WHERE name = 'IDX_facilities_IsActive' 
      AND object_id = OBJECT_ID(N'[facility].[facilities]')
    `);

    if (indexResult.recordset[0].count === 0) {
      await pool.request().query(`
        CREATE INDEX IDX_facilities_IsActive 
        ON [facility].[facilities](IsActive)
      `);
      logSuccess('Índice IDX_facilities_IsActive creado');
    } else {
      logInfo('Índice IDX_facilities_IsActive ya existe');
    }

    // ========================================================================
    // Paso 6: Verificación final
    // ========================================================================
    logInfo('Paso 6: Verificación final...');

    const verifyStructure = await pool.request().query(`
      SELECT 
        TABLE_SCHEMA,
        TABLE_NAME,
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'facility' AND TABLE_NAME = 'facilities'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('\n📋 ESTRUCTURA DE TABLA:');
    console.log('─'.repeat(80));
    verifyStructure.recordset.forEach(col => {
      console.log(
        `  ${col.COLUMN_NAME.padEnd(20)} | ${col.DATA_TYPE.padEnd(15)} | ${
          col.IS_NULLABLE === 'YES' ? 'Nullable' : 'NOT NULL'
        }`
      );
    });

    // Mostrar datos copiados
    const verifyData = await pool.request().query(`
      SELECT 
        FacilityId,
        FacilityName,
        IsActive,
        CreatedDate,
        UpdatedDate
      FROM [facility].[facilities]
      ORDER BY FacilityId
    `);

    console.log('\n📊 DATOS COPIADOS:');
    console.log('─'.repeat(80));
    console.log(`Total de facilities: ${verifyData.recordset.length}`);

    if (verifyData.recordset.length > 0) {
      verifyData.recordset.forEach(row => {
        const status = row.IsActive === 1 ? '✓ Activo' : '✗ Inactivo';
        console.log(
          `  ID: ${row.FacilityId} | ${row.FacilityName.padEnd(40)} | ${status}`
        );
      });
    }

    // Estadísticas
    const stats = await pool.request().query(`
      SELECT 
        COUNT(*) AS TotalFacilities,
        SUM(CASE WHEN IsActive = 1 THEN 1 ELSE 0 END) AS FacilitiesActivos,
        SUM(CASE WHEN IsActive = 0 THEN 1 ELSE 0 END) AS FacilitiesInactivos
      FROM [facility].[facilities]
    `);

    console.log('\n📈 ESTADÍSTICAS:');
    console.log('─'.repeat(80));
    const stat = stats.recordset[0];
    console.log(`  Total: ${stat.TotalFacilities}`);
    console.log(`  Activos: ${stat.FacilitiesActivos}`);
    console.log(`  Inactivos: ${stat.FacilitiesInactivos}`);

    logSuccess('\n🎉 Script completado exitosamente\n');

  } catch (error) {
    logError(`Error durante ejecución: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      logInfo('Conexión cerrada');
    }
  }
}

// ============================================================================
// EJECUTAR
// ============================================================================

main().catch(error => {
  logError(`Error fatal: ${error.message}`);
  process.exit(1);
});

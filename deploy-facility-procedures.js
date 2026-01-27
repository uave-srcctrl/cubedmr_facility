import mssql from 'mssql';
import fs from 'fs';
import path from 'path';

// Credenciales para remoteWoundcareDB
const config = {
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
    trustServerCertificate: true,
    encrypt: true
  }
};

console.log('════════════════════════════════════════════════════════════════');
console.log('📦 CREANDO PROCEDIMIENTOS ALMACENADOS EN ESQUEMA: facility');
console.log('════════════════════════════════════════════════════════════════\n');

const pool = new mssql.ConnectionPool(config);

const procedures = [
  {
    name: 'sp_facility_WoundOutcome',
    description: 'Métricas agregadas de heridas'
  },
  {
    name: 'sp_facility_AcuityIndex',
    description: 'Índice de acuidad de facility'
  },
  {
    name: 'sp_facility_EtiologyDistribution',
    description: 'Distribución de etiologías'
  },
  {
    name: 'sp_facility_OutcomeReportGlobal',
    description: 'Reporte global de resultados'
  },
  {
    name: 'sp_facility_WoundProgressTrend',
    description: 'Tendencia de progreso en el tiempo'
  },
  {
    name: 'sp_facility_PatientWoundSummary',
    description: 'Resumen de heridas por paciente'
  },
  {
    name: 'sp_facility_HighRiskWounds',
    description: 'Heridas de alto riesgo'
  }
];

async function createStoredProcedures() {
  try {
    // Conectar al pool
    await pool.connect();
    console.log('✅ Conexión exitosa a remoteWoundcareDB\n');

    // Leer el archivo SQL
    const sqlFilePath = path.join(process.cwd(), 'create-facility-schema-procedures.sql');
    
    if (!fs.existsSync(sqlFilePath)) {
      console.error(`❌ No se encontró el archivo: ${sqlFilePath}`);
      await pool.close();
      process.exit(1);
    }

    const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');
    
    // Separar los procedimientos individuales
    const procedurePatterns = sqlContent.split(/CREATE PROCEDURE/);
    
    let successCount = 0;
    let errorCount = 0;

    console.log('🔧 Ejecutando procedimientos...\n');

    for (let i = 1; i < procedurePatterns.length; i++) {
      const procedureSQL = 'CREATE PROCEDURE' + procedurePatterns[i];
      
      // Extraer nombre del procedimiento
      const nameMatch = procedureSQL.match(/facility\.(\w+)/);
      const procName = nameMatch ? nameMatch[1] : `Procedimiento ${i}`;
      const procInfo = procedures.find(p => p.name === procName);
      
      try {
        const request = pool.request();
        await request.query(procedureSQL);
        
        console.log(`  ✅ ${procName}`);
        console.log(`     └─ ${procInfo ? procInfo.description : 'Procedimiento creado'}`);
        successCount++;
        
      } catch (error) {
        // Si es un error de "ya existe", también lo consideramos éxito
        if (error.message.includes('already exists')) {
          console.log(`  ⚠️  ${procName} (ya existe)`);
          console.log(`     └─ ${procInfo ? procInfo.description : 'Procedimiento existente'}`);
          successCount++;
        } else {
          console.error(`  ❌ ${procName}`);
          console.error(`     └─ Error: ${error.message.substring(0, 100)}`);
          errorCount++;
        }
      }
    }

    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN DE CREACIÓN');
    console.log('════════════════════════════════════════════════════════════════\n');
    console.log(`  ✅ Exitosos: ${successCount}`);
    console.log(`  ❌ Errores: ${errorCount}\n`);

    // Verificar que los procedimientos existen
    console.log('🔍 Verificando procedimientos creados...\n');
    
    const verifyQuery = `
      SELECT ROUTINE_NAME, ROUTINE_DEFINITION
      FROM INFORMATION_SCHEMA.ROUTINES
      WHERE ROUTINE_SCHEMA = 'facility'
        AND ROUTINE_TYPE = 'PROCEDURE'
        AND ROUTINE_NAME LIKE 'sp_facility_%'
      ORDER BY ROUTINE_NAME;
    `;
    
    const request = pool.request();
    const result = await request.query(verifyQuery);
    
    if (result.recordset.length > 0) {
      console.log(`✅ ${result.recordset.length} procedimientos encontrados en la base de datos:\n`);
      result.recordset.forEach((proc, idx) => {
        console.log(`  ${idx + 1}. ${proc.ROUTINE_NAME}`);
        // Contar parámetros
        const paramCount = (proc.ROUTINE_DEFINITION.match(/@\w+/g) || []).length;
        console.log(`     └─ Parámetros: ${paramCount}`);
      });
    } else {
      console.log('⚠️  No se encontraron procedimientos en la BD');
    }

    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('📋 PROCEDIMIENTOS DISPONIBLES PARA USAR');
    console.log('════════════════════════════════════════════════════════════════\n');

    console.log('1️⃣  sp_facility_WoundOutcome');
    console.log('   Uso: EXEC facility.sp_facility_WoundOutcome');
    console.log('        @facilityId = 5, @startDate = \'2025-01-01\', @endDate = \'2025-12-31\'\n');

    console.log('2️⃣  sp_facility_AcuityIndex');
    console.log('   Uso: EXEC facility.sp_facility_AcuityIndex');
    console.log('        @facilityId = 5, @daysBack = 90\n');

    console.log('3️⃣  sp_facility_EtiologyDistribution');
    console.log('   Uso: EXEC facility.sp_facility_EtiologyDistribution');
    console.log('        @facilityId = 5, @date = \'2025-12-31\'\n');

    console.log('4️⃣  sp_facility_OutcomeReportGlobal');
    console.log('   Uso: EXEC facility.sp_facility_OutcomeReportGlobal');
    console.log('        @facilityId = 5, @startDate = \'2025-01-01\', @endDate = \'2025-12-31\'\n');

    console.log('5️⃣  sp_facility_WoundProgressTrend');
    console.log('   Uso: EXEC facility.sp_facility_WoundProgressTrend');
    console.log('        @facilityId = 5, @startDate = \'2025-01-01\', @endDate = \'2025-12-31\'\n');

    console.log('6️⃣  sp_facility_PatientWoundSummary');
    console.log('   Uso: EXEC facility.sp_facility_PatientWoundSummary');
    console.log('        @facilityId = 5, @startDate = \'2025-01-01\', @endDate = \'2025-12-31\'\n');

    console.log('7️⃣  sp_facility_HighRiskWounds');
    console.log('   Uso: EXEC facility.sp_facility_HighRiskWounds');
    console.log('        @facilityId = 5, @pushScoreThreshold = 12\n');

    console.log('════════════════════════════════════════════════════════════════');
    console.log('✅ PROCESO COMPLETADO EXITOSAMENTE');
    console.log('════════════════════════════════════════════════════════════════\n');

    await pool.close();
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
    console.error('\nDetalles:', error);
    await pool.close();
    process.exit(1);
  }
}

// Ejecutar
createStoredProcedures();

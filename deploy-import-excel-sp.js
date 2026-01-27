#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * DEPLOYMENT SCRIPT: Deploy sp_facility_import_excel_wounds
 * PURPOSE: Create the Excel import stored procedure in facility schema
 * USAGE: node deploy-import-excel-sp.js
 * ════════════════════════════════════════════════════════════════════════════════
 */

import mssql from 'mssql';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration
const dbConfig = {
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
    encrypt: true,
    connectionTimeout: 30000,
    requestTimeout: 30000
  }
};

async function deploySP() {
  let pool;
  
  try {
    console.log('🔄 Connecting to SQL Server...');
    pool = new mssql.ConnectionPool(dbConfig);
    await pool.connect();
    console.log('✅ Connected to SQL Server');

    // Read SQL script
    const sqlPath = path.join(__dirname, 'sp-facility-import-excel-wounds.sql');
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`SQL file not found: ${sqlPath}`);
    }

    const sqlScript = fs.readFileSync(sqlPath, 'utf8');
    console.log('📄 SQL script loaded');

    // Split script by GO statements
    const statements = sqlScript
      .split(/GO\s*$/m)
      .filter(stmt => stmt.trim().length > 0);

    let deployedStatements = 0;

    // Execute each statement
    for (const statement of statements) {
      if (statement.trim().length === 0) continue;
      
      try {
        const request = pool.request();
        await request.query(statement);
        deployedStatements++;
        console.log(`✅ Executed statement ${deployedStatements}/${statements.length}`);
      } catch (error) {
        console.error(`❌ Error executing statement: ${error.message}`);
        throw error;
      }
    }

    console.log('\n════════════════════════════════════════════════════════════');
    console.log('✅ DEPLOYMENT SUCCESSFUL');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`📌 Stored Procedure: facility.sp_facility_import_excel_wounds`);
    console.log(`📝 Schema: facility`);
    console.log(`📊 Table: facility.wound_encounters`);
    console.log(`⚙️  Statements executed: ${deployedStatements}`);
    console.log('\n📋 PROCEDURE DETAILS:');
    console.log('   • Purpose: Import wound data from Excel');
    console.log('   • Input: XML structure with wound records');
    console.log('   • Validates: Required fields, data types, enumerations');
    console.log('   • Returns: Success count and error details');
    console.log('\n🔧 USAGE:');
    console.log('   DECLARE @xml XML = <wounds>...</wounds>');
    console.log('   EXEC facility.sp_facility_import_excel_wounds');
    console.log('     @importData = @xml,');
    console.log('     @importedBy = \'user@email.com\'');
    console.log('\n════════════════════════════════════════════════════════════\n');

    await pool.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ DEPLOYMENT FAILED');
    console.error('════════════════════════════════════════════════════════════');
    console.error(`Error: ${error.message}`);
    console.error('════════════════════════════════════════════════════════════\n');
    
    if (pool) {
      await pool.close();
    }
    process.exit(1);
  }
}

deploySP();

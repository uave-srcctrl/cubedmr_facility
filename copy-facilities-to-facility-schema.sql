-- ============================================================================
-- Script: Copiar tabla Facilities al schema facility
-- Descripción: Copia la tabla de facilities de remoteWoundcareDB 
--              al schema facility en la BD local curisec
-- Base de datos: curisec (SQL Server 190.92.153.67:1433)
-- Schema destino: facility
-- ============================================================================

-- Paso 0: Habilitar Ad Hoc Distributed Queries (requerido para OPENROWSET)
PRINT 'Habilitando Ad Hoc Distributed Queries...'
EXEC sp_configure 'show advanced options', 1;
RECONFIGURE;
EXEC sp_configure 'Ad Hoc Distributed Queries', 1;
RECONFIGURE;
PRINT 'Ad Hoc Distributed Queries habilitado'
GO

-- Paso 1: Crear el schema facility si no existe
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'facility')
BEGIN
  EXEC sp_executesql N'CREATE SCHEMA facility'
  PRINT 'Schema facility creado exitosamente'
END
ELSE
BEGIN
  PRINT 'Schema facility ya existe'
END
GO

-- Paso 1.5: Eliminar tabla facility.facilities si existe
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[facility].[facilities]') AND type in (N'U'))
BEGIN
  DROP TABLE [facility].[facilities]
  PRINT 'Tabla facility.facilities eliminada'
END
GO

-- Paso 2: Crear tabla facility.facilities (copiando estructura de remoteWoundcareDB.dbo.Facilities)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[facility].[facilities]') AND type in (N'U'))
BEGIN
  CREATE TABLE [facility].[facilities] (
    [id] INT NOT NULL PRIMARY KEY,
    [name] VARCHAR(255) NOT NULL
  )
  PRINT 'Tabla facility.facilities creada exitosamente'
END
ELSE
BEGIN
  PRINT 'Tabla facility.facilities ya existe'
END
GO

-- Paso 3: No requiere servidor vinculado (se usa OPENROWSET)
PRINT 'Usando OPENROWSET para acceso directo a remoteWoundcareDB'
GO

-- Paso 4: Copiar datos de remoteWoundcareDB a schema facility usando OPENROWSET
BEGIN TRY
  PRINT 'Iniciando copia de datos...'
  
  -- Insertar datos desde servidor remoto usando OPENROWSET
  INSERT INTO [facility].[facilities] (id, name)
  SELECT 
    f.FacilityId,
    f.FacilityName
  FROM OPENROWSET('SQLNCLI11', 
    'Server=190.92.153.67,1433;User ID=curisec;Password=curisec123;',
    'SELECT FacilityId, FacilityName FROM remoteWoundcareDB.dbo.Facilities') AS f
  WHERE NOT EXISTS (
    SELECT 1 FROM [facility].[facilities] local 
    WHERE local.id = f.FacilityId
  )
  
  PRINT 'Datos copiados exitosamente'
  
  -- Mostrar resumen
  SELECT 
    COUNT(*) AS TotalFacilities
  FROM [facility].[facilities]
  
END TRY
BEGIN CATCH
  PRINT 'Error en copia de datos:'
  PRINT ERROR_MESSAGE()
END CATCH
GO

-- Paso 5: Crear índices para mejorar rendimiento
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IDX_facilities_name' AND object_id = OBJECT_ID(N'[facility].[facilities]'))
BEGIN
  CREATE INDEX IDX_facilities_name ON [facility].[facilities]([name])
  PRINT 'Índice IDX_facilities_name creado'
END
GO

-- Paso 6: Verificar que la tabla se copió correctamente
PRINT '=== VERIFICACIÓN FINAL ==='
PRINT 'Tabla: facility.facilities'
SELECT 
  TABLE_SCHEMA,
  TABLE_NAME,
  COLUMN_NAME,
  DATA_TYPE,
  IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'facility' AND TABLE_NAME = 'facilities'
ORDER BY ORDINAL_POSITION
GO

-- Mostrar datos copiados
PRINT 'Datos en facility.facilities:'
SELECT 
  id,
  name
FROM [facility].[facilities]
ORDER BY id
GO

PRINT 'Script completado exitosamente'

-- =====================================================
-- EXPORT SCHEMA: facility
-- Database: curisec
-- =====================================================

-- Create backup database if you want to restore later
-- BACKUP DATABASE [curisec] TO DISK = N'C:\var\opt\mssql\backup\curisec_facility_backup.bak'

-- =====================================================
-- 1. GET ALL TABLES IN SCHEMA facility
-- =====================================================
SELECT 
    TABLE_SCHEMA,
    TABLE_NAME,
    TABLE_TYPE
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'facility'
ORDER BY TABLE_NAME;

-- =====================================================
-- 2. EXPORT TABLE CREATION SCRIPTS
-- =====================================================
-- This generates CREATE TABLE statements for all tables in facility schema

SELECT 
    'CREATE TABLE [facility].[' + t.name + '] (' + CHAR(13) +
    STUFF((
        SELECT 
            ',' + CHAR(13) + 
            '    [' + c.name + '] ' + 
            CASE 
                WHEN t_col.name IS NOT NULL THEN 'INTEGER'
                WHEN t_col_float.name IS NOT NULL THEN 'FLOAT'
                WHEN t_col_varchar.name IS NOT NULL THEN 'VARCHAR(MAX)'
                WHEN t_col_datetime.name IS NOT NULL THEN 'DATETIME'
                ELSE 'NVARCHAR(MAX)'
            END +
            CASE WHEN c.is_nullable = 0 THEN ' NOT NULL' ELSE '' END +
            CASE WHEN c.is_identity = 1 THEN ' IDENTITY(1,1)' ELSE '' END
        FROM sys.columns c
        LEFT JOIN sys.types t_col ON c.user_type_id = t_col.user_type_id AND t_col.name = 'int'
        LEFT JOIN sys.types t_col_float ON c.user_type_id = t_col_float.user_type_id AND t_col_float.name = 'float'
        LEFT JOIN sys.types t_col_varchar ON c.user_type_id = t_col_varchar.user_type_id AND t_col_varchar.name = 'varchar'
        LEFT JOIN sys.types t_col_datetime ON c.user_type_id = t_col_datetime.user_type_id AND t_col_datetime.name = 'datetime'
        WHERE c.object_id = t.object_id
        FOR XML PATH (''), TYPE
    ).value('.', 'NVARCHAR(MAX)'), 1, 1, CHAR(32)) +
    CHAR(13) + ');'
FROM sys.tables t
WHERE SCHEMA_NAME(t.schema_id) = 'facility'
ORDER BY t.name;

-- =====================================================
-- 3. GET ALL STORED PROCEDURES IN SCHEMA facility
-- =====================================================
SELECT 
    ROUTINE_SCHEMA,
    ROUTINE_NAME,
    ROUTINE_TYPE
FROM INFORMATION_SCHEMA.ROUTINES
WHERE ROUTINE_SCHEMA = 'facility'
AND ROUTINE_TYPE = 'PROCEDURE'
ORDER BY ROUTINE_NAME;

-- =====================================================
-- 4. EXPORT STORED PROCEDURE CREATION SCRIPTS
-- =====================================================
-- This shows the code for each stored procedure
DECLARE @ProcName NVARCHAR(MAX)
DECLARE ProcCursor CURSOR FOR
SELECT ROUTINE_NAME
FROM INFORMATION_SCHEMA.ROUTINES
WHERE ROUTINE_SCHEMA = 'facility'
AND ROUTINE_TYPE = 'PROCEDURE'
ORDER BY ROUTINE_NAME

OPEN ProcCursor
FETCH NEXT FROM ProcCursor INTO @ProcName

WHILE @@FETCH_STATUS = 0
BEGIN
    PRINT '-- ====================='
    PRINT '-- STORED PROCEDURE: [facility].[' + @ProcName + ']'
    PRINT '-- ====================='
    EXEC sp_helptext '[facility].[' + @ProcName + ']'
    PRINT ''
    FETCH NEXT FROM ProcCursor INTO @ProcName
END

CLOSE ProcCursor
DEALLOCATE ProcCursor

-- =====================================================
-- 5. GET ALL FUNCTIONS IN SCHEMA facility
-- =====================================================
SELECT 
    ROUTINE_SCHEMA,
    ROUTINE_NAME,
    ROUTINE_TYPE
FROM INFORMATION_SCHEMA.ROUTINES
WHERE ROUTINE_SCHEMA = 'facility'
AND ROUTINE_TYPE IN ('FUNCTION')
ORDER BY ROUTINE_NAME;

-- =====================================================
-- 6. EXPORT FUNCTION CREATION SCRIPTS
-- =====================================================
DECLARE @FuncName NVARCHAR(MAX)
DECLARE FuncCursor CURSOR FOR
SELECT ROUTINE_NAME
FROM INFORMATION_SCHEMA.ROUTINES
WHERE ROUTINE_SCHEMA = 'facility'
AND ROUTINE_TYPE = 'FUNCTION'
ORDER BY ROUTINE_NAME

OPEN FuncCursor
FETCH NEXT FROM FuncCursor INTO @FuncName

WHILE @@FETCH_STATUS = 0
BEGIN
    PRINT '-- ====================='
    PRINT '-- FUNCTION: [facility].[' + @FuncName + ']'
    PRINT '-- ====================='
    EXEC sp_helptext '[facility].[' + @FuncName + ']'
    PRINT ''
    FETCH NEXT FROM FuncCursor INTO @FuncName
END

CLOSE FuncCursor
DEALLOCATE FuncCursor

-- =====================================================
-- 7. GET TABLE STATISTICS (row counts)
-- =====================================================
SELECT 
    SCHEMA_NAME(t.schema_id) AS SchemaName,
    t.name AS TableName,
    SUM(p.rows) AS RowCount
FROM sys.tables t
INNER JOIN sys.partitions p ON t.object_id = p.object_id
WHERE SCHEMA_NAME(t.schema_id) = 'facility'
AND p.index_id IN (0, 1)
GROUP BY SCHEMA_NAME(t.schema_id), t.name
ORDER BY t.name;

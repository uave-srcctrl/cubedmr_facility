-- ════════════════════════════════════════════════════════════════════════════════
-- STORED PROCEDURE: sp_facility_import_excel_wounds
-- SCHEMA: facility
-- PURPOSE: Import wound data from Excel file into facility.wound_encounters table
-- 
-- PARAMETERS:
--   @importData: XML structure containing wound records to import
--   @importedBy: User email or identifier performing the import
--   
-- RETURNS:
--   Success count and error details in result set
--
-- EXAMPLE USAGE:
--   DECLARE @xml XML = N'
--   <wounds>
--     <wound>
--       <patient_id>P001</patient_id>
--       <facility_id>5</facility_id>
--       <provider_id>101</provider_id>
--       <patient_name>Juan Pérez</patient_name>
--       <location>Left leg</location>
--       <etiology>Pressure Ulcer</etiology>
--       <width>5.2</width>
--       <height>4.8</height>
--       <depth>1.5</depth>
--       <surface>10.5</surface>
--       <exudate>Moderate</exudate>
--       <tissue>Granulation</tissue>
--       <treatment>Dressing change</treatment>
--       <frequency>Daily</frequency>
--       <progress>Improving</progress>
--       <disposition>Active</disposition>
--       <debridement>Autolytic</debridement>
--       <initial_surface>12.0</initial_surface>
--       <start_date>2024-12-15</start_date>
--       <dos>2025-01-15</dos>
--       <days>31</days>
--       <healing_percentage>12.5</healing_percentage>
--       <healing_rate>0.4</healing_rate>
--       <healing_days>90</healing_days>
--       <push_score>12</push_score>
--     </wound>
--   </wounds>'
--   
--   EXEC sp_facility_import_excel_wounds @importData = @xml, @importedBy = 'user@email.com'
-- ════════════════════════════════════════════════════════════════════════════════

DROP PROCEDURE IF EXISTS facility.sp_facility_import_excel_wounds;
GO

CREATE PROCEDURE facility.sp_facility_import_excel_wounds
  @importData XML,
  @importedBy NVARCHAR(255)
AS
BEGIN
  SET NOCOUNT ON;
  
  BEGIN TRY
    -- Start transaction for all-or-nothing import
    BEGIN TRANSACTION;
    
    DECLARE @successCount INT = 0;
    DECLARE @errorCount INT = 0;
    DECLARE @totalProcessed INT = 0;
    
    -- Create temp table for validation results
    CREATE TABLE #ImportErrors (
      RowNum INT,
      ErrorMessage NVARCHAR(MAX)
    );
    
    -- Extract and validate data from XML
    INSERT INTO #ImportErrors (RowNum, ErrorMessage)
    SELECT 
      T.c.value('(row_index/text())[1]', 'INT') AS RowNum,
      CASE 
        -- Required field validation
        WHEN NULLIF(LTRIM(RTRIM(T.c.value('(patient_id/text())[1]', 'NVARCHAR(50)'))), '') IS NULL 
          THEN 'Missing required field: patient_id'
        WHEN NULLIF(LTRIM(RTRIM(T.c.value('(facility_id/text())[1]', 'NVARCHAR(50)'))), '') IS NULL 
          THEN 'Missing required field: facility_id'
        WHEN NULLIF(LTRIM(RTRIM(T.c.value('(location/text())[1]', 'NVARCHAR(100)'))), '') IS NULL 
          THEN 'Missing required field: location'
        WHEN NULLIF(LTRIM(RTRIM(T.c.value('(etiology/text())[1]', 'NVARCHAR(100)'))), '') IS NULL 
          THEN 'Missing required field: etiology'
        WHEN NULLIF(LTRIM(RTRIM(T.c.value('(surface/text())[1]', 'NVARCHAR(20)'))), '') IS NULL 
          THEN 'Missing required field: surface'
        WHEN NULLIF(LTRIM(RTRIM(T.c.value('(push_score/text())[1]', 'NVARCHAR(20)'))), '') IS NULL 
          THEN 'Missing required field: push_score'
        WHEN NULLIF(LTRIM(RTRIM(T.c.value('(progress/text())[1]', 'NVARCHAR(50)'))), '') IS NULL 
          THEN 'Missing required field: progress'
        WHEN NULLIF(LTRIM(RTRIM(T.c.value('(disposition/text())[1]', 'NVARCHAR(50)'))), '') IS NULL 
          THEN 'Missing required field: disposition'
        WHEN NULLIF(LTRIM(RTRIM(T.c.value('(dos/text())[1]', 'NVARCHAR(20)'))), '') IS NULL 
          THEN 'Missing required field: dos'
        
        -- Numeric validation
        WHEN NOT (T.c.value('(surface/text())[1]', 'NVARCHAR(20)') LIKE '%[0-9]%' AND CAST(T.c.value('(surface/text())[1]', 'NVARCHAR(20)') AS DECIMAL(10,2)) >= 0)
          THEN CONCAT('Invalid surface area: ', T.c.value('(surface/text())[1]', 'NVARCHAR(20)'))
        WHEN NOT (T.c.value('(push_score/text())[1]', 'NVARCHAR(20)') LIKE '%[0-9]%' AND CAST(T.c.value('(push_score/text())[1]', 'NVARCHAR(20)') AS INT) BETWEEN 0 AND 17)
          THEN CONCAT('Invalid PUSH score: ', T.c.value('(push_score/text())[1]', 'NVARCHAR(20)'), ' (must be 0-17)')
        WHEN NOT (T.c.value('(facility_id/text())[1]', 'NVARCHAR(50)') LIKE '%[0-9]%')
          THEN CONCAT('Invalid facility ID: ', T.c.value('(facility_id/text())[1]', 'NVARCHAR(50)'))
        
        -- Enumeration validation
        WHEN T.c.value('(progress/text())[1]', 'NVARCHAR(50)') NOT IN ('Improving', 'Deteriorating', 'Stable')
          THEN CONCAT('Invalid progress value: ', T.c.value('(progress/text())[1]', 'NVARCHAR(50)'), '. Must be: Improving, Deteriorating, or Stable')
        WHEN T.c.value('(disposition/text())[1]', 'NVARCHAR(50)') NOT IN ('Active', 'Resolved', 'New', 'Hospitalized')
          THEN CONCAT('Invalid disposition value: ', T.c.value('(disposition/text())[1]', 'NVARCHAR(50)'), '. Must be: Active, Resolved, New, or Hospitalized')
        WHEN T.c.value('(exudate/text())[1]', 'NVARCHAR(50)') NOT IN ('None', 'Minimal', 'Moderate', 'Heavy', 'Copious')
          THEN CONCAT('Invalid exudate value: ', T.c.value('(exudate/text())[1]', 'NVARCHAR(50)'))
        WHEN T.c.value('(debridement/text())[1]', 'NVARCHAR(50)') NOT IN ('None', 'Autolytic', 'Enzymatic', 'Mechanical', 'Surgical')
          THEN CONCAT('Invalid debridement value: ', T.c.value('(debridement/text())[1]', 'NVARCHAR(50)'))
        
        -- Date validation
        WHEN NOT (ISDATE(T.c.value('(dos/text())[1]', 'NVARCHAR(20)')) = 1)
          THEN CONCAT('Invalid date format: ', T.c.value('(dos/text())[1]', 'NVARCHAR(20)'), '. Expected YYYY-MM-DD')
        WHEN NOT (ISDATE(T.c.value('(start_date/text())[1]', 'NVARCHAR(20)')) = 1) AND T.c.value('(start_date/text())[1]', 'NVARCHAR(20)') IS NOT NULL
          THEN CONCAT('Invalid start_date format: ', T.c.value('(start_date/text())[1]', 'NVARCHAR(20)'), '. Expected YYYY-MM-DD')
        
        ELSE NULL
      END AS ErrorMessage
    FROM @importData.nodes('/wounds/wound') AS T(c)
    WHERE T.c.value('(row_index/text())[1]', 'INT') IS NOT NULL
       OR T.c.value('(patient_id/text())[1]', 'NVARCHAR(50)') IS NOT NULL;
    
    -- Check if there are validation errors
    IF EXISTS (SELECT 1 FROM #ImportErrors)
    BEGIN
      -- Return validation errors
      SELECT 
        'ERROR' AS Status,
        CONCAT('Validation failed for row ', RowNum, ': ', ErrorMessage) AS Message
      FROM #ImportErrors
      ORDER BY RowNum;
      
      ROLLBACK TRANSACTION;
      DROP TABLE #ImportErrors;
      RETURN;
    END;
    
    -- Insert valid records into wound_encounters
    INSERT INTO facility.wound_encounters (
      patient_id,
      facility_id,
      provider_id,
      patient_name,
      location,
      etiology,
      width,
      height,
      depth,
      surface,
      exudate,
      tissue,
      treatment,
      frequency,
      progress,
      disposition,
      debridement,
      initial_surface,
      start_date,
      dos,
      days,
      healing_percentage,
      healing_rate,
      healing_days,
      push_score,
      import_id
    )
    SELECT 
      LTRIM(RTRIM(T.c.value('(patient_id/text())[1]', 'NVARCHAR(50)'))) AS patient_id,
      CAST(T.c.value('(facility_id/text())[1]', 'NVARCHAR(50)') AS INT) AS facility_id,
      CAST(NULLIF(T.c.value('(provider_id/text())[1]', 'NVARCHAR(50)'), '') AS INT) AS provider_id,
      LTRIM(RTRIM(T.c.value('(patient_name/text())[1]', 'NVARCHAR(100)'))) AS patient_name,
      LTRIM(RTRIM(T.c.value('(location/text())[1]', 'NVARCHAR(100)'))) AS location,
      -- Normalize etiology to standard format (e.g., "Pressure, Stage 3" -> "Pressure (III)")
      facility.fn_normalize_etiology(LTRIM(RTRIM(T.c.value('(etiology/text())[1]', 'NVARCHAR(100)')))) AS etiology,
      -- Using larger precision to prevent overflow
      CAST(NULLIF(T.c.value('(width/text())[1]', 'NVARCHAR(20)'), '') AS DECIMAL(12,4)) AS width,
      CAST(NULLIF(T.c.value('(height/text())[1]', 'NVARCHAR(20)'), '') AS DECIMAL(12,4)) AS height,
      CAST(NULLIF(T.c.value('(depth/text())[1]', 'NVARCHAR(20)'), '') AS DECIMAL(12,4)) AS depth,
      CAST(T.c.value('(surface/text())[1]', 'NVARCHAR(20)') AS DECIMAL(15,4)) AS surface,
      NULLIF(LTRIM(RTRIM(T.c.value('(exudate/text())[1]', 'NVARCHAR(50)'))), '') AS exudate,
      NULLIF(LTRIM(RTRIM(T.c.value('(tissue/text())[1]', 'NVARCHAR(100)'))), '') AS tissue,
      NULLIF(LTRIM(RTRIM(T.c.value('(treatment/text())[1]', 'NVARCHAR(MAX)'))), '') AS treatment,
      NULLIF(LTRIM(RTRIM(T.c.value('(frequency/text())[1]', 'NVARCHAR(50)'))), '') AS frequency,
      LTRIM(RTRIM(T.c.value('(progress/text())[1]', 'NVARCHAR(50)'))) AS progress,
      LTRIM(RTRIM(T.c.value('(disposition/text())[1]', 'NVARCHAR(50)'))) AS disposition,
      NULLIF(LTRIM(RTRIM(T.c.value('(debridement/text())[1]', 'NVARCHAR(50)'))), '') AS debridement,
      CAST(NULLIF(T.c.value('(initial_surface/text())[1]', 'NVARCHAR(20)'), '') AS DECIMAL(15,4)) AS initial_surface,
      TRY_CONVERT(DATE, T.c.value('(start_date/text())[1]', 'NVARCHAR(20)'), 120) AS start_date,
      TRY_CONVERT(DATE, T.c.value('(dos/text())[1]', 'NVARCHAR(20)'), 120) AS dos,
      CAST(NULLIF(T.c.value('(days/text())[1]', 'NVARCHAR(20)'), '') AS INT) AS days,
      -- Using larger precision to prevent overflow (DECIMAL(10,4) supports up to 999999.9999)
      CAST(NULLIF(T.c.value('(healing_percentage/text())[1]', 'NVARCHAR(20)'), '') AS DECIMAL(10,4)) AS healing_percentage,
      -- Using larger precision (DECIMAL(15,4) supports very large values)
      CAST(NULLIF(T.c.value('(healing_rate/text())[1]', 'NVARCHAR(20)'), '') AS DECIMAL(15,4)) AS healing_rate,
      CAST(NULLIF(T.c.value('(healing_days/text())[1]', 'NVARCHAR(20)'), '') AS INT) AS healing_days,
      CAST(T.c.value('(push_score/text())[1]', 'NVARCHAR(20)') AS INT) AS push_score,
      TRY_CONVERT(UNIQUEIDENTIFIER, T.c.value('(import_id/text())[1]', 'NVARCHAR(50)')) AS import_id
    FROM @importData.nodes('/wounds/wound') AS T(c);
    
    SET @successCount = @@ROWCOUNT;
    SET @totalProcessed = @successCount;
    
    -- Commit transaction
    COMMIT TRANSACTION;
    
    -- Return success result
    SELECT 
      'SUCCESS' AS Status,
      CONCAT('Import completed successfully. ', @successCount, ' record(s) inserted.') AS Message,
      @successCount AS InsertedCount,
      @totalProcessed AS TotalProcessed,
      GETDATE() AS ImportDateTime,
      @importedBy AS ImportedBy;
    
    DROP TABLE #ImportErrors;
    
  END TRY
  BEGIN CATCH
    -- Rollback on error
    IF @@TRANCOUNT > 0
      ROLLBACK TRANSACTION;
    
    -- Return error information
    SELECT 
      'ERROR' AS Status,
      CONCAT('Import failed: ', ERROR_MESSAGE()) AS Message,
      ERROR_NUMBER() AS ErrorNumber,
      ERROR_SEVERITY() AS ErrorSeverity,
      ERROR_STATE() AS ErrorState;
    
    DROP TABLE IF EXISTS #ImportErrors;
  END CATCH;
END;
GO

-- ════════════════════════════════════════════════════════════════════════════════
-- VERIFY PROCEDURE CREATED
-- ════════════════════════════════════════════════════════════════════════════════
IF OBJECT_ID('facility.sp_facility_import_excel_wounds', 'P') IS NOT NULL
  PRINT 'Stored procedure sp_facility_import_excel_wounds created successfully in facility schema.'
ELSE
  PRINT 'ERROR: Failed to create stored procedure.';

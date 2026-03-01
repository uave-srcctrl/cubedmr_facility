-- ==========================================
-- FACILITY SCHEMA - EXPORT FROM curisec
-- Generated: 2026-02-28 23:48:27
-- ==========================================


-- ==========================================
-- U : [facility].[Facilities]
-- ==========================================

-- ==========================================
-- U : [facility].[Facility Data Report ]
-- ==========================================

-- ==========================================
-- U : [facility].[user_settings]
-- ==========================================

-- ==========================================
-- U : [facility].[wound_encounter_edits]
-- ==========================================

-- ==========================================
-- U : [facility].[wound_encounters]
-- ==========================================

-- ==========================================
-- U : [facility].[wound_encounters_imports_logs]
-- ==========================================

-- ==========================================
-- FUNCTION: [facility].[fn_normalize_etiology]
-- ==========================================
CREATE FUNCTION facility.fn_normalize_etiology(@etiology NVARCHAR(100))
RETURNS NVARCHAR(100)
AS
BEGIN
    DECLARE @result NVARCHAR(100);
    DECLARE @trimmed NVARCHAR(100);
    DECLARE @stage NVARCHAR(10);
    DECLARE @romanStage NVARCHAR(15);
    
    -- Handle NULL or empty
    IF @etiology IS NULL OR LTRIM(RTRIM(@etiology)) = ''
        RETURN 'Unknown';
    
    SET @trimmed = LTRIM(RTRIM(@etiology));
    
    -- Stage conversion helper
    -- Convert 1->I, 2->II, 3->III, 4->IV
    
    -- Pattern: Pressure, Stage 3 / Pressure Stage III / Pressure Ulcer Stage 2
    IF @trimmed LIKE 'Pressure%Stage%[1-4IViv]%' OR @trimmed LIKE 'PU%Stage%[1-4IViv]%'
    BEGIN
        -- Extract the stage number/roman
        SET @stage = LTRIM(RTRIM(REPLACE(REPLACE(REPLACE(REPLACE(
            SUBSTRING(@trimmed, PATINDEX('%Stage%', @trimmed) + 5, 10),
            ',', ''), ' ', ''), ':', ''), 'Stage', '')));
        SET @stage = LEFT(@stage, PATINDEX('%[^1-4IViv]%', @stage + ' ') - 1);
        
        -- Convert to Roman numeral
        SET @romanStage = CASE UPPER(@stage)
            WHEN '1' THEN 'I'
            WHEN '2' THEN 'II'
            WHEN '3' THEN 'III'
            WHEN '4' THEN 'IV'
            WHEN 'I' THEN 'I'
            WHEN 'II' THEN 'II'
            WHEN 'III' THEN 'III'
            WHEN 'IV' THEN 'IV'
            ELSE @stage
        END;
        
        RETURN 'Pressure (' + @romanStage + ')';
    END
    
    -- Pattern: Stage 3 Pressure
    IF @trimmed LIKE 'Stage%[1-4IViv]%Pressure%' OR @trimmed LIKE 'Stage%[1-4IViv]%PU%'
    BEGIN
        SET @stage = LTRIM(RTRIM(SUBSTRING(@trimmed, 6, 
            PATINDEX('%Pressure%', @trimmed) - 6)));
        SET @stage = REPLACE(REPLACE(@stage, ',', ''), ' ', '');
        
        SET @romanStage = CASE UPPER(@stage)
            WHEN '1' THEN 'I'
            WHEN '2' THEN 'II'
            WHEN '3' THEN 'III'
            WHEN '4' THEN 'IV'
            WHEN 'I' THEN 'I'
            WHEN 'II' THEN 'II'
            WHEN 'III' THEN 'III'
            WHEN 'IV' THEN 'IV'
            ELSE @stage
        END;
        
        RETURN 'Pressure (' + @romanStage + ')';
    END
    
    -- Pattern: Pressure DTI / DTI Pressure
    IF @trimmed LIKE '%Pressure%DTI%' OR @trimmed LIKE '%DTI%Pressure%'
        OR @trimmed LIKE '%Pressure%Deep Tissue%' OR @trimmed LIKE '%Deep Tissue%Pressure%'
        RETURN 'Pressure (DTI)';
    
    -- Pattern: Pressure Unstageable / Unstageable Pressure
    IF @trimmed LIKE '%Pressure%Unstageable%' OR @trimmed LIKE '%Unstageable%Pressure%'
        RETURN 'Pressure (Unstageable)';
    
    -- Pattern: Simple Pressure 3 or Pressure III
    IF @trimmed LIKE 'Pressure [1-4]' OR @trimmed LIKE 'Pressure[1-4]'
    BEGIN
        SET @stage = RIGHT(@trimmed, 1);
        SET @romanStage = CASE @stage
            WHEN '1' THEN 'I'
            WHEN '2' THEN 'II'
            WHEN '3' THEN 'III'
            WHEN '4' THEN 'IV'
            ELSE @stage
        END;
        RETURN 'Pressure (' + @romanStage + ')';
    END
    
    IF @trimmed LIKE 'Pressure I' OR @trimmed LIKE 'Pressure II' 
        OR @trimmed LIKE 'Pressure III' OR @trimmed LIKE 'Pressure IV'
    BEGIN
        SET @stage = LTRIM(RTRIM(REPLACE(@trimmed, 'Pressure', '')));
        RETURN 'Pressure (' + @stage + ')';
    END
    
    -- Pattern: PU3 or PU III
    IF @trimmed LIKE 'PU[1-4]' OR @trimmed LIKE 'PU [1-4]'
    BEGIN
        SET @stage = RIGHT(REPLACE(@trimmed, ' ', ''), 1);
        SET @romanStage = CASE @stage
            WHEN '1' THEN 'I'
            WHEN '2' THEN 'II'
            WHEN '3' THEN 'III'
            WHEN '4' THEN 'IV'
            ELSE @stage
        END;
        RETURN 'Pressure (' + @romanStage + ')';
    END
    
    IF @trimmed LIKE 'PU I' OR @trimmed LIKE 'PU II' OR @trimmed LIKE 'PU III' OR @trimmed LIKE 'PU IV'
        OR @trimmed LIKE 'PUI' OR @trimmed LIKE 'PUII' OR @trimmed LIKE 'PUIII' OR @trimmed LIKE 'PUIV'
    BEGIN
        SET @stage = LTRIM(RTRIM(REPLACE(REPLACE(@trimmed, 'PU', ''), ' ', '')));
        RETURN 'Pressure (' + @stage + ')';
    END
    
    -- Pattern: Just Pressure / Pressure Ulcer / Pressure Injury
    IF @trimmed = 'Pressure' OR @trimmed = 'Pressure Ulcer' OR @trimmed = 'Pressure Injury' OR @trimmed = 'Pressure Wound'
        RETURN 'Pressure';
    
    -- No pattern matched, return original
    RETURN @trimmed;
END;
GO

-- ==========================================
-- P : [facility].[etiology_distribution]
-- ==========================================
-- Modify facility.etiology_distribution to accept date range
CREATE PROCEDURE facility.etiology_distribution
@facility_id INT = NULL,
@dos_start DATE = NULL,
@dos_end DATE = NULL
AS
BEGIN
    IF @dos_start IS NULL AND @dos_end IS NULL
    BEGIN
        RAISERROR('Error: @dos_start and @dos_end parameters are required', 16, 1);
        RETURN;
    END;

    IF @dos_start > @dos_end
    BEGIN
        RAISERROR('Error: @dos_start must be less than or equal to @dos_end', 16, 1);
        RETURN;
    END;

    SELECT 
        etiology as woundEtiology
        , COUNT(*) as count
        , CAST(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM facility.wound_encounters we2 
            WHERE we2.dos BETWEEN @dos_start AND @dos_end 
            AND (@facility_id IS NULL OR we2.facility_id = @facility_id)) AS NUMERIC(5,2)) as percentage
    FROM facility.wound_encounters we
    WHERE we.dos BETWEEN @dos_start AND @dos_end
        AND (@facility_id IS NULL OR we.facility_id = @facility_id)
        AND etiology IS NOT NULL
    GROUP BY etiology
    ORDER BY count DESC;
END;
GO

-- ==========================================
-- P : [facility].[outcome_report_global]
-- ==========================================
CREATE PROCEDURE [facility].[outcome_report_global]
  @facility_id INT,
  @dos_start DATE = NULL,
  @dos_end DATE = NULL
AS
BEGIN
  SET NOCOUNT ON;
  
  IF @dos_start IS NULL SET @dos_start = '1900-01-01';
  IF @dos_end IS NULL SET @dos_end = CAST(GETDATE() AS DATE);
  
  SELECT
    CAST(COUNT(CASE WHEN disposition = 'Resolved' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) AS DECIMAL(5,2)) as [Overall Resolution Rate],
    CAST(COUNT(CASE WHEN disposition = 'Active' AND progress = 'Improving' THEN 1 END) * 100.0 / NULLIF(COUNT(CASE WHEN disposition = 'Active' THEN 1 END), 0) AS DECIMAL(5,2)) as [Active Wound Healing Rate],
    CAST(COUNT(CASE WHEN progress = 'Improving' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) AS DECIMAL(5,2)) as [Average Healing Rate],
    CAST(COUNT(CASE WHEN progress = 'Improving' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) AS DECIMAL(5,2)) as [Percent of Wounds Improving],
    CAST(COUNT(CASE WHEN progress = 'Deteriorating' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) AS DECIMAL(5,2)) as [Percent of Wounds Deteriorating],
    CAST(COUNT(CASE WHEN progress = 'Stable' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) AS DECIMAL(5,2)) as [Percent of Wounds Stable],
    COUNT(CASE WHEN disposition = 'New' THEN 1 END) as [Number of New Wounds],
    COUNT(CASE WHEN disposition = 'Resolved' THEN 1 END) as [Number of Resolved Wounds],
    COUNT(CASE WHEN days > 100 THEN 1 END) as [Number of Wounds With 100 or more Days],
    ISNULL(AVG(CAST(days AS DECIMAL(10,2))), 0) as [Average Healing Days - All],
    ISNULL(AVG(CASE WHEN etiology LIKE '%Arterial%' THEN CAST(days AS DECIMAL(10,2)) END), 0) as [Average Healing Days - Arterial],
    ISNULL(AVG(CASE WHEN etiology LIKE '%Venous%' THEN CAST(days AS DECIMAL(10,2)) END), 0) as [Average Healing Days - Venous],
    ISNULL(AVG(CASE WHEN etiology LIKE '%Diabetic%' THEN CAST(days AS DECIMAL(10,2)) END), 0) as [Average Healing Days - Diabetic],
    ISNULL(AVG(CASE WHEN etiology LIKE '%Pressure (I)%' THEN CAST(days AS DECIMAL(10,2)) END), 0) as [Average Healing Days - Pressure Ulcer Stage I],
    ISNULL(AVG(CASE WHEN etiology LIKE '%Pressure (II)%' THEN CAST(days AS DECIMAL(10,2)) END), 0) as [Average Healing Days - Pressure Ulcer Stage II],
    ISNULL(AVG(CASE WHEN etiology LIKE '%Pressure (III)%' THEN CAST(days AS DECIMAL(10,2)) END), 0) as [Average Healing Days - Pressure Ulcer Stage III],
    ISNULL(AVG(CASE WHEN etiology LIKE '%Pressure (IV)%' THEN CAST(days AS DECIMAL(10,2)) END), 0) as [Average Healing Days - Pressure Ulcer Stage IV],
    CAST(COUNT(CASE WHEN debridement IS NULL OR debridement = 'None' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) AS DECIMAL(5,2)) as [Perc of Wounds not Debrided (except heels)],
    CAST(COUNT(CASE WHEN disposition = 'Hospitalized' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) AS DECIMAL(5,2)) as [All Time Hospitalization Rate]
  FROM [facility].[wound_encounters]
  WHERE facility_id = @facility_id AND dos BETWEEN @dos_start AND @dos_end;
END;
GO

-- ==========================================
-- P : [facility].[report_FacilityAcuityIndex]
-- ==========================================

CREATE PROCEDURE [facility].[report_FacilityAcuityIndex]
    @facilityId INT,
    @startDate DATE = NULL,
    @endDate DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    IF @facilityId IS NULL
        RAISERROR('facilityId is required', 16, 1);
    
    -- If @endDate is provided with @startDate, use date range mode
    IF @endDate IS NOT NULL AND @startDate IS NOT NULL
    BEGIN
        -- Date Range Mode: Calculate weekly acuity for each week in the range
        ;WITH WeeklyData AS (
            SELECT 
                DATEPART(ISO_WEEK, we.dos) AS [week],
                DATEPART(YEAR, we.dos) AS [year],
                we.patient_id,
                we.id
            FROM [facility].[wound_encounters] we
            WHERE we.facility_id = @facilityId
              AND we.dos >= @startDate
              AND we.dos <= @endDate
        )
        SELECT 
            [week],
            COUNT(DISTINCT patient_id) AS [patients],
            COUNT(DISTINCT id) AS [wounds],
            CAST(
                COUNT(DISTINCT id) * 1.0 / NULLIF(COUNT(DISTINCT patient_id), 0) 
                AS DECIMAL(10, 2)
            ) AS [Facility Acuity Index]
        FROM WeeklyData
        GROUP BY [year], [week]
        ORDER BY [year], [week];
    END
    ELSE
    BEGIN
        -- 4-weeks BACKWARD mode: Calculate 4 weeks ending at @startDate (which is the endDate/dos)
        -- If @startDate is NULL, use current date as the end point
        DECLARE @referenceDate DATE = COALESCE(@startDate, CAST(GETDATE() AS DATE));
        
        ;WITH weekRanges AS (
            -- Week 4 (oldest): -28 to -22 days from reference
            SELECT 
                DATEPART(WEEK, DATEADD(DAY, -27, @referenceDate)) AS [week],
                DATEADD(DAY, -27, @referenceDate) AS week_start,
                DATEADD(DAY, -21, @referenceDate) AS week_end,
                1 AS sort_order
            UNION ALL
            -- Week 3: -21 to -15 days from reference
            SELECT 
                DATEPART(WEEK, DATEADD(DAY, -20, @referenceDate)),
                DATEADD(DAY, -20, @referenceDate),
                DATEADD(DAY, -14, @referenceDate),
                2
            UNION ALL
            -- Week 2: -14 to -8 days from reference
            SELECT 
                DATEPART(WEEK, DATEADD(DAY, -13, @referenceDate)),
                DATEADD(DAY, -13, @referenceDate),
                DATEADD(DAY, -7, @referenceDate),
                3
            UNION ALL
            -- Week 1 (most recent): -7 to reference date
            SELECT 
                DATEPART(WEEK, DATEADD(DAY, -6, @referenceDate)),
                DATEADD(DAY, -6, @referenceDate),
                @referenceDate,
                4
        )
        SELECT 
            wr.[week],
            COUNT(DISTINCT we.patient_id) AS [patients],
            COUNT(DISTINCT we.id) AS [wounds],
            CAST(
                COUNT(DISTINCT we.id) * 1.0 / NULLIF(COUNT(DISTINCT we.patient_id), 0) 
                AS DECIMAL(10, 2)
            ) AS [Facility Acuity Index]
        FROM weekRanges wr
        LEFT JOIN [facility].[wound_encounters] we ON 
            we.facility_id = @facilityId
            AND we.dos >= wr.week_start
            AND we.dos <= wr.week_end
        GROUP BY wr.[week], wr.sort_order
        ORDER BY wr.sort_order;
    END
END

GO

-- ==========================================
-- P : [facility].[report_FacilityWoundOutcomeByDOS]
-- ==========================================
CREATE PROCEDURE [facility].[report_FacilityWoundOutcomeByDOS]
    @facilityId INT = NULL,
    @dosStart DATE,
    @dosEnd DATE
AS
BEGIN
    -- Validate parameters
    IF @dosStart IS NULL OR @dosEnd IS NULL
    BEGIN
        RAISERROR('Error: @dosStart and @dosEnd parameters are required', 16, 1);
        RETURN;
    END;

    IF @dosStart > @dosEnd
    BEGIN
        RAISERROR('Error: @dosStart must be less than or equal to @dosEnd', 16, 1);
        RETURN;
    END;

    -- Query from facility.wound_encounters
    WITH WoundSummary AS (
        SELECT
            id,
            patient_id,
            dos,
            etiology,
            CAST(surface AS FLOAT) as area,
            CAST(initial_surface AS FLOAT) as initial_area,
            progress,
            disposition,
            DATEDIFF(DAY, start_date, GETDATE()) as wound_days,
            CAST(healing_percentage AS NUMERIC(9,4)) as healing_pct,        
            CAST(healing_rate AS NUMERIC(9,2)) as healing_rate_val,
            push_score,
            -- healing_days for resolved wounds
            CASE 
                WHEN disposition = 'Resolved' AND start_date IS NOT NULL
                THEN DATEDIFF(DAY, start_date, dos)
                ELSE NULL
            END as healing_days,
            CASE
                WHEN disposition = 'Resolved' THEN 0
                ELSE 1
            END as is_active,
            CASE
                WHEN disposition = 'Resolved' THEN 1
                ELSE 0
            END as is_resolved        
        FROM facility.wound_encounters
        WHERE dos BETWEEN @dosStart AND @dosEnd
            AND (@facilityId IS NULL OR facility_id = @facilityId)
    )
    SELECT
        -- Total encounters in date range
        COUNT(1) as total_wound_encounters,

        -- Average wound reduction (as decimal, e.g. 0.96 for 96%)
        AVG(IIF(initial_area > 0,     
            ((initial_area - area) / initial_area),
            NULL)) as [Average Percentage Wound Area Reduction],

        -- Percent improving
        COUNT(IIF(progress = 'Improving', id, NULL)) * 1.00 / NULLIF(COUNT(1), 0)
            as [Percent of Wounds Improving],

        -- Percent deteriorating      
        COUNT(IIF(progress = 'Deteriorated', id, NULL)) * 1.00 / NULLIF(COUNT(1), 0)
            as [Percent of Wounds Deteriorating],

        -- Percent stable
        COUNT(IIF(progress = 'Stable', id, NULL)) * 1.00 / NULLIF(COUNT(1), 0)
            as [Percent of Wounds Stable],

        -- Percent new
        COUNT(IIF(progress = 'New', id, NULL)) * 1.00 / NULLIF(COUNT(1), 0) 
            as [Percent of New Wounds],

        -- Resolution rate
        COUNT(IIF(is_resolved = 1, id, NULL)) * 1.00 / NULLIF(COUNT(1), 0)  
            as [Resolution Rate],     

        -- Counts
        COUNT(IIF(progress = 'New', id, NULL)) as [Number of New Wounds],   
        COUNT(IIF(is_resolved = 1, id, NULL)) as [Number of Resolved Wounds],
        COUNT(IIF(is_active = 1, id, NULL)) as [Number of Active Wounds],   
        COUNT(IIF(wound_days > 100, id, NULL)) as [Number of Wounds With 100 or more Days],
        COUNT(DISTINCT IIF(is_active = 1, patient_id, NULL)) as [Number of Active Patients],

        -- Facility acuity index (wounds per active patient)
        COUNT(IIF(is_active = 1, id, NULL)) * 1.00 / NULLIF(COUNT(DISTINCT IIF(is_active = 1, patient_id, NULL)), 0)
            as [Facility Acuity Index],

        -- Average healing metrics    
        AVG(healing_pct) as [Average Healing Percentage],
        AVG(healing_rate_val) as [Average Healing Rate],

        -- Average PUSH Score
        AVG(CAST(push_score AS FLOAT)) as average_push_score,
        
        -- Acuity level based on wounds per patient
        CASE
            WHEN COUNT(DISTINCT IIF(is_active = 1, patient_id, NULL)) = 0 THEN 'Low'
            WHEN COUNT(IIF(is_active = 1, id, NULL)) * 1.00 / COUNT(DISTINCT IIF(is_active = 1, patient_id, NULL)) < 1.5 THEN 'Low'
            WHEN COUNT(IIF(is_active = 1, id, NULL)) * 1.00 / COUNT(DISTINCT IIF(is_active = 1, patient_id, NULL)) < 3 THEN 'Medium'
            ELSE 'High'
        END as acuity_level,

        -- ============================================
        -- AVERAGE HEALING DAYS FIELDS (NEW)
        -- ============================================
        
        -- Average Healing Days - All (only resolved wounds with valid healing_days)
        AVG(CASE WHEN is_resolved = 1 AND healing_days > 0 THEN CAST(healing_days AS FLOAT) ELSE NULL END) 
            as [Average Healing Days - All],
        
        -- Average Healing Days - Arterial
        AVG(CASE WHEN is_resolved = 1 AND healing_days > 0 AND etiology = 'Arterial' 
            THEN CAST(healing_days AS FLOAT) ELSE NULL END) 
            as [Average Healing Days - Arterial],
        
        -- Average Healing Days - Venous
        AVG(CASE WHEN is_resolved = 1 AND healing_days > 0 AND etiology = 'Venous' 
            THEN CAST(healing_days AS FLOAT) ELSE NULL END) 
            as [Average Healing Days - Venous],
        
        -- Average Healing Days - Diabetic
        AVG(CASE WHEN is_resolved = 1 AND healing_days > 0 AND etiology = 'Diabetic' 
            THEN CAST(healing_days AS FLOAT) ELSE NULL END) 
            as [Average Healing Days - Diabetic],
        
        -- Average Healing Days - Pressure Ulcer Stage I 
        -- Matches: Pressure (I), Pressure, Stage I, Pressure Ulcer Stage I
        AVG(CASE WHEN is_resolved = 1 AND healing_days > 0 
            AND (etiology LIKE '%Pressure%' AND (etiology LIKE '%(I)%' OR etiology LIKE '%Stage I%' OR etiology LIKE '%Stage 1%')
                 AND etiology NOT LIKE '%(II)%' AND etiology NOT LIKE '%(III)%' AND etiology NOT LIKE '%(IV)%'
                 AND etiology NOT LIKE '%Stage II%' AND etiology NOT LIKE '%Stage III%' AND etiology NOT LIKE '%Stage IV%')
            THEN CAST(healing_days AS FLOAT) ELSE NULL END) 
            as [Average Healing Days - Pressure Ulcer Stage I],
        
        -- Average Healing Days - Pressure Ulcer Stage II
        -- Matches: Pressure (II), Pressure, Stage II, Pressure Ulcer Stage II
        AVG(CASE WHEN is_resolved = 1 AND healing_days > 0 
            AND (etiology LIKE '%Pressure%' AND (etiology LIKE '%(II)%' OR etiology LIKE '%Stage II%' OR etiology LIKE '%Stage 2%')
                 AND etiology NOT LIKE '%(III)%' AND etiology NOT LIKE '%(IV)%'
                 AND etiology NOT LIKE '%Stage III%' AND etiology NOT LIKE '%Stage IV%')
            THEN CAST(healing_days AS FLOAT) ELSE NULL END) 
            as [Average Healing Days - Pressure Ulcer Stage II],
        
        -- Average Healing Days - Pressure Ulcer Stage III
        -- Matches: Pressure (III), Pressure, Stage III, Pressure Ulcer Stage III
        AVG(CASE WHEN is_resolved = 1 AND healing_days > 0 
            AND (etiology LIKE '%Pressure%' AND (etiology LIKE '%(III)%' OR etiology LIKE '%Stage III%' OR etiology LIKE '%Stage 3%')
                 AND etiology NOT LIKE '%(IV)%' AND etiology NOT LIKE '%Stage IV%')
            THEN CAST(healing_days AS FLOAT) ELSE NULL END) 
            as [Average Healing Days - Pressure Ulcer Stage III],
        
        -- Average Healing Days - Pressure Ulcer Stage IV
        -- Matches: Pressure (IV), Pressure, Stage IV, Pressure Ulcer Stage IV
        AVG(CASE WHEN is_resolved = 1 AND healing_days > 0 
            AND (etiology LIKE '%Pressure%' AND (etiology LIKE '%(IV)%' OR etiology LIKE '%Stage IV%' OR etiology LIKE '%Stage 4%'))
            THEN CAST(healing_days AS FLOAT) ELSE NULL END) 
            as [Average Healing Days - Pressure Ulcer Stage IV]

    FROM WoundSummary;
END;
GO

-- ==========================================
-- P : [facility].[report_WoundHealingStatus]
-- ==========================================
CREATE PROCEDURE [facility].[report_WoundHealingStatus]
    @facilityId INT,
    @dosStart DATE = NULL,
    @dosEnd DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    IF @facilityId IS NULL OR @facilityId <= 0
        RAISERROR('facilityId is required and must be greater than 0', 16, 1);

    -- Define all possible progress values
    WITH AllProgress AS (
        SELECT 'Improving' AS progress
        UNION ALL SELECT 'Stable'
        UNION ALL SELECT 'Deteriorated'
        UNION ALL SELECT 'New'
    ),
    ProgressCounts AS (
        SELECT
            CASE
                WHEN progress = 'Improving' THEN 'Improving'
                WHEN progress = 'Stable' THEN 'Stable'
                WHEN progress IN ('Deteriorated', 'Deteriorating') THEN 'Deteriorated'
                WHEN progress = 'New' THEN 'New'
                ELSE 'Unknown'
            END AS progress,
            COUNT(*) AS count
        FROM facility.wound_encounters
        WHERE facility_id = @facilityId
          AND (@dosStart IS NULL OR dos >= @dosStart)
          AND (@dosEnd IS NULL OR dos <= @dosEnd)
          AND disposition != 'Resolved'
        GROUP BY 
            CASE
                WHEN progress = 'Improving' THEN 'Improving'
                WHEN progress = 'Stable' THEN 'Stable'
                WHEN progress IN ('Deteriorated', 'Deteriorating') THEN 'Deteriorated'
                WHEN progress = 'New' THEN 'New'
                ELSE 'Unknown'
            END
    ),
    FinalCounts AS (
        SELECT
            a.progress AS status,
            ISNULL(p.count, 0) AS count
        FROM AllProgress a
        LEFT JOIN ProgressCounts p ON a.progress = p.progress
    ),
    TotalCount AS (
        SELECT SUM(count) AS total FROM FinalCounts
    )
    SELECT
        f.status,
        f.count,
        CAST(f.count * 100.0 / NULLIF(t.total, 0) AS DECIMAL(5,2)) AS percentage
    FROM FinalCounts f
    CROSS JOIN TotalCount t
    WHERE f.count > 0 OR f.status IN ('Improving', 'Stable', 'Deteriorated', 'New')
    ORDER BY 
        CASE f.status 
            WHEN 'Improving' THEN 1 
            WHEN 'Stable' THEN 2 
            WHEN 'Deteriorated' THEN 3 
            WHEN 'New' THEN 4 
            ELSE 5 
        END;
END;
GO

-- ==========================================
-- P : [facility].[report_WoundsByStatus]
-- ==========================================
CREATE PROCEDURE [facility].[report_WoundsByStatus]
    @facilityId INT,
    @dosStart DATE = NULL,
    @dosEnd DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    IF @facilityId IS NULL OR @facilityId <= 0
        RAISERROR('facilityId is required and must be greater than 0', 16, 1);

    -- Define all possible disposition values
    WITH AllDispositions AS (
        SELECT 'Active' AS disposition
        UNION ALL SELECT 'Resolved'
        UNION ALL SELECT 'Expired'
        UNION ALL SELECT 'Discharged'
        UNION ALL SELECT 'Hospitalized Wound Related'
        UNION ALL SELECT 'Hospitalized Not Wound Related'
        UNION ALL SELECT 'Rescheduled'
        UNION ALL SELECT 'Sign Off'
    ),
    DispositionCounts AS (
        SELECT
            CASE
                WHEN disposition = 'Active' THEN 'Active'
                WHEN disposition = 'Resolved' THEN 'Resolved'
                WHEN disposition = 'Expired' THEN 'Expired'
                WHEN disposition = 'Discharged' THEN 'Discharged'
                WHEN disposition LIKE '%Hospitalized%Wound%Related%' AND disposition NOT LIKE '%Not%' THEN 'Hospitalized Wound Related'
                WHEN disposition LIKE '%Hospitalized%Not%Wound%' THEN 'Hospitalized Not Wound Related'
                WHEN disposition = 'Rescheduled' THEN 'Rescheduled'
                WHEN disposition IN ('Sign Off', 'Sign off', 'Signoff') THEN 'Sign Off'
                ELSE 'Other'
            END AS status,
            COUNT(*) AS count
        FROM facility.wound_encounters
        WHERE facility_id = @facilityId
          AND (@dosStart IS NULL OR dos >= @dosStart)
          AND (@dosEnd IS NULL OR dos <= @dosEnd)
        GROUP BY 
            CASE
                WHEN disposition = 'Active' THEN 'Active'
                WHEN disposition = 'Resolved' THEN 'Resolved'
                WHEN disposition = 'Expired' THEN 'Expired'
                WHEN disposition = 'Discharged' THEN 'Discharged'
                WHEN disposition LIKE '%Hospitalized%Wound%Related%' AND disposition NOT LIKE '%Not%' THEN 'Hospitalized Wound Related'
                WHEN disposition LIKE '%Hospitalized%Not%Wound%' THEN 'Hospitalized Not Wound Related'
                WHEN disposition = 'Rescheduled' THEN 'Rescheduled'
                WHEN disposition IN ('Sign Off', 'Sign off', 'Signoff') THEN 'Sign Off'
                ELSE 'Other'
            END
    ),
    FinalCounts AS (
        SELECT
            a.disposition AS status,
            ISNULL(d.count, 0) AS count
        FROM AllDispositions a
        LEFT JOIN DispositionCounts d ON a.disposition = d.status
    )
    SELECT
        status,
        count
    FROM FinalCounts
    WHERE count > 0
    ORDER BY count DESC;
END;
GO

-- ==========================================
-- P : [facility].[sp_facility_import_excel_wounds]
-- ==========================================
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

-- ==========================================
-- P : [facility].[sp_GET_FacilityPatientDetail]
-- ==========================================

CREATE PROCEDURE facility.sp_GET_FacilityPatientDetail
    @facilityId INT,
    @patientId NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Get all detailed wound encounter data for a specific patient in a facility
    SELECT 
        we.id,
        we.dos,
        we.patient_id,
        we.facility_id,
        we.provider_id,
        we.patient_name,
        we.location,
        we.etiology,
        we.width,
        we.height,
        we.depth,
        we.surface,
        we.exudate,
        we.tissue,
        we.treatment,
        we.frequency,
        we.progress,
        we.disposition,
        we.debridement,
        we.initial_surface,
        we.start_date,
        we.days,
        we.healing_percentage,
        we.healing_rate,
        we.healing_days,
        we.push_score,
        we.POA,
        we.Palliative,
        we.Objective,
        we.facility_acquired
    FROM facility.wound_encounters we
    WHERE we.facility_id = @facilityId
    AND we.patient_id = @patientId
    ORDER BY we.dos DESC;
END

GO

-- ==========================================
-- P : [facility].[sp_get_import_logs]
-- ==========================================
CREATE PROCEDURE facility.sp_get_import_logs
    @facility_id INT = NULL,
    @source_type NVARCHAR(50) = NULL,
    @status NVARCHAR(50) = NULL,
    @from_date DATE = NULL,
    @to_date DATE = NULL,
    @limit INT = 100
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT TOP (@limit)
        id,
        import_id,
        import_date,
        imported_by,
        facility_id,
        source_type,
        original_filename,
        file_size_bytes,
        records_found,
        records_validated,
        records_inserted,
        records_failed,
        records_duplicated,
        ai_provider,
        ai_processing_time_ms,
        status,
        started_at,
        completed_at,
        processing_duration_ms,
        error_message
    FROM [facility].[wound_encounters_imports_logs]
    WHERE 
        (@facility_id IS NULL OR facility_id = @facility_id)
        AND (@source_type IS NULL OR source_type = @source_type)
        AND (@status IS NULL OR status = @status)
        AND (@from_date IS NULL OR CAST(import_date AS DATE) >= @from_date)
        AND (@to_date IS NULL OR CAST(import_date AS DATE) <= @to_date)
    ORDER BY import_date DESC;
END
GO

-- ==========================================
-- P : [facility].[sp_GetEnabledEncounterDates]
-- ==========================================
CREATE PROCEDURE [facility].[sp_GetEnabledEncounterDates]
    @facilityId INT,
    @patientId NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Validar parÃ¡metros
    IF @facilityId IS NULL OR @facilityId <= 0
    BEGIN
        RAISERROR('Invalid facilityId: must be a positive integer', 16, 1);
        RETURN;
    END

    -- Query principal: obtener fechas Ãºnicas de encuentros
    SELECT DISTINCT 
        CAST(dos AS DATE) as encounter_date
    FROM [facility].[wound_encounters]
    WHERE facility_id = @facilityId
        AND dos IS NOT NULL
        AND (@patientId IS NULL OR patient_id = @patientId)
    ORDER BY encounter_date ASC;
END
GO

-- ==========================================
-- P : [facility].[sp_log_wound_import]
-- ==========================================
CREATE PROCEDURE facility.sp_log_wound_import
    @source_type NVARCHAR(50),
    @original_filename NVARCHAR(500) = NULL,
    @file_size_bytes BIGINT = NULL,
    @imported_by NVARCHAR(255) = NULL,
    @facility_id INT = NULL,
    @records_found INT = 0,
    @records_validated INT = 0,
    @records_inserted INT = 0,
    @records_failed INT = 0,
    @records_duplicated INT = 0,
    @ai_provider NVARCHAR(100) = NULL,
    @ai_model NVARCHAR(100) = NULL,
    @ai_prompt_tokens INT = NULL,
    @ai_completion_tokens INT = NULL,
    @ai_processing_time_ms INT = NULL,
    @status NVARCHAR(50) = 'completed',
    @started_at DATETIME = NULL,
    @error_message NVARCHAR(MAX) = NULL,
    @error_details NVARCHAR(MAX) = NULL,
    @validation_errors NVARCHAR(MAX) = NULL,
    @raw_extracted_text NVARCHAR(MAX) = NULL,
    @ai_response NVARCHAR(MAX) = NULL,
    @parsed_records NVARCHAR(MAX) = NULL,
    @import_id UNIQUEIDENTIFIER OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @new_import_id UNIQUEIDENTIFIER = NEWID();
    DECLARE @completed_at DATETIME = GETDATE();
    DECLARE @processing_duration_ms INT = NULL;
    
    IF @started_at IS NOT NULL
    BEGIN
        SET @processing_duration_ms = DATEDIFF(MILLISECOND, @started_at, @completed_at);
    END
    
    INSERT INTO [facility].[wound_encounters_imports_logs] (
        import_id,
        source_type,
        original_filename,
        file_size_bytes,
        imported_by,
        facility_id,
        records_found,
        records_validated,
        records_inserted,
        records_failed,
        records_duplicated,
        ai_provider,
        ai_model,
        ai_prompt_tokens,
        ai_completion_tokens,
        ai_processing_time_ms,
        status,
        started_at,
        completed_at,
        processing_duration_ms,
        error_message,
        error_details,
        validation_errors,
        raw_extracted_text,
        ai_response,
        parsed_records
    ) VALUES (
        @new_import_id,
        @source_type,
        @original_filename,
        @file_size_bytes,
        @imported_by,
        @facility_id,
        @records_found,
        @records_validated,
        @records_inserted,
        @records_failed,
        @records_duplicated,
        @ai_provider,
        @ai_model,
        @ai_prompt_tokens,
        @ai_completion_tokens,
        @ai_processing_time_ms,
        @status,
        @started_at,
        @completed_at,
        @processing_duration_ms,
        @error_message,
        @error_details,
        @validation_errors,
        @raw_extracted_text,
        @ai_response,
        @parsed_records
    );
    
    SET @import_id = @new_import_id;
    
    SELECT 
        @new_import_id AS import_id,
        'Import logged successfully' AS message;
END
GO

-- ==========================================
-- P : [facility].[sp_LST_FacilitiesByWounds]
-- ==========================================

CREATE PROCEDURE [facility].[sp_LST_FacilitiesByWounds]
  @providerId INT = NULL,
  @includeZeroWounds BIT = 1
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    f.id as id,
    f.id as facility_id,
    f.name as name,
    f.name as facility_name,
    ISNULL(COUNT(we.id), 0) as total_wound_encounters,
    ISNULL(COUNT(DISTINCT we.patient_id), 0) as total_active_patients,
    ISNULL(COUNT(DISTINCT CASE WHEN we.dos = CAST(GETDATE() AS DATE) THEN we.patient_id END), 0) as patients_seen_today,
    ISNULL(COUNT(CASE WHEN we.disposition = 'Active' THEN 1 END), 0) as active_wounds,
    ISNULL(COUNT(CASE WHEN we.disposition = 'New' THEN 1 END), 0) as new_wounds,
    ISNULL(COUNT(CASE WHEN we.disposition = 'Resolved' THEN 1 END), 0) as resolved_wounds,
    ISNULL(COUNT(CASE WHEN we.disposition = 'Hospitalized' THEN 1 END), 0) as hospitalized_wounds,
    ISNULL(COUNT(CASE WHEN we.progress = 'Improving' THEN 1 END), 0) as improving_wounds,
    ISNULL(COUNT(CASE WHEN we.progress = 'Deteriorating' THEN 1 END), 0) as deteriorating_wounds,
    ISNULL(COUNT(CASE WHEN we.progress = 'Stable' THEN 1 END), 0) as stable_wounds,
    ISNULL(COUNT(CASE WHEN we.push_score > 12 THEN 1 END), 0) as critical_wounds,
    ISNULL(COUNT(CASE WHEN we.push_score BETWEEN 8 AND 12 THEN 1 END), 0) as alert_wounds,
    ISNULL(COUNT(CASE WHEN we.days > 100 THEN 1 END), 0) as chronic_wounds,
    ISNULL(CAST(AVG(CAST(we.push_score AS DECIMAL(5,2))) AS DECIMAL(5,2)), 0) as average_push_score,
    ISNULL(CAST(AVG(CAST(we.surface AS DECIMAL(10,2))) AS DECIMAL(10,2)), 0) as average_wound_area_cm2,
    ISNULL(CAST(AVG(CAST(we.days AS DECIMAL(10,2))) AS DECIMAL(10,2)), 0) as average_days_since_onset,
    ISNULL(CAST(COUNT(CASE WHEN we.progress = 'Improving' THEN 1 END) * 100.0 / NULLIF(COUNT(we.id), 0) AS DECIMAL(5,2)), 0) as percent_improving,
    ISNULL(CAST(COUNT(CASE WHEN we.disposition = 'Resolved' THEN 1 END) * 100.0 / NULLIF(COUNT(we.id), 0) AS DECIMAL(5,2)), 0) as percent_resolved,
    STUFF(
      (SELECT ', ' + CAST(COUNT(*) AS VARCHAR(10)) + ' ' + etiology
       FROM facility.wound_encounters we2
       WHERE we2.facility_id = f.id
       GROUP BY etiology
       ORDER BY COUNT(*) DESC
       FOR XML PATH('')),
      1, 2, ''
    ) as top_etiologies,
    CASE
      WHEN AVG(CAST(we.push_score AS DECIMAL(5,2))) >= 12 THEN 'Critical'
      WHEN AVG(CAST(we.push_score AS DECIMAL(5,2))) >= 8 THEN 'Warning'
      WHEN AVG(CAST(we.push_score AS DECIMAL(5,2))) >= 4 THEN 'Monitoring'
      ELSE 'Low Risk'
    END as acuity_level,
    MAX(we.provider_id) as provider_id,
    MAX(we.provider_id) as primary_provider_id,
    MAX(we.dos) as last_encounter_date,
    MIN(we.dos) as first_encounter_date,
    CAST(GETDATE() AS DATE) as report_date
  FROM dbo.Facilities f
  LEFT JOIN facility.wound_encounters we ON f.id = we.facility_id
    AND (@providerId IS NULL OR we.provider_id = @providerId)
  GROUP BY f.id, f.name
  HAVING @includeZeroWounds = 1 OR COUNT(we.id) > 0
  ORDER BY COUNT(we.id) DESC, f.id ASC;
END;

GO

-- ==========================================
-- P : [facility].[sp_LST_FacilityPatients]
-- ==========================================

    CREATE PROCEDURE facility.sp_LST_FacilityPatients
        @FacilityId INT
    AS
    BEGIN
        SET NOCOUNT ON;
        
        SELECT DISTINCT
            we.patient_id,
            we.patient_name,
            COUNT(DISTINCT we.id) as wound_encounter_count,
            COUNT(DISTINCT CASE WHEN we.disposition = 'Active' THEN we.id END) as active_wound_count,
            MIN(we.dos) as first_encounter_date,
            MAX(we.dos) as last_encounter_date,
            MAX(we.start_date) as last_start_date
        FROM facility.wound_encounters we
        WHERE we.facility_id = @FacilityId
        GROUP BY we.patient_id, we.patient_name
        ORDER BY we.patient_name
    END;
    
GO

-- ==========================================
-- P : [facility].[sp_UpdateWoundEncounter]
-- ==========================================

CREATE PROCEDURE [facility].[sp_UpdateWoundEncounter]
    @encounter_id NVARCHAR(100),
    @facility_id INT,
    @location NVARCHAR(200) = NULL,
    @etiology NVARCHAR(200) = NULL,
    @start_date DATE = NULL,
    @width DECIMAL(10,2) = NULL,
    @height DECIMAL(10,2) = NULL,
    @depth DECIMAL(10,2) = NULL,
    @exudate NVARCHAR(100) = NULL,
    @tissue NVARCHAR(100) = NULL,
    @treatment NVARCHAR(500) = NULL,
    @frequency NVARCHAR(100) = NULL,
    @progress NVARCHAR(100) = NULL,
    @disposition NVARCHAR(100) = NULL,
    @debridement NVARCHAR(200) = NULL,
    @push_score INT = NULL,
    @poa BIT = NULL,
    @palliative BIT = NULL,
    @objective NVARCHAR(500) = NULL,
    @facility_acquired BIT = NULL,
    @edited_by NVARCHAR(200),
    @device_id NVARCHAR(100) = NULL,
    @ip_address NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @patient_id NVARCHAR(100);
    DECLARE @old_location NVARCHAR(200);
    DECLARE @old_etiology NVARCHAR(200);
    DECLARE @old_start_date DATE;
    DECLARE @old_width DECIMAL(10,2);
    DECLARE @old_height DECIMAL(10,2);
    DECLARE @old_depth DECIMAL(10,2);
    DECLARE @old_exudate NVARCHAR(100);
    DECLARE @old_tissue NVARCHAR(100);
    DECLARE @old_treatment NVARCHAR(500);
    DECLARE @old_frequency NVARCHAR(100);
    DECLARE @old_progress NVARCHAR(100);
    DECLARE @old_disposition NVARCHAR(100);
    DECLARE @old_debridement NVARCHAR(200);
    DECLARE @old_surface DECIMAL(10,2);
    DECLARE @old_push_score INT;
    DECLARE @old_poa BIT;
    DECLARE @old_palliative BIT;
    DECLARE @old_objective NVARCHAR(500);
    DECLARE @old_facility_acquired BIT;

    -- Get current values
    SELECT
        @patient_id = patient_id,
        @old_location = location,
        @old_etiology = etiology,
        @old_start_date = start_date,
        @old_width = width,
        @old_height = height,
        @old_depth = depth,
        @old_exudate = exudate,
        @old_tissue = tissue,
        @old_treatment = treatment,
        @old_frequency = frequency,
        @old_progress = progress,
        @old_disposition = disposition,
        @old_debridement = debridement,
        @old_surface = surface,
        @old_push_score = push_score,
        @old_poa = POA,
        @old_palliative = Palliative,
        @old_objective = Objective,
        @old_facility_acquired = facility_acquired
    FROM [facility].[wound_encounters]
    WHERE id = @encounter_id AND facility_id = @facility_id;

    IF @patient_id IS NULL
    BEGIN
        SELECT 0 as success, 'Encounter not found' as message;
        RETURN;
    END

    -- Log changes for each field that was modified
    IF @location IS NOT NULL AND @location <> ISNULL(@old_location, '')
    BEGIN
        INSERT INTO [facility].[wound_encounter_edits]
        (encounter_id, facility_id, patient_id, field_name, old_value, new_value, edited_by, ip_address, device_id)
        VALUES (@encounter_id, @facility_id, @patient_id, 'location', @old_location, @location, @edited_by, @ip_address, @device_id);
    END

    IF @etiology IS NOT NULL AND @etiology <> ISNULL(@old_etiology, '')
    BEGIN
        INSERT INTO [facility].[wound_encounter_edits]
        (encounter_id, facility_id, patient_id, field_name, old_value, new_value, edited_by, ip_address, device_id)
        VALUES (@encounter_id, @facility_id, @patient_id, 'etiology', @old_etiology, @etiology, @edited_by, @ip_address, @device_id);
    END

    IF @start_date IS NOT NULL AND @start_date <> @old_start_date
    BEGIN
        INSERT INTO [facility].[wound_encounter_edits]
        (encounter_id, facility_id, patient_id, field_name, old_value, new_value, edited_by, ip_address, device_id)
        VALUES (@encounter_id, @facility_id, @patient_id, 'start_date', CAST(@old_start_date AS NVARCHAR), CAST(@start_date AS NVARCHAR), @edited_by, @ip_address, @device_id);
    END

    IF @width IS NOT NULL AND @width <> @old_width
    BEGIN
        INSERT INTO [facility].[wound_encounter_edits]
        (encounter_id, facility_id, patient_id, field_name, old_value, new_value, edited_by, ip_address, device_id)
        VALUES (@encounter_id, @facility_id, @patient_id, 'width', CAST(@old_width AS NVARCHAR), CAST(@width AS NVARCHAR), @edited_by, @ip_address, @device_id);
    END

    IF @height IS NOT NULL AND @height <> @old_height
    BEGIN
        INSERT INTO [facility].[wound_encounter_edits]
        (encounter_id, facility_id, patient_id, field_name, old_value, new_value, edited_by, ip_address, device_id)
        VALUES (@encounter_id, @facility_id, @patient_id, 'height', CAST(@old_height AS NVARCHAR), CAST(@height AS NVARCHAR), @edited_by, @ip_address, @device_id);
    END

    IF @depth IS NOT NULL AND @depth <> @old_depth
    BEGIN
        INSERT INTO [facility].[wound_encounter_edits]
        (encounter_id, facility_id, patient_id, field_name, old_value, new_value, edited_by, ip_address, device_id)
        VALUES (@encounter_id, @facility_id, @patient_id, 'depth', CAST(@old_depth AS NVARCHAR), CAST(@depth AS NVARCHAR), @edited_by, @ip_address, @device_id);
    END

    IF @exudate IS NOT NULL AND @exudate <> ISNULL(@old_exudate, '')
    BEGIN
        INSERT INTO [facility].[wound_encounter_edits]
        (encounter_id, facility_id, patient_id, field_name, old_value, new_value, edited_by, ip_address, device_id)
        VALUES (@encounter_id, @facility_id, @patient_id, 'exudate', @old_exudate, @exudate, @edited_by, @ip_address, @device_id);
    END

    IF @tissue IS NOT NULL AND @tissue <> ISNULL(@old_tissue, '')
    BEGIN
        INSERT INTO [facility].[wound_encounter_edits]
        (encounter_id, facility_id, patient_id, field_name, old_value, new_value, edited_by, ip_address, device_id)
        VALUES (@encounter_id, @facility_id, @patient_id, 'tissue', @old_tissue, @tissue, @edited_by, @ip_address, @device_id);
    END

    IF @treatment IS NOT NULL AND @treatment <> ISNULL(@old_treatment, '')
    BEGIN
        INSERT INTO [facility].[wound_encounter_edits]
        (encounter_id, facility_id, patient_id, field_name, old_value, new_value, edited_by, ip_address, device_id)
        VALUES (@encounter_id, @facility_id, @patient_id, 'treatment', @old_treatment, @treatment, @edited_by, @ip_address, @device_id);
    END

    IF @frequency IS NOT NULL AND @frequency <> ISNULL(@old_frequency, '')
    BEGIN
        INSERT INTO [facility].[wound_encounter_edits]
        (encounter_id, facility_id, patient_id, field_name, old_value, new_value, edited_by, ip_address, device_id)
        VALUES (@encounter_id, @facility_id, @patient_id, 'frequency', @old_frequency, @frequency, @edited_by, @ip_address, @device_id);
    END

    IF @progress IS NOT NULL AND @progress <> ISNULL(@old_progress, '')
    BEGIN
        INSERT INTO [facility].[wound_encounter_edits]
        (encounter_id, facility_id, patient_id, field_name, old_value, new_value, edited_by, ip_address, device_id)
        VALUES (@encounter_id, @facility_id, @patient_id, 'progress', @old_progress, @progress, @edited_by, @ip_address, @device_id);
    END

    IF @disposition IS NOT NULL AND @disposition <> ISNULL(@old_disposition, '')
    BEGIN
        INSERT INTO [facility].[wound_encounter_edits]
        (encounter_id, facility_id, patient_id, field_name, old_value, new_value, edited_by, ip_address, device_id)
        VALUES (@encounter_id, @facility_id, @patient_id, 'disposition', @old_disposition, @disposition, @edited_by, @ip_address, @device_id);
    END

    IF @debridement IS NOT NULL AND @debridement <> ISNULL(@old_debridement, '')
    BEGIN
        INSERT INTO [facility].[wound_encounter_edits]
        (encounter_id, facility_id, patient_id, field_name, old_value, new_value, edited_by, ip_address, device_id)
        VALUES (@encounter_id, @facility_id, @patient_id, 'debridement', @old_debridement, @debridement, @edited_by, @ip_address, @device_id);
    END

    IF @poa IS NOT NULL AND @poa <> ISNULL(@old_poa, 0)
    BEGIN
        INSERT INTO [facility].[wound_encounter_edits]
        (encounter_id, facility_id, patient_id, field_name, old_value, new_value, edited_by, ip_address, device_id)
        VALUES (@encounter_id, @facility_id, @patient_id, 'POA', CAST(@old_poa AS NVARCHAR), CAST(@poa AS NVARCHAR), @edited_by, @ip_address, @device_id);
    END

    IF @palliative IS NOT NULL AND @palliative <> ISNULL(@old_palliative, 0)
    BEGIN
        INSERT INTO [facility].[wound_encounter_edits]
        (encounter_id, facility_id, patient_id, field_name, old_value, new_value, edited_by, ip_address, device_id)
        VALUES (@encounter_id, @facility_id, @patient_id, 'Palliative', CAST(@old_palliative AS NVARCHAR), CAST(@palliative AS NVARCHAR), @edited_by, @ip_address, @device_id);
    END

    IF @objective IS NOT NULL AND @objective <> ISNULL(@old_objective, '')
    BEGIN
        INSERT INTO [facility].[wound_encounter_edits]
        (encounter_id, facility_id, patient_id, field_name, old_value, new_value, edited_by, ip_address, device_id)
        VALUES (@encounter_id, @facility_id, @patient_id, 'Objective', @old_objective, @objective, @edited_by, @ip_address, @device_id);
    END

    IF @facility_acquired IS NOT NULL AND @facility_acquired <> ISNULL(@old_facility_acquired, 0)
    BEGIN
        INSERT INTO [facility].[wound_encounter_edits]
        (encounter_id, facility_id, patient_id, field_name, old_value, new_value, edited_by, ip_address, device_id)
        VALUES (@encounter_id, @facility_id, @patient_id, 'facility_acquired', CAST(@old_facility_acquired AS NVARCHAR), CAST(@facility_acquired AS NVARCHAR), @edited_by, @ip_address, @device_id);
    END

    -- Calculate new surface area
    DECLARE @new_surface DECIMAL(10,2);
    DECLARE @final_width DECIMAL(10,2) = ISNULL(@width, @old_width);
    DECLARE @final_height DECIMAL(10,2) = ISNULL(@height, @old_height);
    DECLARE @final_exudate NVARCHAR(100) = ISNULL(@exudate, @old_exudate);
    DECLARE @final_tissue NVARCHAR(100) = ISNULL(@tissue, @old_tissue);
    SET @new_surface = @final_width * @final_height;

    -- Log surface change if dimensions changed
    IF @new_surface <> @old_surface
    BEGIN
        INSERT INTO [facility].[wound_encounter_edits]
        (encounter_id, facility_id, patient_id, field_name, old_value, new_value, edited_by, ip_address, device_id)
        VALUES (@encounter_id, @facility_id, @patient_id, 'surface', CAST(@old_surface AS NVARCHAR), CAST(@new_surface AS NVARCHAR), @edited_by, @ip_address, @device_id);
    END

    -- =====================================================
    -- AUTO-CALCULATE PUSH SCORE
    -- PUSH = Size Score (0-10) + Exudate Score (0-3) + Tissue Score (0-4) = Max 17
    -- =====================================================
    DECLARE @calculated_push_score INT = 0;
    DECLARE @size_score INT = 0;
    DECLARE @exudate_score INT = 0;
    DECLARE @tissue_score INT = 0;

    -- Size Score (based on surface area in cmÂ²)
    IF @new_surface = 0 SET @size_score = 0
    ELSE IF @new_surface < 0.3 SET @size_score = 1
    ELSE IF @new_surface < 0.7 SET @size_score = 2
    ELSE IF @new_surface < 1.0 SET @size_score = 3
    ELSE IF @new_surface < 2.0 SET @size_score = 4
    ELSE IF @new_surface < 3.0 SET @size_score = 5
    ELSE IF @new_surface < 4.0 SET @size_score = 6
    ELSE IF @new_surface < 8.0 SET @size_score = 7
    ELSE IF @new_surface < 12.0 SET @size_score = 8
    ELSE IF @new_surface < 24.0 SET @size_score = 9
    ELSE SET @size_score = 10;

    -- Exudate Score (0-3)
    DECLARE @exudate_lower NVARCHAR(100) = LOWER(ISNULL(@final_exudate, 'none'));
    IF @exudate_lower LIKE '%none%' SET @exudate_score = 0
    ELSE IF @exudate_lower LIKE '%light%' OR @exudate_lower LIKE '%minimal%' SET @exudate_score = 1
    ELSE IF @exudate_lower LIKE '%moderate%' SET @exudate_score = 2
    ELSE SET @exudate_score = 3;

    -- Tissue Type Score (0-4)
    DECLARE @tissue_lower NVARCHAR(100) = LOWER(ISNULL(@final_tissue, 'granulation'));
    IF @tissue_lower LIKE '%closed%' OR @tissue_lower LIKE '%epithelial%' SET @tissue_score = 0
    ELSE IF @tissue_lower LIKE '%granulation%' SET @tissue_score = 1
    ELSE IF @tissue_lower LIKE '%slough%' SET @tissue_score = 2
    ELSE IF @tissue_lower LIKE '%eschar%' OR @tissue_lower LIKE '%necrotic%' SET @tissue_score = 4
    ELSE SET @tissue_score = 1;

    -- Calculate total PUSH score (max 17)
    SET @calculated_push_score = @size_score + @exudate_score + @tissue_score;
    IF @calculated_push_score > 17 SET @calculated_push_score = 17;

    -- Log PUSH score change if it changed
    IF @calculated_push_score <> ISNULL(@old_push_score, -1)
    BEGIN
        INSERT INTO [facility].[wound_encounter_edits]
        (encounter_id, facility_id, patient_id, field_name, old_value, new_value, edited_by, ip_address, device_id)
        VALUES (@encounter_id, @facility_id, @patient_id, 'push_score', CAST(@old_push_score AS NVARCHAR), CAST(@calculated_push_score AS NVARCHAR), @edited_by, @ip_address, @device_id);
    END

    -- Update the wound_encounters table
    UPDATE [facility].[wound_encounters]
    SET
        location = ISNULL(@location, location),
        etiology = ISNULL(@etiology, etiology),
        start_date = ISNULL(@start_date, start_date),
        width = ISNULL(@width, width),
        height = ISNULL(@height, height),
        depth = ISNULL(@depth, depth),
        surface = @new_surface,
        exudate = ISNULL(@exudate, exudate),
        tissue = ISNULL(@tissue, tissue),
        treatment = ISNULL(@treatment, treatment),
        frequency = ISNULL(@frequency, frequency),
        progress = ISNULL(@progress, progress),
        disposition = ISNULL(@disposition, disposition),
        debridement = ISNULL(@debridement, debridement),
        push_score = @calculated_push_score,
        POA = ISNULL(@poa, POA),
        Palliative = ISNULL(@palliative, Palliative),
        Objective = ISNULL(@objective, Objective),
        facility_acquired = ISNULL(@facility_acquired, facility_acquired)
    WHERE id = @encounter_id AND facility_id = @facility_id;

    -- If start_date was changed, update ALL encounters of the same wound
    -- (same patient_id, facility_id, location, etiology)
    IF @start_date IS NOT NULL AND @start_date <> @old_start_date
    BEGIN
        UPDATE [facility].[wound_encounters]
        SET start_date = @start_date
        WHERE facility_id = @facility_id
          AND patient_id = @patient_id
          AND location = @old_location
          AND etiology = @old_etiology
          AND id <> @encounter_id; -- Exclude the one we already updated
    END

    -- Return success
    SELECT 1 as success, 'Encounter updated successfully' as message;
END

GO

-- ==========================================
-- P : [facility].[wound_reduction_median]
-- ==========================================
CREATE procedure [facility].[wound_reduction_median]
@dos date,
@facilityId int
as
with base as (
    select [dos],patient_id,etiology,surface [week 0]
        ,lag(surface) over(partition by patient_id,etiology,[location] order by dos) [week 1]
        ,lag(surface,2) over(partition by patient_id,etiology,[location] order by dos) [week 2]
        ,lag(surface,3) over(partition by patient_id,etiology,[location] order by dos) [week 3]
        ,lag(surface,4) over(partition by patient_id,etiology,[location] order by dos) [week 4]
    from facility.wound_encounters
    where [Objective]<>'Palliative' and facility_id=@facilityId
)
select distinct [etiology],
    cast(PERCENTILE_CONT(0.5) within group (order by [week 0]) over(partition by [etiology]) as numeric(5,2)) as [Current Week],
    cast(PERCENTILE_CONT(0.5) within group (order by [week 1]) over(partition by [etiology]) as numeric(5,2)) as [One Week Ago],
    cast(PERCENTILE_CONT(0.5) within group (order by [week 2]) over(partition by [etiology]) as numeric(5,2)) as [Two Weeks Ago],
    cast(PERCENTILE_CONT(0.5) within group (order by [week 3]) over(partition by [etiology]) as numeric(5,2)) as [Three Weeks Ago],
    cast(PERCENTILE_CONT(0.5) within group (order by [week 4]) over(partition by [etiology]) as numeric(5,2)) as [Four Weeks Ago]
from base
where DATEDIFF(week,dos,@dos)<=4

GO

-- ==========================================
-- P : [facility].[woundcare_round_summary]
-- ==========================================

CREATE procedure [facility].[woundcare_round_summary]
@dos date,
@facilityId int
as
select patient_name [Patient Name]
    ,[location] [Location]
    ,etiology [Etiology]
    ,cast(width as varchar(8))+'x'+cast(height as varchar(8))+'x'+cast(depth as varchar(8)) [Size (cm)]
    ,exudate [Exudate]
    ,tissue [Tissue]
    ,treatment [Tx Plan]
    ,frequency [Frequency]
    ,progress [Progress]
    ,disposition [Disposition]
    ,format(start_date,'d','en-US') [Wound Start Date]
    ,[days] [Duration (days)]
    ,iif(facility_acquired=1,'YES','NO') [Facility Acquired]
    ,patient_id [patient_id]
    ,id [dosid]
    ,width [width]
    ,height [height]
    ,depth [depth]
    ,debridement [debridement]
    ,push_score [push_score]
    ,iif(poa=1,1,0) [POA]
    ,iif(palliative=1,1,0) [Palliative]
    ,format(start_date,'yyyy-MM-dd') [start_date]
    ,format([dos],'yyyy-MM-dd') [dos]
from facility.wound_encounters
where [dos]=@dos and facility_id=@facilityId

GO


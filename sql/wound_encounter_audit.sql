-- =============================================
-- Script: Wound Encounter Edit Audit Table and Update SP
-- Date: 2026-02-16
-- Description: Creates audit table for wound encounter edits
--              and stored procedure to update wound_encounters
-- =============================================

-- Create audit table in facility schema
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[facility].[wound_encounter_edits]') AND type in (N'U'))
BEGIN
    CREATE TABLE [facility].[wound_encounter_edits] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [encounter_id] NVARCHAR(100) NOT NULL,
        [facility_id] INT NOT NULL,
        [patient_id] NVARCHAR(100) NOT NULL,
        [field_name] NVARCHAR(100) NOT NULL,
        [old_value] NVARCHAR(MAX) NULL,
        [new_value] NVARCHAR(MAX) NULL,
        [edited_by] NVARCHAR(200) NOT NULL,
        [edited_at] DATETIME2 DEFAULT GETDATE(),
        [ip_address] NVARCHAR(50) NULL,
        [device_id] NVARCHAR(100) NULL
    );

    CREATE INDEX IX_wound_encounter_edits_encounter_id ON [facility].[wound_encounter_edits] ([encounter_id]);
    CREATE INDEX IX_wound_encounter_edits_edited_at ON [facility].[wound_encounter_edits] ([edited_at]);
    CREATE INDEX IX_wound_encounter_edits_facility_id ON [facility].[wound_encounter_edits] ([facility_id]);
END;
GO

-- =============================================
-- Stored Procedure: sp_UpdateWoundEncounter
-- Description: Updates a wound encounter and logs the changes
-- =============================================
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[facility].[sp_UpdateWoundEncounter]') AND type in (N'P', N'PC'))
    DROP PROCEDURE [facility].[sp_UpdateWoundEncounter];
GO

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
    DECLARE @old_push_score INT;
    DECLARE @old_poa BIT;
    DECLARE @old_palliative BIT;
    DECLARE @old_objective NVARCHAR(500);
    DECLARE @old_facility_acquired BIT;
    DECLARE @old_surface DECIMAL(10,2);
    
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
        @old_push_score = push_score,
        @old_poa = POA,
        @old_palliative = Palliative,
        @old_objective = objective,
        @old_facility_acquired = facility_acquired,
        @old_surface = surface
    FROM [facility].[wound_encounters]
    WHERE id = @encounter_id AND facility_id = @facility_id;
    
    IF @patient_id IS NULL
    BEGIN
        SELECT 0 AS success, 'Encounter not found' AS message;
        RETURN;
    END
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Log changes for each field that was modified
        IF @location IS NOT NULL AND ISNULL(@location, '') != ISNULL(@old_location, '')
        BEGIN
            INSERT INTO [facility].[wound_encounter_edits] 
                (encounter_id, facility_id, patient_id, field_name, old_value, new_value, edited_by, device_id, ip_address)
            VALUES 
                (@encounter_id, @facility_id, @patient_id, 'location', @old_location, @location, @edited_by, @device_id, @ip_address);
        END
        
        IF @etiology IS NOT NULL AND ISNULL(@etiology, '') != ISNULL(@old_etiology, '')
        BEGIN
            INSERT INTO [facility].[wound_encounter_edits] 
                (encounter_id, facility_id, patient_id, field_name, old_value, new_value, edited_by, device_id, ip_address)
            VALUES 
                (@encounter_id, @facility_id, @patient_id, 'etiology', @old_etiology, @etiology, @edited_by, @device_id, @ip_address);
        END
        
        IF @start_date IS NOT NULL AND @start_date != @old_start_date
        BEGIN
            INSERT INTO [facility].[wound_encounter_edits] 
                (encounter_id, facility_id, patient_id, field_name, old_value, new_value, edited_by, device_id, ip_address)
            VALUES 
                (@encounter_id, @facility_id, @patient_id, 'start_date', CONVERT(VARCHAR(10), @old_start_date, 120), CONVERT(VARCHAR(10), @start_date, 120), @edited_by, @device_id, @ip_address);
        END
        
        IF @width IS NOT NULL AND @width != @old_width
        BEGIN
            INSERT INTO [facility].[wound_encounter_edits] 
                (encounter_id, facility_id, patient_id, field_name, old_value, new_value, edited_by, device_id, ip_address)
            VALUES 
                (@encounter_id, @facility_id, @patient_id, 'width', CAST(@old_width AS NVARCHAR(MAX)), CAST(@width AS NVARCHAR(MAX)), @edited_by, @device_id, @ip_address);
        END
        
        IF @height IS NOT NULL AND @height != @old_height
        BEGIN
            INSERT INTO [facility].[wound_encounter_edits] 
                (encounter_id, facility_id, patient_id, field_name, old_value, new_value, edited_by, device_id, ip_address)
            VALUES 
                (@encounter_id, @facility_id, @patient_id, 'height', CAST(@old_height AS NVARCHAR(MAX)), CAST(@height AS NVARCHAR(MAX)), @edited_by, @device_id, @ip_address);
        END
        
        IF @depth IS NOT NULL AND @depth != @old_depth
        BEGIN
            INSERT INTO [facility].[wound_encounter_edits] 
                (encounter_id, facility_id, patient_id, field_name, old_value, new_value, edited_by, device_id, ip_address)
            VALUES 
                (@encounter_id, @facility_id, @patient_id, 'depth', CAST(@old_depth AS NVARCHAR(MAX)), CAST(@depth AS NVARCHAR(MAX)), @edited_by, @device_id, @ip_address);
        END
        
        IF @exudate IS NOT NULL AND ISNULL(@exudate, '') != ISNULL(@old_exudate, '')
        BEGIN
            INSERT INTO [facility].[wound_encounter_edits] 
                (encounter_id, facility_id, patient_id, field_name, old_value, new_value, edited_by, device_id, ip_address)
            VALUES 
                (@encounter_id, @facility_id, @patient_id, 'exudate', @old_exudate, @exudate, @edited_by, @device_id, @ip_address);
        END
        
        IF @tissue IS NOT NULL AND ISNULL(@tissue, '') != ISNULL(@old_tissue, '')
        BEGIN
            INSERT INTO [facility].[wound_encounter_edits] 
                (encounter_id, facility_id, patient_id, field_name, old_value, new_value, edited_by, device_id, ip_address)
            VALUES 
                (@encounter_id, @facility_id, @patient_id, 'tissue', @old_tissue, @tissue, @edited_by, @device_id, @ip_address);
        END
        
        IF @treatment IS NOT NULL AND ISNULL(@treatment, '') != ISNULL(@old_treatment, '')
        BEGIN
            INSERT INTO [facility].[wound_encounter_edits] 
                (encounter_id, facility_id, patient_id, field_name, old_value, new_value, edited_by, device_id, ip_address)
            VALUES 
                (@encounter_id, @facility_id, @patient_id, 'treatment', @old_treatment, @treatment, @edited_by, @device_id, @ip_address);
        END
        
        IF @frequency IS NOT NULL AND ISNULL(@frequency, '') != ISNULL(@old_frequency, '')
        BEGIN
            INSERT INTO [facility].[wound_encounter_edits] 
                (encounter_id, facility_id, patient_id, field_name, old_value, new_value, edited_by, device_id, ip_address)
            VALUES 
                (@encounter_id, @facility_id, @patient_id, 'frequency', @old_frequency, @frequency, @edited_by, @device_id, @ip_address);
        END
        
        IF @progress IS NOT NULL AND ISNULL(@progress, '') != ISNULL(@old_progress, '')
        BEGIN
            INSERT INTO [facility].[wound_encounter_edits] 
                (encounter_id, facility_id, patient_id, field_name, old_value, new_value, edited_by, device_id, ip_address)
            VALUES 
                (@encounter_id, @facility_id, @patient_id, 'progress', @old_progress, @progress, @edited_by, @device_id, @ip_address);
        END
        
        IF @disposition IS NOT NULL AND ISNULL(@disposition, '') != ISNULL(@old_disposition, '')
        BEGIN
            INSERT INTO [facility].[wound_encounter_edits] 
                (encounter_id, facility_id, patient_id, field_name, old_value, new_value, edited_by, device_id, ip_address)
            VALUES 
                (@encounter_id, @facility_id, @patient_id, 'disposition', @old_disposition, @disposition, @edited_by, @device_id, @ip_address);
        END
        
        IF @debridement IS NOT NULL AND ISNULL(@debridement, '') != ISNULL(@old_debridement, '')
        BEGIN
            INSERT INTO [facility].[wound_encounter_edits] 
                (encounter_id, facility_id, patient_id, field_name, old_value, new_value, edited_by, device_id, ip_address)
            VALUES 
                (@encounter_id, @facility_id, @patient_id, 'debridement', @old_debridement, @debridement, @edited_by, @device_id, @ip_address);
        END
        
        IF @push_score IS NOT NULL AND @push_score != @old_push_score
        BEGIN
            INSERT INTO [facility].[wound_encounter_edits] 
                (encounter_id, facility_id, patient_id, field_name, old_value, new_value, edited_by, device_id, ip_address)
            VALUES 
                (@encounter_id, @facility_id, @patient_id, 'push_score', CAST(@old_push_score AS NVARCHAR(MAX)), CAST(@push_score AS NVARCHAR(MAX)), @edited_by, @device_id, @ip_address);
        END
        
        IF @poa IS NOT NULL AND @poa != @old_poa
        BEGIN
            INSERT INTO [facility].[wound_encounter_edits] 
                (encounter_id, facility_id, patient_id, field_name, old_value, new_value, edited_by, device_id, ip_address)
            VALUES 
                (@encounter_id, @facility_id, @patient_id, 'POA', CAST(@old_poa AS NVARCHAR(MAX)), CAST(@poa AS NVARCHAR(MAX)), @edited_by, @device_id, @ip_address);
        END
        
        IF @palliative IS NOT NULL AND @palliative != @old_palliative
        BEGIN
            INSERT INTO [facility].[wound_encounter_edits] 
                (encounter_id, facility_id, patient_id, field_name, old_value, new_value, edited_by, device_id, ip_address)
            VALUES 
                (@encounter_id, @facility_id, @patient_id, 'Palliative', CAST(@old_palliative AS NVARCHAR(MAX)), CAST(@palliative AS NVARCHAR(MAX)), @edited_by, @device_id, @ip_address);
        END
        
        IF @objective IS NOT NULL AND ISNULL(@objective, '') != ISNULL(@old_objective, '')
        BEGIN
            INSERT INTO [facility].[wound_encounter_edits] 
                (encounter_id, facility_id, patient_id, field_name, old_value, new_value, edited_by, device_id, ip_address)
            VALUES 
                (@encounter_id, @facility_id, @patient_id, 'objective', @old_objective, @objective, @edited_by, @device_id, @ip_address);
        END
        
        IF @facility_acquired IS NOT NULL AND @facility_acquired != @old_facility_acquired
        BEGIN
            INSERT INTO [facility].[wound_encounter_edits] 
                (encounter_id, facility_id, patient_id, field_name, old_value, new_value, edited_by, device_id, ip_address)
            VALUES 
                (@encounter_id, @facility_id, @patient_id, 'facility_acquired', CAST(@old_facility_acquired AS NVARCHAR(MAX)), CAST(@facility_acquired AS NVARCHAR(MAX)), @edited_by, @device_id, @ip_address);
        END
        
        -- Calculate new surface if dimensions changed
        DECLARE @new_surface DECIMAL(10,2);
        SET @new_surface = ISNULL(@width, @old_width) * ISNULL(@height, @old_height);
        
        IF @new_surface != @old_surface
        BEGIN
            INSERT INTO [facility].[wound_encounter_edits] 
                (encounter_id, facility_id, patient_id, field_name, old_value, new_value, edited_by, device_id, ip_address)
            VALUES 
                (@encounter_id, @facility_id, @patient_id, 'surface', CAST(@old_surface AS NVARCHAR(MAX)), CAST(@new_surface AS NVARCHAR(MAX)), @edited_by, @device_id, @ip_address);
        END
        
        -- Update the encounter
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
            push_score = ISNULL(@push_score, push_score),
            POA = ISNULL(@poa, POA),
            Palliative = ISNULL(@palliative, Palliative),
            objective = ISNULL(@objective, objective),
            facility_acquired = ISNULL(@facility_acquired, facility_acquired)
        WHERE id = @encounter_id AND facility_id = @facility_id;
        
        COMMIT TRANSACTION;
        
        SELECT 1 AS success, 'Encounter updated successfully' AS message;
        
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
            
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        SELECT 0 AS success, @ErrorMessage AS message;
    END CATCH
END;
GO

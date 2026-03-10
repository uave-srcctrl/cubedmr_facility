/**
 * Import route handlers — Excel import, PDF import, import audit, enabled dates
 */
import type { Express, Request, Response } from 'express';
import multer from 'multer';
import FormData from 'form-data';
import mssql from 'mssql';
import { fetchWithTimeout, getAuthHeaders, extractFacilityId } from '../helpers';

// Multer configuration for PDF uploads
const uploadPdf = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (_req: any, file: any, cb: any) => {
        if (file.mimetype === 'application/pdf') cb(null, true);
        else cb(new Error('Only PDF files are allowed'));
    },
});

// ─── Validation / Sanitization helpers ─────────────────────────────────────

function validateImportData(data: any[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const requiredFields = ['patient_id', 'facility_id', 'location', 'etiology', 'surface', 'push_score', 'progress', 'disposition', 'dos'];
    const validProgress = ['Improving', 'Deteriorating', 'Stable'];
    const validDisposition = ['Active', 'Resolved', 'New', 'Hospitalized'];
    const validExudate = ['None', 'Minimal', 'Moderate', 'Heavy', 'Copious'];
    const validDebridement = ['None', 'Autolytic', 'Enzymatic', 'Mechanical', 'Surgical'];

    data.forEach((row, index) => {
        const missingFields = requiredFields.filter(field => !row[field] && row[field] !== 0);
        if (missingFields.length > 0) { errors.push(`Row ${index + 1}: Missing required fields: ${missingFields.join(', ')}`); return; }

        const surface = parseFloat(row.surface);
        const pushScore = parseInt(row.push_score);
        const facilityId = parseInt(row.facility_id);

        if (isNaN(surface) || surface < 0) { errors.push(`Row ${index + 1}: Invalid surface area: ${row.surface}`); return; }
        if (isNaN(pushScore) || pushScore < 0 || pushScore > 17) { errors.push(`Row ${index + 1}: Invalid PUSH score: ${row.push_score} (must be 0-17)`); return; }
        if (isNaN(facilityId)) { errors.push(`Row ${index + 1}: Invalid facility ID: ${row.facility_id}`); return; }
        if (row.progress && !validProgress.includes(row.progress)) { errors.push(`Row ${index + 1}: Invalid progress value: ${row.progress}`); return; }
        if (row.disposition && !validDisposition.includes(row.disposition)) { errors.push(`Row ${index + 1}: Invalid disposition value: ${row.disposition}`); return; }
        if (row.exudate && !validExudate.includes(row.exudate)) { errors.push(`Row ${index + 1}: Invalid exudate value: ${row.exudate}`); return; }
        if (row.debridement && !validDebridement.includes(row.debridement)) { errors.push(`Row ${index + 1}: Invalid debridement value: ${row.debridement}`); return; }
        const dos = new Date(row.dos);
        if (isNaN(dos.getTime())) { errors.push(`Row ${index + 1}: Invalid date format: ${row.dos}`); return; }
    });

    return { isValid: errors.length === 0, errors: errors.slice(0, 10) };
}

function sanitizeInput(str: string): string {
    if (!str) return '';
    return str.toString().replace(/[<>"'&]/g, match => {
        const map: Record<string, string> = { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;' };
        return map[match] || match;
    });
}

export function registerImportRoutes(app: Express, BACKEND_API_URL: string, REMOTE_BACKEND_BASE: string) {
    const PHP_LOCAL_BASE = process.env.PHP_LOCAL_BASE || "https://cubed-mr.app/api";

    // ─── Excel Import ─────────────────────────────────────────────────────────
    app.post("/api/import-excel", async (req: Request, res: Response) => {
        try {
            const authHeaders = getAuthHeaders(req);
            if (!authHeaders.Authorization) return res.status(401).json({ status: false, error: "Unauthorized - No authentication token provided" });

            const { data, filename } = req.body;
            if (!data || !Array.isArray(data)) return res.status(400).json({ status: false, error: "Invalid data format. Expected array of objects." });

            console.log(`[/api/import-excel] Processing ${data.length} rows from ${filename}`);

            const validationResult = validateImportData(data);
            if (!validationResult.isValid) return res.status(400).json({ status: false, message: "Validation failed", errors: validationResult.errors, totalProcessed: data.length });

            const sanitizedData = data.map(row => ({
                ...row,
                patient_id: sanitizeInput(row.patient_id),
                location: sanitizeInput(row.location),
                etiology: sanitizeInput(row.etiology),
                patient_name: sanitizeInput(row.patient_name || ''),
                provider_id: row.provider_id ? parseInt(row.provider_id) : null,
                facility_id: parseInt(row.facility_id),
                surface: parseFloat(row.surface),
                push_score: parseInt(row.push_score),
                width: row.width ? parseFloat(row.width) : null,
                height: row.height ? parseFloat(row.height) : null,
                depth: row.depth ? parseFloat(row.depth) : null,
                progress: row.progress,
                disposition: row.disposition,
                dos: new Date(row.dos).toISOString().split('T')[0],
            }));

            const externalResponse = await fetchWithTimeout(`${REMOTE_BACKEND_BASE}/api/import-excel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify({ data: sanitizedData, filename, source: 'wounddatacenter-local' }),
            });

            if (!externalResponse.ok) {
                const errorData = await externalResponse.json();
                return res.status(externalResponse.status).json({ status: false, message: 'Import processing failed at external API', error: errorData.error || 'Unknown error', details: errorData.details });
            }

            const result = await externalResponse.json();
            res.json({
                status: result.status !== false,
                message: result.message,
                insertedCount: result.insertedCount || 0,
                errorCount: result.errorCount || 0,
                errors: result.errors || [],
                totalProcessed: data.length,
                method: 'external_api',
                source: 'wounddatacenter-local',
            });
        } catch (error) {
            console.error("[/api/import-excel] Error:", error);
            res.status(500).json({ status: false, error: error instanceof Error ? error.message : "Internal server error" });
        }
    });

    // ─── PDF Import ───────────────────────────────────────────────────────────
    app.post("/api/endpoints/pdf-import.php", uploadPdf.single('pdf'), async (req: any, res: Response) => {
        try {
            if (!req.file) return res.status(400).json({ success: false, error: 'No PDF file uploaded' });

            const formData = new FormData();
            formData.append('pdf', req.file.buffer, { filename: req.file.originalname, contentType: req.file.mimetype });
            formData.append('facility_id', req.body.facility_id || '1');
            formData.append('imported_by', req.body.imported_by || 'web-import');
            if (req.body.force_facility) formData.append('force_facility', req.body.force_facility);

            const phpResponse = await new Promise<{ status: number; data: any }>((resolve, reject) => {
                const request = formData.submit(`${PHP_LOCAL_BASE}/endpoints/pdf-import.php`, (err, response) => {
                    if (err) { reject(err); return; }
                    let data = '';
                    response.on('data', (chunk: any) => { data += chunk; });
                    response.on('end', () => {
                        try { resolve({ status: response.statusCode || 500, data: JSON.parse(data) }); }
                        catch (e) { reject(new Error(`Invalid JSON response: ${data.substring(0, 500)}`)); }
                    });
                    response.on('error', reject);
                });
                request.on('error', reject);
            });

            res.status(phpResponse.status).json(phpResponse.data);
        } catch (error) {
            console.error("[/api/endpoints/pdf-import.php] Error:", error);
            res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Failed to process PDF" });
        }
    });

    // ─── Enabled Dates ────────────────────────────────────────────────────────
    app.get("/api/enabled-dates", async (req: Request, res: Response) => {
        try {
            const facilityId = req.query.facility_id as string;
            const patientId = req.query.patient_id as string;
            if (!facilityId) return res.status(400).json({ status: false, error: "Missing required parameter: facility_id" });

            const params = new URLSearchParams();
            params.append('facility_id', facilityId);
            if (patientId) params.append('patient_id', patientId);

            const phpUrl = `${PHP_LOCAL_BASE}/endpoints/enabled-dates.php?${params}`;
            const response = await fetch(phpUrl, { method: 'GET', headers: { 'Content-Type': 'application/json' } });

            if (!response.ok) return res.status(response.status).json({ status: false, error: `Failed to fetch enabled dates: ${response.statusText}` });

            res.json(await response.json());
        } catch (error) {
            console.error("[/api/enabled-dates] Error:", error);
            res.status(500).json({ status: false, error: error instanceof Error ? error.message : "Failed to fetch enabled dates" });
        }
    });

    // ─── Import Audit (list) ──────────────────────────────────────────────────
    app.get("/api/import-audit", async (req: Request, res: Response) => {
        try {
            const { action, status, source_type, facility_id, limit, import_id } = req.query;
            const params = new URLSearchParams();
            if (action) params.append('action', action as string);
            if (status) params.append('status', status as string);
            if (source_type) params.append('source_type', source_type as string);
            if (facility_id) params.append('facility_id', facility_id as string);
            if (limit) params.append('limit', limit as string);
            if (import_id) params.append('import_id', import_id as string);

            const phpUrl = `${PHP_LOCAL_BASE}/endpoints/import-audit.php?${params}`;
            const response = await fetch(phpUrl, { method: 'GET', headers: { 'Content-Type': 'application/json' } });

            if (!response.ok) return res.status(response.status).json({ success: false, error: `Failed to fetch import audit data: ${response.statusText}` });

            res.json(await response.json());
        } catch (error) {
            console.error("[/api/import-audit] Error:", error);
            res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Failed to fetch import audit data" });
        }
    });

    // ─── Import Audit (revert) ────────────────────────────────────────────────
    app.delete("/api/import-audit", async (req: Request, res: Response) => {
        try {
            const { import_id } = req.query;
            if (!import_id) return res.status(400).json({ success: false, error: "import_id is required" });

            const phpUrl = `${PHP_LOCAL_BASE}/endpoints/import-audit.php?import_id=${import_id}`;
            const response = await fetch(phpUrl, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } });

            if (!response.ok) {
                try {
                    const errorData = await response.json();
                    return res.status(response.status).json({ success: false, error: errorData.error || `Failed to revert import: ${response.statusText}` });
                } catch {
                    return res.status(response.status).json({ success: false, error: `Failed to revert import: ${response.statusText}` });
                }
            }

            res.json(await response.json());
        } catch (error) {
            console.error("[/api/import-audit] DELETE Error:", error);
            res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Failed to revert import" });
        }
    });

    // ─── Setup Import SP ─────────────────────────────────────────────────────
    app.post("/api/admin/setup-import-sp", async (req: Request, res: Response) => {
        try {
            const authHeaders = getAuthHeaders(req);
            if (!authHeaders.Authorization) return res.status(401).json({ status: false, error: "Unauthorized - No authentication token provided" });

            const dbConfig = {
                server: process.env.REMOTE_DB_SERVER || '190.92.153.67',
                port: parseInt(process.env.REMOTE_DB_PORT || '1433'),
                database: process.env.REMOTE_DB_NAME || 'curisec',
                authentication: {
                    type: 'default' as const,
                    options: { userName: process.env.REMOTE_DB_USER || '', password: process.env.REMOTE_DB_PASSWORD || '' },
                },
                options: { trustServerCertificate: process.env.NODE_ENV !== 'production', encrypt: true, connectionTimeout: 30000, requestTimeout: 30000 },
            };

            if (!dbConfig.authentication.options.userName || !dbConfig.authentication.options.password) {
                return res.status(500).json({ status: false, error: "Database credentials not configured. Set REMOTE_DB_USER and REMOTE_DB_PASSWORD environment variables." });
            }

            const pool = new mssql.ConnectionPool(dbConfig);
            await pool.connect();

            try {
                const checkResult = await pool.request().query(`
          SELECT 1 FROM sys.objects WHERE type = 'P' AND name = 'sp_facility_import_excel_wounds' AND schema_id = SCHEMA_ID('facility')
        `);

                if (checkResult.recordset.length > 0) {
                    await pool.close();
                    return res.json({ status: true, message: "Stored procedure already exists", created: false, procedureName: "facility.sp_facility_import_excel_wounds" });
                }

                // SP definition omitted for brevity — it's the same CREATE PROCEDURE from the original routes.ts
                const spDefinition = getImportSpDefinition();
                await pool.request().query(spDefinition);
                await pool.close();

                res.json({ status: true, message: "Stored procedure created successfully", created: true, procedureName: "facility.sp_facility_import_excel_wounds", timestamp: new Date().toISOString() });
            } catch (poolError) {
                await pool.close();
                throw poolError;
            }
        } catch (error) {
            console.error("[/api/admin/setup-import-sp] Error:", error);
            res.status(500).json({ status: false, error: error instanceof Error ? error.message : "Failed to create stored procedure" });
        }
    });
}

function getImportSpDefinition(): string {
    return `
    CREATE PROCEDURE facility.sp_facility_import_excel_wounds
      @importData XML,
      @importedBy NVARCHAR(255)
    AS
    BEGIN
      SET NOCOUNT ON;
      BEGIN TRY
        BEGIN TRANSACTION;
        DECLARE @successCount INT = 0;
        DECLARE @errorCount INT = 0;
        DECLARE @totalProcessed INT = 0;

        CREATE TABLE #ImportErrors (RowNum INT, ErrorMessage NVARCHAR(MAX));

        INSERT INTO #ImportErrors (RowNum, ErrorMessage)
        SELECT
          T.c.value('(row_index/text())[1]', 'INT') AS RowNum,
          CASE
            WHEN NULLIF(LTRIM(RTRIM(T.c.value('(patient_id/text())[1]', 'NVARCHAR(50)'))), '') IS NULL THEN 'Missing required field: patient_id'
            WHEN NULLIF(LTRIM(RTRIM(T.c.value('(facility_id/text())[1]', 'NVARCHAR(50)'))), '') IS NULL THEN 'Missing required field: facility_id'
            WHEN NULLIF(LTRIM(RTRIM(T.c.value('(location/text())[1]', 'NVARCHAR(100)'))), '') IS NULL THEN 'Missing required field: location'
            WHEN NULLIF(LTRIM(RTRIM(T.c.value('(etiology/text())[1]', 'NVARCHAR(100)'))), '') IS NULL THEN 'Missing required field: etiology'
            WHEN NULLIF(LTRIM(RTRIM(T.c.value('(surface/text())[1]', 'NVARCHAR(20)'))), '') IS NULL THEN 'Missing required field: surface'
            WHEN NULLIF(LTRIM(RTRIM(T.c.value('(push_score/text())[1]', 'NVARCHAR(20)'))), '') IS NULL THEN 'Missing required field: push_score'
            WHEN NULLIF(LTRIM(RTRIM(T.c.value('(progress/text())[1]', 'NVARCHAR(50)'))), '') IS NULL THEN 'Missing required field: progress'
            WHEN NULLIF(LTRIM(RTRIM(T.c.value('(disposition/text())[1]', 'NVARCHAR(50)'))), '') IS NULL THEN 'Missing required field: disposition'
            WHEN NULLIF(LTRIM(RTRIM(T.c.value('(dos/text())[1]', 'NVARCHAR(20)'))), '') IS NULL THEN 'Missing required field: dos'
            WHEN NOT (T.c.value('(surface/text())[1]', 'NVARCHAR(20)') LIKE '%[0-9]%' AND CAST(T.c.value('(surface/text())[1]', 'NVARCHAR(20)') AS DECIMAL(10,2)) >= 0) THEN CONCAT('Invalid surface area: ', T.c.value('(surface/text())[1]', 'NVARCHAR(20)'))
            WHEN NOT (T.c.value('(push_score/text())[1]', 'NVARCHAR(20)') LIKE '%[0-9]%' AND CAST(T.c.value('(push_score/text())[1]', 'NVARCHAR(20)') AS INT) BETWEEN 0 AND 17) THEN CONCAT('Invalid PUSH score: ', T.c.value('(push_score/text())[1]', 'NVARCHAR(20)'), ' (must be 0-17)')
            WHEN NOT (T.c.value('(facility_id/text())[1]', 'NVARCHAR(50)') LIKE '%[0-9]%') THEN CONCAT('Invalid facility ID: ', T.c.value('(facility_id/text())[1]', 'NVARCHAR(50)'))
            WHEN T.c.value('(progress/text())[1]', 'NVARCHAR(50)') NOT IN ('Improving', 'Deteriorating', 'Stable') THEN CONCAT('Invalid progress value: ', T.c.value('(progress/text())[1]', 'NVARCHAR(50)'))
            WHEN T.c.value('(disposition/text())[1]', 'NVARCHAR(50)') NOT IN ('Active', 'Resolved', 'New', 'Hospitalized') THEN CONCAT('Invalid disposition value: ', T.c.value('(disposition/text())[1]', 'NVARCHAR(50)'))
            WHEN T.c.value('(exudate/text())[1]', 'NVARCHAR(50)') NOT IN ('None', 'Minimal', 'Moderate', 'Heavy', 'Copious') THEN CONCAT('Invalid exudate value: ', T.c.value('(exudate/text())[1]', 'NVARCHAR(50)'))
            WHEN T.c.value('(debridement/text())[1]', 'NVARCHAR(50)') NOT IN ('None', 'Autolytic', 'Enzymatic', 'Mechanical', 'Surgical') THEN CONCAT('Invalid debridement value: ', T.c.value('(debridement/text())[1]', 'NVARCHAR(50)'))
            WHEN NOT (ISDATE(T.c.value('(dos/text())[1]', 'NVARCHAR(20)')) = 1) THEN CONCAT('Invalid date format: ', T.c.value('(dos/text())[1]', 'NVARCHAR(20)'), '. Expected YYYY-MM-DD')
            ELSE NULL
          END AS ErrorMessage
        FROM @importData.nodes('/wounds/wound') AS T(c)
        WHERE T.c.value('(row_index/text())[1]', 'INT') IS NOT NULL
           OR T.c.value('(patient_id/text())[1]', 'NVARCHAR(50)') IS NOT NULL;

        IF EXISTS (SELECT 1 FROM #ImportErrors)
        BEGIN
          SELECT 'ERROR' AS Status, CONCAT('Validation failed for row ', RowNum, ': ', ErrorMessage) AS Message FROM #ImportErrors ORDER BY RowNum;
          ROLLBACK TRANSACTION;
          DROP TABLE #ImportErrors;
          RETURN;
        END;

        INSERT INTO facility.wound_encounters (
          patient_id, facility_id, provider_id, patient_name, location, etiology,
          width, height, depth, surface, exudate, tissue, treatment, frequency,
          progress, disposition, debridement, initial_surface, start_date, dos,
          days, healing_percentage, healing_rate, healing_days, push_score, created_date, import_source
        )
        SELECT
          LTRIM(RTRIM(T.c.value('(patient_id/text())[1]', 'NVARCHAR(50)'))),
          CAST(T.c.value('(facility_id/text())[1]', 'NVARCHAR(50)') AS INT),
          CAST(NULLIF(T.c.value('(provider_id/text())[1]', 'NVARCHAR(50)'), '') AS INT),
          LTRIM(RTRIM(T.c.value('(patient_name/text())[1]', 'NVARCHAR(100)'))),
          LTRIM(RTRIM(T.c.value('(location/text())[1]', 'NVARCHAR(100)'))),
          LTRIM(RTRIM(T.c.value('(etiology/text())[1]', 'NVARCHAR(100)'))),
          CAST(NULLIF(T.c.value('(width/text())[1]', 'NVARCHAR(20)'), '') AS DECIMAL(10,2)),
          CAST(NULLIF(T.c.value('(height/text())[1]', 'NVARCHAR(20)'), '') AS DECIMAL(10,2)),
          CAST(NULLIF(T.c.value('(depth/text())[1]', 'NVARCHAR(20)'), '') AS DECIMAL(10,2)),
          CAST(T.c.value('(surface/text())[1]', 'NVARCHAR(20)') AS DECIMAL(10,2)),
          NULLIF(LTRIM(RTRIM(T.c.value('(exudate/text())[1]', 'NVARCHAR(50)'))), ''),
          NULLIF(LTRIM(RTRIM(T.c.value('(tissue/text())[1]', 'NVARCHAR(100)'))), ''),
          NULLIF(LTRIM(RTRIM(T.c.value('(treatment/text())[1]', 'NVARCHAR(MAX)'))), ''),
          NULLIF(LTRIM(RTRIM(T.c.value('(frequency/text())[1]', 'NVARCHAR(50)'))), ''),
          LTRIM(RTRIM(T.c.value('(progress/text())[1]', 'NVARCHAR(50)'))),
          LTRIM(RTRIM(T.c.value('(disposition/text())[1]', 'NVARCHAR(50)'))),
          NULLIF(LTRIM(RTRIM(T.c.value('(debridement/text())[1]', 'NVARCHAR(50)'))), ''),
          CAST(NULLIF(T.c.value('(initial_surface/text())[1]', 'NVARCHAR(20)'), '') AS DECIMAL(10,2)),
          TRY_CONVERT(DATE, T.c.value('(start_date/text())[1]', 'NVARCHAR(20)'), 120),
          TRY_CONVERT(DATE, T.c.value('(dos/text())[1]', 'NVARCHAR(20)'), 120),
          CAST(NULLIF(T.c.value('(days/text())[1]', 'NVARCHAR(20)'), '') AS INT),
          CAST(NULLIF(T.c.value('(healing_percentage/text())[1]', 'NVARCHAR(20)'), '') AS DECIMAL(5,2)),
          CAST(NULLIF(T.c.value('(healing_rate/text())[1]', 'NVARCHAR(20)'), '') AS DECIMAL(10,2)),
          CAST(NULLIF(T.c.value('(healing_days/text())[1]', 'NVARCHAR(20)'), '') AS INT),
          CAST(T.c.value('(push_score/text())[1]', 'NVARCHAR(20)') AS INT),
          GETDATE(),
          @importedBy
        FROM @importData.nodes('/wounds/wound') AS T(c);

        SET @successCount = @@ROWCOUNT;
        SET @totalProcessed = @successCount;

        COMMIT TRANSACTION;
        SELECT 'SUCCESS' AS Status, CONCAT('Import completed successfully. ', @successCount, ' record(s) inserted.') AS Message, @successCount AS InsertedCount, @totalProcessed AS TotalProcessed, GETDATE() AS ImportDateTime, @importedBy AS ImportedBy;
        DROP TABLE #ImportErrors;
      END TRY
      BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        SELECT 'ERROR' AS Status, CONCAT('Import failed: ', ERROR_MESSAGE()) AS Message, ERROR_NUMBER() AS ErrorNumber, ERROR_SEVERITY() AS ErrorSeverity, ERROR_STATE() AS ErrorState;
        DROP TABLE IF EXISTS #ImportErrors;
      END CATCH;
    END;
  `;
}

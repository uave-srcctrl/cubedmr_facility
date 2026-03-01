# Export CREATE statements for facility schema
[System.Reflection.Assembly]::LoadWithPartialName("System.Data.SqlClient") | Out-Null

$server = "localhost,4433"
$username = "sa"
$password = "3232@lano"
$database = "curisec"

$connectionString = "Server=$server;Database=$database;User Id=$username;Password=$password;Encrypt=false;Trusted_Connection=false;"

try {
    $connection = New-Object System.Data.SqlClient.SqlConnection
    $connection.ConnectionString = $connectionString
    $connection.Open()
    Write-Host "Connected to database: $database" -ForegroundColor Green

    # Get all objects (tables, SPs, functions) and their definitions
    $query = @"
SELECT 
    OBJECT_NAME(o.object_id) as ObjectName,
    SCHEMA_NAME(o.schema_id) as SchemaName,
    o.type as ObjectType,
    OBJECT_DEFINITION(o.object_id) as Definition
FROM sys.objects o
WHERE SCHEMA_NAME(o.schema_id) = 'facility'
  AND o.type IN ('U', 'P', 'FN', 'IF', 'TF')
ORDER BY 
    CASE WHEN o.type = 'U' THEN 1 ELSE 2 END,
    o.type,
    o.name
"@

    $command = $connection.CreateCommand()
    $command.CommandText = $query
    $reader = $command.ExecuteReader()
    
    $sqlOutput = "-- ==========================================" + "`r`n"
    $sqlOutput += "-- FACILITY SCHEMA - EXPORT FROM curisec" + "`r`n"
    $sqlOutput += "-- Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" + "`r`n"
    $sqlOutput += "-- ==========================================" + "`r`n`r`n"
    
    $tableCount = 0
    $spCount = 0
    $funcCount = 0

    while ($reader.Read()) {
        $objName = $reader['ObjectName'].ToString()
        $schemaName = $reader['SchemaName'].ToString()
        $objType = $reader['ObjectType'].ToString()
        $definition = if ($reader['Definition'] -is [System.DBNull]) { "" } else { $reader['Definition'].ToString() }

        $typeDisplay = switch($objType) {
            'U' { 'TABLE'; $tableCount++ }
            'P' { 'STORED PROCEDURE'; $spCount++ }
            'FN' { 'FUNCTION'; $funcCount++ }
            'IF' { 'FUNCTION'; $funcCount++ }
            'TF' { 'FUNCTION'; $funcCount++ }
            default { $objType }
        }

        $sqlOutput += "`r`n-- ==========================================`r`n"
        $sqlOutput += "-- $($typeDisplay): [$($schemaName)].[$($objName)]`r`n"
        $sqlOutput += "-- ==========================================`r`n"
        
        if ($definition) {
            $sqlOutput += $definition + "`r`nGO`r`n"
        }
    }
    $reader.Close()

    # Write to file
    $exportPath = "c:\Data\Trabajo\Woundcare\2026\workspace\wounddatacenter\facility-schema-complete.sql"
    $sqlOutput | Out-File -FilePath $exportPath -Force -Encoding UTF8
    
    Write-Host "Export completed successfully!" -ForegroundColor Green
    Write-Host "  Tables: $tableCount" -ForegroundColor Cyan
    Write-Host "  Stored Procedures: $spCount" -ForegroundColor Cyan
    Write-Host "  Functions: $funcCount" -ForegroundColor Cyan
    Write-Host "`nExported to: $exportPath" -ForegroundColor Green

    $connection.Close()
}
catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host $_.Exception.StackTrace -ForegroundColor Red
}

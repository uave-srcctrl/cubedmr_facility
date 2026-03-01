# PowerShell script to export facility schema from Docker
$server = "localhost,1433"
$username = "sa"
$password = "3232@lano"
$database = "curisec"

# Connection string
$connectionString = "Server=$server;Database=$database;User Id=$username;Password=$password;Encrypt=false;Trusted_Connection=false;"

try {
    # Create connection
    $connection = New-Object System.Data.SqlClient.SqlConnection
    $connection.ConnectionString = $connectionString
    $connection.Open()
    Write-Host "Connected to database: $database" -ForegroundColor Green

    # Query to get all tables in facility schema
    $query = @"
SELECT 
    'TABLE' as ObjectType,
    TABLE_SCHEMA,
    TABLE_NAME,
    NULL as Definition
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'facility'

UNION ALL

SELECT 
    'PROCEDURE' as ObjectType,
    SCHEMA_NAME(p.schema_id) as TABLE_SCHEMA,
    p.name as TABLE_NAME,
    OBJECT_DEFINITION(p.object_id) as Definition
FROM sys.procedures p
WHERE SCHEMA_NAME(p.schema_id) = 'facility'

UNION ALL

SELECT 
    'FUNCTION' as ObjectType,
    SCHEMA_NAME(o.schema_id) as TABLE_SCHEMA,
    o.name as TABLE_NAME,
    OBJECT_DEFINITION(o.object_id) as Definition
FROM sys.objects o
WHERE SCHEMA_NAME(o.schema_id) = 'facility'
  AND o.type IN ('FN', 'IF', 'TF')

ORDER BY ObjectType, TABLE_NAME
"@

    $command = $connection.CreateCommand()
    $command.CommandText = $query
    $reader = $command.ExecuteReader()

    # Output results
    $output = @()
    while ($reader.Read()) {
        $output += [PSCustomObject]@{
            ObjectType = $reader['ObjectType']
            Schema = $reader['TABLE_SCHEMA']
            Name = $reader['TABLE_NAME']
            Definition = $reader['Definition']
        }
    }
    $reader.Close()

    # Display summary
    Write-Host "`n=== FACILITY SCHEMA SUMMARY ===" -ForegroundColor Cyan
    Write-Host "Tables:" -ForegroundColor Yellow
    $output | Where-Object {$_.ObjectType -eq 'TABLE'} | ForEach-Object {
        Write-Host "  - $($_.Name)"
    }

    Write-Host "`nStored Procedures:" -ForegroundColor Yellow
    $output | Where-Object {$_.ObjectType -eq 'PROCEDURE'} | ForEach-Object {
        Write-Host "  - $($_.Name)"
    }

    Write-Host "`nFunctions:" -ForegroundColor Yellow
    $output | Where-Object {$_.ObjectType -eq 'FUNCTION'} | ForEach-Object {
        Write-Host "  - $($_.Name)"
    }

    # Export to file
    $exportPath = "c:\Data\Trabajo\Woundcare\2026\workspace\wounddatacenter\facility-schema-detailed.txt"
    $output | Out-String | Out-File -FilePath $exportPath -Force
    Write-Host "`n✓ Exported to: $exportPath" -ForegroundColor Green

    # Export CREATE statements
    $createStatements = @"
-- =====================================================
-- FACILITY SCHEMA EXPORT
-- Database: curisec
-- Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
-- =====================================================

"@

    $output | Where-Object {$_.ObjectType -eq 'PROCEDURE' -or $_.ObjectType -eq 'FUNCTION'} | ForEach-Object {
        if ($_.Definition) {
            $createStatements += "`n-- ======================================"
            $createStatements += "`n-- $($_.ObjectType): $($_.Name)`n"
            $createStatements += "-- ======================================`n"
            $createStatements += $_.Definition + "`nGO`n"
        }
    }

    $createPath = "c:\Data\Trabajo\Woundcare\2026\workspace\wounddatacenter\facility-schema-sprocs.sql"
    $createStatements | Out-File -FilePath $createPath -Force
    Write-Host "✓ Exported SP/Functions to: $createPath" -ForegroundColor Green

    $connection.Close()
}
catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

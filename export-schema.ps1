# PowerShell script to export facility schema
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

    # Get tables
    $query = "SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'facility' ORDER BY TABLE_NAME"
    $command = $connection.CreateCommand()
    $command.CommandText = $query
    $reader = $command.ExecuteReader()
    
    $tables = @()
    while ($reader.Read()) {
        $tables += $reader['TABLE_NAME'].ToString()
    }
    $reader.Close()

    # Display results
    Write-Host "`n=== FACILITY SCHEMA - TABLES ===" -ForegroundColor Cyan
    if ($tables.Count -gt 0) {
        $tables | ForEach-Object { Write-Host "  - $_" }
    } else {
        Write-Host "  (No tables found)"
    }

    # Get stored procedures
    $procQuery = "SELECT name FROM sys.procedures WHERE SCHEMA_NAME(schema_id) = 'facility' ORDER BY name"
    $command = $connection.CreateCommand()
    $command.CommandText = $procQuery
    $reader = $command.ExecuteReader()
    
    $procs = @()
    while ($reader.Read()) {
        $procs += $reader['name'].ToString()
    }
    $reader.Close()

    Write-Host "`n=== FACILITY SCHEMA - STORED PROCEDURES ===" -ForegroundColor Cyan
    if ($procs.Count -gt 0) {
        $procs | ForEach-Object { Write-Host "  - $_" }
    } else {
        Write-Host "  (No stored procedures found)"
    }

    # Get functions
    $funcQuery = "SELECT name FROM sys.objects WHERE SCHEMA_NAME(schema_id) = 'facility' AND type IN ('FN', 'IF', 'TF') ORDER BY name"
    $command = $connection.CreateCommand()
    $command.CommandText = $funcQuery
    $reader = $command.ExecuteReader()
    
    $funcs = @()
    while ($reader.Read()) {
        $funcs += $reader['name'].ToString()
    }
    $reader.Close()

    Write-Host "`n=== FACILITY SCHEMA - FUNCTIONS ===" -ForegroundColor Cyan
    if ($funcs.Count -gt 0) {
        $funcs | ForEach-Object { Write-Host "  - $_" }
    } else {
        Write-Host "  (No functions found)"
    }

    # Export summary
    $summary = "Tables: $(($tables).Count)`nStored Procedures: $(($procs).Count)`nFunctions: $(($funcs).Count)`n"
    $summary | Out-File -FilePath "c:\Data\Trabajo\Woundcare\2026\workspace\wounddatacenter\facility-schema-summary.txt" -Force
    Write-Host "`nExported summary to: facility-schema-summary.txt" -ForegroundColor Green

    $connection.Close()
    Write-Host "`nDone!" -ForegroundColor Green
}
catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

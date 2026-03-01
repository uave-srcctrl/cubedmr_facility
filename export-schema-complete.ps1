# Export CREATE statements for facility schema - COMPLETE APPROACH
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

    $sqlOutput = "-- ==========================================" + "`r`n"
    $sqlOutput += "-- FACILITY SCHEMA - EXPORT FROM curisec" + "`r`n"
    $sqlOutput += "-- Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" + "`r`n"
    $sqlOutput += "-- ==========================================" + "`r`n"
    $sqlOutput += "-- USE curisec; GO" + "`r`n"
    $sqlOutput += "`r`n"

    # 1. EXPORT TABLES AND THEIR COLUMNS
    $tableQuery = @"
SELECT 
    t.TABLE_NAME,
    c.COLUMN_NAME,
    c.DATA_TYPE,
    c.CHARACTER_MAXIMUM_LENGTH,
    c.NUMERIC_PRECISION,
    c.NUMERIC_SCALE,
    c.IS_NULLABLE,
    c.COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.TABLES t
LEFT JOIN INFORMATION_SCHEMA.COLUMNS c 
    ON t.TABLE_NAME = c.TABLE_NAME AND t.TABLE_SCHEMA = c.TABLE_SCHEMA
WHERE t.TABLE_SCHEMA = 'facility'
ORDER BY t.TABLE_NAME, c.ORDINAL_POSITION
"@

    $command = $connection.CreateCommand()
    $command.CommandText = $tableQuery
    $reader = $command.ExecuteReader()
    
    $currentTable = ""
    $tableOutput = ""
    
    while ($reader.Read()) {
        $tableName = $reader['TABLE_NAME'].ToString()
        
        if ($tableName -ne $currentTable) {
            if ($currentTable -ne "") {
                $sqlOutput += $tableOutput + ");" + "`r`n" + "GO" + "`r`n`r`n"
            }
            
            $currentTable = $tableName
            $tableOutput = "CREATE TABLE [facility].[" + $tableName + "] ("`r`n"
        } else {
            $tableOutput += "," + "`r`n"
        }
        
        $colName = $reader['COLUMN_NAME'].ToString()
        $dataType = $reader['DATA_TYPE'].ToString()
        $charLen = $reader['CHARACTER_MAXIMUM_LENGTH']
        $numPrec = $reader['NUMERIC_PRECISION']
        $numScale = $reader['NUMERIC_SCALE']
        $nullable = $reader['IS_NULLABLE'].ToString()
        $defValue = $reader['COLUMN_DEFAULT']
        
        $typeString = $dataType
        if ($charLen -and $charLen -gt 0) {
            $typeString += "($($charLen))"
        } elseif ($dataType -match "numeric|decimal") {
            if ($numPrec -and $numScale) {
                $typeString += "($($numPrec),$($numScale))"
            }
        }
        
        $colDef = "    [$colName] $typeString"
        if ($nullable -eq "NO") {
            $colDef += " NOT NULL"
        }
        if ($defValue -and $defValue -ne [System.DBNull]::Value) {
            $colDef += " DEFAULT " + $defValue.ToString()
        }
        
        $tableOutput += $colDef
    }
    
    if ($currentTable -ne "") {
        $sqlOutput += $tableOutput + ");" + "`r`n" + "GO" + "`r`n`r`n"
    }
    
    $reader.Close()

    # 2. EXPORT STORED PROCEDURES
    $spQuery = @"
SELECT NAME = o.name, 
       definition = m.definition
FROM sys.objects o
INNER JOIN sys.sql_modules m ON o.object_id = m.object_id
WHERE SCHEMA_NAME(o.schema_id) = 'facility'
  AND o.type = 'P'
ORDER BY o.name
"@

    $command = $connection.CreateCommand()
    $command.CommandText = $spQuery
    $reader = $command.ExecuteReader()
    
    $sqlOutput += "`r`n-- ==========================================" + "`r`n"
    $sqlOutput += "-- STORED PROCEDURES" + "`r`n"
    $sqlOutput += "-- ==========================================" + "`r`n`r`n"
    
    $spCount = 0
    while ($reader.Read()) {
        $spName = $reader['NAME'].ToString()
        $definition = $reader['definition'].ToString()
        
        $sqlOutput += "-- Proc: $spName`r`n"
        $sqlOutput += $definition + "`r`n" + "GO" + "`r`n`r`n"
        $spCount++
    }
    $reader.Close()

    # 3. EXPORT FUNCTIONS
    $funcQuery = @"
SELECT NAME = o.name, 
       definition = m.definition
FROM sys.objects o
INNER JOIN sys.sql_modules m ON o.object_id = m.object_id
WHERE SCHEMA_NAME(o.schema_id) = 'facility'
  AND o.type IN ('FN', 'IF', 'TF')
ORDER BY o.name
"@

    $command = $connection.CreateCommand()
    $command.CommandText = $funcQuery
    $reader = $command.ExecuteReader()
    
    $sqlOutput += "`r`n-- ==========================================" + "`r`n"
    $sqlOutput += "-- FUNCTIONS" + "`r`n"
    $sqlOutput += "-- ==========================================" + "`r`n`r`n"
    
    $funcCount = 0
    while ($reader.Read()) {
        $funcName = $reader['NAME'].ToString()
        $definition = $reader['definition'].ToString()
        
        $sqlOutput += "-- Function: $funcName`r`n"
        $sqlOutput += $definition + "`r`n" + "GO" + "`r`n`r`n"
        $funcCount++
    }
    $reader.Close()
    
    # Write to file
    $exportPath = "c:\Data\Trabajo\Woundcare\2026\workspace\wounddatacenter\facility-schema-export-ready.sql"
    $sqlOutput | Out-File -FilePath $exportPath -Force -Encoding UTF8
    
    Write-Host "Export completed successfully!" -ForegroundColor Green
    Write-Host "  Stored Procedures: $spCount" -ForegroundColor Cyan
    Write-Host "  Functions: $funcCount" -ForegroundColor Cyan
    Write-Host "`nExported to: $exportPath" -ForegroundColor Green
    Write-Host "`nFile size: $((Get-Item $exportPath).Length) bytes" -ForegroundColor Cyan

    $connection.Close()
}
catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host $_.Exception.StackTrace -ForegroundColor Red
}

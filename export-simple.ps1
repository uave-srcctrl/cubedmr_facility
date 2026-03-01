# Simple export of stored procedures and functions
[System.Reflection.Assembly]::LoadWithPartialName("System.Data.SqlClient") | Out-Null

$server = "localhost,4433"
$username = "sa"
$password = "3232@lano"
$database = "curisec"

$connectionString = "Server=$server;Database=$database;User Id=$username;Password=$password;Encrypt=false;Trusted_Connection=false;"

$connection = New-Object System.Data.SqlClient.SqlConnection
$connection.ConnectionString = $connectionString
$connection.Open()

Write-Host "Generating SQL export..." -ForegroundColor Green

# Get stored procedures and functions
$query = @"
SELECT 
    'Procedure: ' + o.name as ObjectType, 
    m.definition
FROM sys.objects o
INNER JOIN sys.sql_modules m ON o.object_id = m.object_id
WHERE SCHEMA_NAME(o.schema_id) = 'facility'
  AND o.type = 'P'
  
UNION ALL

SELECT 
    'Function: ' + o.name, 
    m.definition
FROM sys.objects o
INNER JOIN sys.sql_modules m ON o.object_id = m.object_id
WHERE SCHEMA_NAME(o.schema_id) = 'facility'
  AND o.type IN ('FN', 'IF', 'TF')
  
ORDER BY ObjectType
"@

$command = $connection.CreateCommand()
$command.CommandText = $query
$reader = $command.ExecuteReader()

$sb = New-Object System.Text.StringBuilder
$sb.AppendLine("-- FACILITY SCHEMA EXPORT") | Out-Null
$sb.AppendLine("-- Tables: Facilities, Facility Data Report, user_settings, wound_encounter_edits, wound_encounters, wound_encounters_imports_logs") | Out-Null
$sb.AppendLine("--") | Out-Null 
$sb.AppendLine("USE curisec;") | Out-Null
$sb.AppendLine("GO") | Out-Null
$sb.AppendLine() | Out-Null

while ($reader.Read()) {
    $sb.AppendLine($reader[0].ToString()) | Out-Null
    $sb.AppendLine($reader[1].ToString()) | Out-Null
    $sb.AppendLine("GO") | Out-Null
    $sb.AppendLine() | Out-Null
}

$reader.Close()
$connection.Close()

$exportPath = "c:\Data\Trabajo\Woundcare\2026\workspace\wounddatacenter\facility-schema-final.sql"
$sb.ToString() | Out-File -FilePath $exportPath -Force -Encoding UTF8

Write-Host "Export saved to: facility-schema-final.sql" -ForegroundColor Green
Write-Host "File size: $((Get-Item $exportPath).Length) bytes" -ForegroundColor Cyan

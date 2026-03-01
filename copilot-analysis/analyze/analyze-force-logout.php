<?php
/**
 * ANÁLISIS DE FORCE LOGOUT - BD viglobal
 * Conecta a localWoundcareDB y analiza tabla Users
 */

// Configuración de conexión
$serverName = "localhost,4433";
$database = "viglobal";
$uid = "sa";
$pwd = "3232@lano";

// Connection options
$connectionInfo = array(
    "Database" => $database,
    "UID" => $uid,
    "PWD" => $pwd,
    "TrustServerCertificate" => true,
    "Encrypt" => true,
);

// Conectar
$conn = sqlsrv_connect($serverName, $connectionInfo);
if ($conn === false) {
    die("Connection failed: " . print_r(sqlsrv_errors(), true));
}

echo "═══════════════════════════════════════════════════════════\n";
echo "ANÁLISIS FORCE LOGOUT - BD viglobal\n";
echo "═══════════════════════════════════════════════════════════\n\n";

// 1. Estructura de tabla Users
echo "1. ESTRUCTURA DE TABLA 'Users'\n";
echo "───────────────────────────────────────────────────────────\n";
$sql = "SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
        FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Users' 
        ORDER BY ORDINAL_POSITION";
$stmt = sqlsrv_query($conn, $sql);
if ($stmt === false) {
    echo "Error: " . print_r(sqlsrv_errors(), true);
} else {
    while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
        echo "  • " . $row['COLUMN_NAME'] . " (" . $row['DATA_TYPE'] . ") " 
             . ($row['IS_NULLABLE'] === 'YES' ? "NULLABLE" : "NOT NULL") . "\n";
    }
}
echo "\n";

// 2. Estructura de tabla UserTokens
echo "2. ESTRUCTURA DE TABLA 'UserTokens'\n";
echo "───────────────────────────────────────────────────────────\n";
$sql = "SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
        FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'UserTokens' 
        ORDER BY ORDINAL_POSITION";
$stmt = sqlsrv_query($conn, $sql);
if ($stmt === false) {
    echo "Error: " . print_r(sqlsrv_errors(), true);
} else {
    while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
        echo "  • " . $row['COLUMN_NAME'] . " (" . $row['DATA_TYPE'] . ") " 
             . ($row['IS_NULLABLE'] === 'YES' ? "NULLABLE" : "NOT NULL") . "\n";
    }
}
echo "\n";

// 3. Contar usuarios y sesiones
echo "3. ESTADÍSTICAS DE USUARIOS Y SESIONES\n";
echo "───────────────────────────────────────────────────────────\n";
$sql = "SELECT 
            (SELECT COUNT(*) FROM dbo.Users) as TotalUsers,
            (SELECT COUNT(*) FROM dbo.UserTokens) as TotalTokens,
            (SELECT COUNT(DISTINCT UserId) FROM dbo.UserTokens) as UsersWithTokens";
$stmt = sqlsrv_query($conn, $sql);
if ($stmt === false) {
    echo "Error: " . print_r(sqlsrv_errors(), true);
} else {
    if ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
        echo "  • Total de Usuarios: " . $row['TotalUsers'] . "\n";
        echo "  • Total de Tokens: " . $row['TotalTokens'] . "\n";
        echo "  • Usuarios con Sesiones: " . $row['UsersWithTokens'] . "\n";
    }
}
echo "\n";

// 4. Usuarios con sesiones activas
echo "4. USUARIOS CON SESIONES ACTIVAS\n";
echo "───────────────────────────────────────────────────────────\n";
$sql = "SELECT 
            u.Id,
            u.Email,
            u.UserName,
            COUNT(ut.Id) as TokenCount
        FROM dbo.Users u
        LEFT JOIN dbo.UserTokens ut ON u.Id = ut.UserId
        GROUP BY u.Id, u.Email, u.UserName
        HAVING COUNT(ut.Id) > 0
        ORDER BY TokenCount DESC";
$stmt = sqlsrv_query($conn, $sql);
if ($stmt === false) {
    echo "Error: " . print_r(sqlsrv_errors(), true);
} else {
    while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
        echo sprintf("  • ID: %d | Email: %-30s | Tokens: %d\n", 
                     $row['Id'], $row['Email'], $row['TokenCount']);
    }
}
echo "\n";

// 5. Funciones disponibles en BD
echo "5. FUNCIONES DISPONIBLES EN LA BD\n";
echo "───────────────────────────────────────────────────────────\n";
$sql = "SELECT ROUTINE_NAME, ROUTINE_TYPE 
        FROM INFORMATION_SCHEMA.ROUTINES 
        WHERE ROUTINE_SCHEMA = 'dbo' 
        ORDER BY ROUTINE_TYPE, ROUTINE_NAME";
$stmt = sqlsrv_query($conn, $sql);
if ($stmt === false) {
    echo "  • No se encontraron funciones/stored procedures\n";
} else {
    $hasRoutines = false;
    while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
        echo "  • " . $row['ROUTINE_TYPE'] . ": " . $row['ROUTINE_NAME'] . "\n";
        $hasRoutines = true;
    }
    if (!$hasRoutines) {
        echo "  • No se encontraron funciones/stored procedures\n";
    }
}
echo "\n";

// 6. Relaciones entre tablas
echo "6. RELACIONES ENTRE TABLAS (Foreign Keys)\n";
echo "───────────────────────────────────────────────────────────\n";
$sql = "SELECT 
            OBJECT_NAME(fk.parent_object_id) AS TableName,
            c1.name AS ColumnName,
            OBJECT_NAME(fk.referenced_object_id) AS ReferencedTable,
            c2.name AS ReferencedColumn
        FROM sys.foreign_keys fk
        INNER JOIN sys.columns c1 ON fk.parent_object_id = c1.object_id AND fk.parent_column_id = c1.column_id
        INNER JOIN sys.columns c2 ON fk.referenced_object_id = c2.object_id AND fk.referenced_column_id = c2.column_id
        WHERE OBJECT_NAME(fk.parent_object_id) IN ('Users', 'UserTokens', 'AuthTokens')
        ORDER BY TableName";
$stmt = sqlsrv_query($conn, $sql);
if ($stmt === false) {
    echo "  • No se encontraron relaciones\n";
} else {
    $hasRelations = false;
    while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
        echo "  • " . $row['TableName'] . "." . $row['ColumnName'] 
             . " → " . $row['ReferencedTable'] . "." . $row['ReferencedColumn'] . "\n";
        $hasRelations = true;
    }
    if (!$hasRelations) {
        echo "  • No se encontraron relaciones\n";
    }
}
echo "\n";

echo "═══════════════════════════════════════════════════════════\n";
echo "RECOMENDACIONES PARA FORCE LOGOUT\n";
echo "═══════════════════════════════════════════════════════════\n\n";

echo "OPCIÓN 1: ELIMINAR TOKENS (Más Agresivo)\n";
echo "─────────────────────────────────────────\n";
echo "DELETE FROM dbo.UserTokens WHERE UserId = @UserId;\n";
echo "DELETE FROM dbo.AuthTokens WHERE UserId = @UserId;\n\n";

echo "OPCIÓN 2: MARCAR COMO EXPIRADO\n";
echo "───────────────────────────────\n";
echo "UPDATE dbo.UserTokens SET ExpiresAt = GETDATE() - 1 WHERE UserId = @UserId;\n\n";

echo "OPCIÓN 3: MARCAR CON FLAG (Recomendado)\n";
echo "──────────────────────────────────────────\n";
echo "UPDATE dbo.UserTokens SET IsActive = 0 WHERE UserId = @UserId;\n\n";

echo "OPCIÓN 4: REGISTRAR EN TRAIL + INVALIDAR\n";
echo "─────────────────────────────────────────\n";
echo "INSERT INTO dbo.UserTrail VALUES (@UserId, 'FORCE_LOGOUT', GETDATE(), 'Admin forced logout');\n";
echo "UPDATE dbo.UserTokens SET IsActive = 0 WHERE UserId = @UserId;\n\n";

// Cerrar conexión
sqlsrv_close($conn);

echo "═══════════════════════════════════════════════════════════\n";
echo "Análisis completado\n";
echo "═══════════════════════════════════════════════════════════\n";
?>

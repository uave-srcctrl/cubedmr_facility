#!/usr/bin/env php
<?php
/**
 * Script para diagnosticar y resolver problemas de autenticación en /facility
 * Uso: php facility-auth-troubleshoot.php [opción]
 */

const RED = "\033[91m";
const GREEN = "\033[92m";
const YELLOW = "\033[93m";
const BLUE = "\033[94m";
const RESET = "\033[0m";

function print_header($title) {
    echo BLUE . "╔═══════════════════════════════════════════════════════════════╗" . RESET . "\n";
    echo BLUE . "║ $title" . str_repeat(" ", 63 - strlen($title)) . "║" . RESET . "\n";
    echo BLUE . "╚═══════════════════════════════════════════════════════════════╝" . RESET . "\n\n";
}

function print_section($title) {
    echo "\n" . BLUE . "$title" . RESET . "\n";
    echo str_repeat("━", 65) . "\n";
}

function print_result($status, $message, $details = "") {
    $icon = $status ? "✓" : "✗";
    $color = $status ? GREEN : RED;
    echo $color . "  $icon " . RESET . "$message\n";
    if ($details) {
        echo "    " . YELLOW . "→ " . RESET . "$details\n";
    }
}

function check_server_status() {
    print_section("1. ESTADO DEL SERVIDOR NODE.JS");
    
    // Verificar si está en el puerto 5000
    $cmd = "netstat -tlnp 2>/dev/null | grep -q ':5000 '";
    $port_active = (shell_exec($cmd) !== null) ? 1 : 0;
    
    if ($port_active) {
        print_result(true, "Servidor Node.js en puerto 5000", "Activo");
    } else {
        print_result(false, "Servidor Node.js en puerto 5000", "No está corriendo");
    }
    
    // Verificar proceso Node.js
    $processes = shell_exec("pgrep -f 'node|tsx' | wc -l");
    $num_processes = (int)trim($processes);
    
    if ($num_processes > 0) {
        print_result(true, "Procesos Node.js activos", "$num_processes proceso(s)");
    } else {
        print_result(false, "Procesos Node.js activos", "No hay procesos");
    }
    
    // Verificar archivo de logs
    if (file_exists("/tmp/wounddatacenter-login.log")) {
        $size = filesize("/tmp/wounddatacenter-login.log");
        $size_human = format_bytes($size);
        print_result(true, "Archivo de logs de login", "Tamaño: $size_human");
    } else {
        print_result(false, "Archivo de logs de login", "No existe");
    }
    
    // Verificar archivos del servidor
    $files = [
        "/var/www/facility/server/routes.ts" => "Rutas de API",
        "/var/www/facility/server/auth.ts" => "Middleware de autenticación",
        "/var/www/facility/package.json" => "Configuración de Node.js"
    ];
    
    foreach ($files as $path => $name) {
        if (file_exists($path)) {
            print_result(true, "Archivo: $name", $path);
        } else {
            print_result(false, "Archivo: $name", "No existe: $path");
        }
    }
}

function format_bytes($bytes, $precision = 2) {
    $units = ['B', 'KB', 'MB', 'GB'];
    $bytes = max($bytes, 0);
    $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
    $pow = min($pow, count($units) - 1);
    $bytes /= (1 << (10 * $pow));
    return round($bytes, $precision) . ' ' . $units[$pow];
}

function check_connectivity() {
    print_section("2. VERIFICACIÓN DE CONECTIVIDAD");
    
    // Verificar localhost:5000
    $timeout = 5;
    $ch = curl_init("http://localhost:5000/api/get");
    curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([]));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ["Content-Type: application/json"]);
    
    $response = @curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($http_code > 0 && $http_code < 500) {
        print_result(true, "Endpoint /api/get accesible", "HTTP $http_code");
    } else {
        print_result(false, "Endpoint /api/get accesible", "No hay respuesta del servidor");
    }
    
    // Verificar backend remoto
    $ch = curl_init("https://cubed-mr.app/api/get");
    curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_NOBODY, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $response = @curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curl_error = curl_error($ch);
    curl_close($ch);
    
    if ($http_code > 0) {
        print_result(true, "Backend remoto accesible", "HTTP $http_code");
    } else {
        print_result(false, "Backend remoto accesible", "Error: $curl_error");
    }
}

function show_recent_logs() {
    print_section("3. LOGS RECIENTES DE LOGIN");
    
    $log_file = "/tmp/wounddatacenter-login.log";
    if (!file_exists($log_file)) {
        echo RED . "  ✗ " . RESET . "No hay logs disponibles\n";
        return;
    }
    
    $lines = file($log_file);
    $recent = array_slice($lines, -20);
    
    echo "Últimas 20 líneas de logs:\n\n";
    foreach ($recent as $line) {
        echo "  " . trim($line) . "\n";
    }
}

function show_status_codes() {
    print_section("4. CÓDIGOS DE ESTADO DE RESPUESTA");
    
    $codes = [
        1 => ["Estado", "Login exitoso"],
        0 => ["Status", "Falló la autenticación"],
        "reason: 1" => ["Reason", "Facilidad ya autenticada en otro dispositivo"],
        "reason: 3" => ["Reason", "Email y contraseña no coinciden"],
    ];
    
    foreach ($codes as $code => $info) {
        echo BLUE . "  $code" . RESET . " ($info[0]): $info[1]\n";
    }
}

function test_login($email, $password) {
    print_section("5. PRUEBA DE LOGIN");
    
    $device_id = "diagnostic-" . time();
    
    echo "  Email: $email\n";
    echo "  DeviceID: $device_id\n";
    echo "  Enviando solicitud de login...\n\n";
    
    $payload = json_encode([
        "entity" => "TryLoginFacilities",
        "email" => $email,
        "password" => $password,
        "deviceId" => $device_id
    ]);
    
    $ch = curl_init("http://localhost:5000/api/get");
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ["Content-Type: application/json"]);
    
    $response = @curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($response === false) {
        print_result(false, "Conexión al servidor", "No hay respuesta");
        return;
    }
    
    $data = json_decode($response, true);
    
    echo "Respuesta del servidor:\n";
    echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n\n";
    
    // Analizar respuesta
    if ($data && isset($data['data'][0])) {
        $item = $data['data'][0];
        $status = $item['status'] ?? null;
        $reason = $item['reason'] ?? null;
        $msg = $item['msg'] ?? null;
        
        if ($status == 1) {
            print_result(true, "Login exitoso", "Usuario autenticado");
        } elseif ($reason == 1) {
            print_result(false, "Facilidad ya autenticada", $msg);
        } elseif ($reason == 3) {
            print_result(false, "Credenciales inválidas", $msg);
        } else {
            print_result(false, "Error desconocido", $msg);
        }
    }
}

function show_help() {
    echo "\n" . BLUE . "Uso: php facility-auth-troubleshoot.php [opción]" . RESET . "\n\n";
    echo "Opciones:\n";
    echo "  status          Verificar estado del servidor (por defecto)\n";
    echo "  connectivity    Verificar conectividad\n";
    echo "  logs            Mostrar logs recientes\n";
    echo "  codes           Mostrar códigos de estado\n";
    echo "  test            Probar login con credenciales\n";
    echo "  all             Ejecutar todas las verificaciones\n";
    echo "  help            Mostrar esta ayuda\n\n";
}

// Main
$option = $argc > 1 ? $argv[1] : 'status';

print_header("Diagnóstico de Autenticación - /facility");

switch ($option) {
    case 'status':
        check_server_status();
        break;
    case 'connectivity':
        check_connectivity();
        break;
    case 'logs':
        show_recent_logs();
        break;
    case 'codes':
        show_status_codes();
        break;
    case 'test':
        if ($argc < 4) {
            echo RED . "Error: Se requieren email y contraseña\n" . RESET;
            echo "Uso: php facility-auth-troubleshoot.php test <email> <password>\n";
            exit(1);
        }
        test_login($argv[2], $argv[3]);
        break;
    case 'all':
        check_server_status();
        check_connectivity();
        show_recent_logs();
        show_status_codes();
        break;
    case 'help':
        show_help();
        break;
    default:
        echo RED . "Opción desconocida: $option" . RESET . "\n";
        show_help();
        exit(1);
}

echo "\n" . BLUE . "═══════════════════════════════════════════════════════════════" . RESET . "\n";
echo BLUE . "Diagnóstico completado: " . date('Y-m-d H:i:s') . RESET . "\n\n";
?>

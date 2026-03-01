import pyodbc
from datetime import datetime

# Configuración de conexión
server = 'localhost,4433'
database = 'viglobal'
username = 'sa'
password = '3232@lano'

try:
    connection_string = f'Driver={{ODBC Driver 17 for SQL Server}};Server={server};Database={database};UID={username};PWD={password};'
    conn = pyodbc.connect(connection_string, timeout=30)
    cursor = conn.cursor()
    
    print("=" * 80)
    print("VERIFICACIÓN Y FORCE LOGOUT - drperez@curisec.com")
    print("=" * 80)
    print()
    
    # PASO 1: Verificar que el usuario existe
    print("📍 PASO 1: Verificar usuario")
    print("-" * 80)
    cursor.execute("SELECT id, email, name, lastName, active, currentAuthStatus FROM Users WHERE email = 'drperez@curisec.com'")
    user_row = cursor.fetchone()
    
    if not user_row:
        print("❌ ERROR: Usuario drperez@curisec.com NO encontrado")
        conn.close()
        exit(1)
    
    user_id, email, first_name, last_name, is_active, auth_status = user_row
    print(f"✅ Usuario encontrado:")
    print(f"   ID: {user_id}")
    print(f"   Email: {email}")
    print(f"   Nombre: {first_name} {last_name}")
    print(f"   Activo en sistema: {'SÍ' if is_active else 'NO'}")
    print(f"   Estado de autenticación: {auth_status}")
    print()
    
    # PASO 2: Verificar tokens activos ANTES del logout
    print("📍 PASO 2: Verificar tokens activos ANTES")
    print("-" * 80)
    cursor.execute(f"SELECT COUNT(*) FROM UserTokens WHERE userid = {user_id} AND expired = 0")
    active_tokens_before = cursor.fetchone()[0]
    print(f"ℹ️  Tokens activos (expired=0): {active_tokens_before}")
    
    cursor.execute(f"SELECT id, token, issuedOn, expired FROM UserTokens WHERE userid = {user_id} ORDER BY issuedOn DESC")
    tokens = cursor.fetchall()
    if tokens:
        print("   Últimos tokens:")
        for token_id, token, issued_on, is_expired in tokens[:5]:
            print(f"     • ID={token_id}, Token={str(token)[:8]}..., Emitido={issued_on}, Expirado={'SÍ' if is_expired else 'NO'}")
    print()
    
    # PASO 3: Verificar AuthTokens
    print("📍 PASO 3: Verificar AuthTokens")
    print("-" * 80)
    cursor.execute(f"SELECT COUNT(*) FROM AuthTokens WHERE user_id = {user_id}")
    auth_tokens_count = cursor.fetchone()[0]
    print(f"ℹ️  AuthTokens totales: {auth_tokens_count}")
    
    cursor.execute(f"SELECT id, token, created_at, expires_at FROM AuthTokens WHERE user_id = {user_id} ORDER BY created_at DESC")
    auth_tokens = cursor.fetchall()
    if auth_tokens:
        print("   Tokens activos:")
        for token_id, token, created_at, expires_at in auth_tokens[:5]:
            is_expired = expires_at < datetime.now() if expires_at else False
            print(f"     • ID={token_id}, Creado={created_at}, Expira={expires_at}, Vigente={'NO' if is_expired else 'SÍ'}")
    print()
    
    # PASO 4: FORCE LOGOUT - Marcar tokens como expirados
    if active_tokens_before > 0:
        print("📍 PASO 4: Ejecutando FORCE LOGOUT")
        print("-" * 80)
        print("⚠️  Usuario ESTÁ loggeado - Iniciando force logout...")
        print()
        
        # Actualizar tokens a expirados
        cursor.execute(f"UPDATE UserTokens SET expired = 1 WHERE userid = {user_id} AND expired = 0")
        rows_updated = cursor.rowcount
        print(f"🔄 Tokens actualizados: {rows_updated}")
        
        # Actualizar currentAuthStatus a 0 (no autenticado)
        cursor.execute(f"UPDATE Users SET currentAuthStatus = 0 WHERE id = {user_id}")
        
        # Limpiar currentDeviceId
        cursor.execute(f"UPDATE Users SET currentDeviceId = NULL WHERE id = {user_id}")
        
        conn.commit()
        print(f"✅ Force logout completado exitosamente")
    else:
        print("📍 PASO 4: Verificación de tokens")
        print("-" * 80)
        print("✅ Usuario NO está loggeado - No se requiere force logout")
        print("   (No hay tokens activos)")
    
    print()
    
    # PASO 5: Verificar estado DESPUÉS
    print("📍 PASO 5: Verificar estado DESPUÉS del logout")
    print("-" * 80)
    cursor.execute(f"SELECT COUNT(*) FROM UserTokens WHERE userid = {user_id} AND expired = 0")
    active_tokens_after = cursor.fetchone()[0]
    print(f"ℹ️  Tokens activos ahora: {active_tokens_after}")
    
    cursor.execute(f"SELECT currentAuthStatus, currentDeviceId FROM Users WHERE id = {user_id}")
    auth_status_after, device_id_after = cursor.fetchone()
    print(f"ℹ️  Estado de autenticación: {auth_status_after}")
    print(f"ℹ️  Device ID: {device_id_after if device_id_after else 'NULL'}")
    print()
    
    # RESUMEN
    print("=" * 80)
    print("📊 RESUMEN")
    print("=" * 80)
    if active_tokens_before > 0:
        print(f"✅ Force logout ejecutado")
        print(f"   • Tokens eliminados: {active_tokens_before}")
        print(f"   • Estado anterior: LOGGEADO")
        print(f"   • Estado actual: NO LOGGEADO")
    else:
        print(f"✅ Usuario ya estaba desconectado")
        print(f"   • No se requería force logout")
        print(f"   • Estado: NO LOGGEADO")
    
    print()
    print("✅ Operación completada exitosamente")
    print("=" * 80)
    
    conn.close()
    
except pyodbc.Error as e:
    print(f"❌ Error de conexión SQL: {e}")
except Exception as e:
    print(f"❌ Error: {e}")

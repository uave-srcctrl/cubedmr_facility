import pyodbc

server = 'localhost,4433'
database = 'viglobal'
username = 'sa'
password = '3232@lano'

try:
    connection_string = f'Driver={{ODBC Driver 17 for SQL Server}};Server={server};Database={database};UID={username};PWD={password};'
    conn = pyodbc.connect(connection_string, timeout=30)
    cursor = conn.cursor()
    
    print("=" * 80)
    print("FORCE LOGOUT COMPLETO - drperez@curisec.com")
    print("=" * 80)
    print()
    
    # Paso 1: Obtener usuario
    cursor.execute("SELECT id FROM Users WHERE email = 'drperez@curisec.com'")
    user_row = cursor.fetchone()
    
    if not user_row:
        print("❌ Usuario no encontrado")
        conn.close()
        exit(1)
    
    user_id = user_row[0]
    print(f"✅ Usuario encontrado: ID={user_id}")
    print()
    
    # Paso 2: Estado ANTES
    print("📊 ESTADO ANTES DEL FORCE LOGOUT:")
    print("-" * 80)
    cursor.execute(f"SELECT currentAuthStatus, currentDeviceId FROM Users WHERE id = {user_id}")
    auth_status_before, device_id_before = cursor.fetchone()
    print(f"  currentAuthStatus: {auth_status_before}")
    print(f"  currentDeviceId: {device_id_before}")
    print()
    
    # Paso 3: Marcar todos los UserTokens como expirados
    print("🔄 PASO 1: Marcar UserTokens como expirados")
    print("-" * 80)
    cursor.execute(f"UPDATE UserTokens SET expired = 1 WHERE userid = {user_id}")
    rows_updated_1 = cursor.rowcount
    print(f"  ✅ {rows_updated_1} UserTokens marcados como expirados")
    print()
    
    # Paso 4: Limpiar AuthTokens (marcar como inactivos si existe columna, o dejar como está)
    print("🔄 PASO 2: Limpiar AuthTokens")
    print("-" * 80)
    cursor.execute(f"DELETE FROM AuthTokens WHERE user_id = {user_id}")
    rows_deleted = cursor.rowcount
    print(f"  ✅ {rows_deleted} AuthTokens eliminados")
    print()
    
    # Paso 5: Resetear estado de autenticación del usuario
    print("🔄 PASO 3: Resetear estado de autenticación")
    print("-" * 80)
    cursor.execute(f"""
    UPDATE Users 
    SET 
        currentAuthStatus = 0,
        currentDeviceId = NULL,
        oneTimeCode = NULL,
        oneTimeCodeTS = NULL
    WHERE id = {user_id}
    """)
    print(f"  ✅ Estado de autenticación reseteado")
    print()
    
    # Paso 6: Commit
    conn.commit()
    print("✅ Cambios confirmados en la base de datos")
    print()
    
    # Paso 7: Verificar estado DESPUÉS
    print("📊 ESTADO DESPUÉS DEL FORCE LOGOUT:")
    print("-" * 80)
    cursor.execute(f"SELECT currentAuthStatus, currentDeviceId FROM Users WHERE id = {user_id}")
    auth_status_after, device_id_after = cursor.fetchone()
    print(f"  currentAuthStatus: {auth_status_after}")
    print(f"  currentDeviceId: {device_id_after}")
    print()
    
    cursor.execute(f"SELECT COUNT(*) FROM UserTokens WHERE userid = {user_id} AND expired = 0")
    active_tokens = cursor.fetchone()[0]
    print(f"  UserTokens activos: {active_tokens}")
    print()
    
    cursor.execute(f"SELECT COUNT(*) FROM AuthTokens WHERE user_id = {user_id}")
    auth_tokens = cursor.fetchone()[0]
    print(f"  AuthTokens: {auth_tokens}")
    print()
    
    # Resumen
    print("=" * 80)
    print("✅ FORCE LOGOUT COMPLETADO EXITOSAMENTE")
    print("=" * 80)
    print()
    print("El usuario drperez@curisec.com ha sido desconectado completamente.")
    print("Cambios realizados:")
    print(f"  • {rows_updated_1} UserTokens marcados como expirados")
    print(f"  • {rows_deleted} AuthTokens eliminados")
    print(f"  • currentAuthStatus: {auth_status_before} → {auth_status_after}")
    print(f"  • currentDeviceId: '{device_id_before}' → {device_id_after}")
    print()
    print("El usuario puede ahora intentar login nuevamente.")
    print()
    
    conn.close()
    
except pyodbc.Error as e:
    print(f"❌ Error SQL: {e}")
except Exception as e:
    print(f"❌ Error: {e}")

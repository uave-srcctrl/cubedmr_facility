import pyodbc

server = 'localhost,4433'
database = 'curisec'  # ← LA BD CORRECTA
username = 'sa'
password = '3232@lano'

try:
    connection_string = f'Driver={{ODBC Driver 17 for SQL Server}};Server={server};Database={database};UID={username};PWD={password};'
    conn = pyodbc.connect(connection_string, timeout=30)
    cursor = conn.cursor()
    
    print("=" * 80)
    print("FORCE LOGOUT COMPLETO EN BD 'curisec' - drperez@curisec.com")
    print("=" * 80)
    print()
    
    email = 'drperez@curisec.com'
    
    # Paso 1: Obtener usuario
    cursor.execute(f"SELECT id FROM Users WHERE email = '{email}'")
    user_row = cursor.fetchone()
    
    if not user_row:
        print("❌ Usuario no encontrado en BD curisec")
        conn.close()
        exit(1)
    
    user_id = user_row[0]
    print(f"✅ Usuario encontrado en BD curisec: ID={user_id}")
    print()
    
    # Estado ANTES
    print("📊 ESTADO ANTES:")
    print("-" * 80)
    cursor.execute(f"""
    SELECT 
        currentAuthStatus,
        currentDeviceId,
        lastAccessTime
    FROM Users WHERE id = {user_id}
    """)
    auth_status_before, device_id_before, last_access_before = cursor.fetchone()
    print(f"  currentAuthStatus: {auth_status_before}")
    print(f"  currentDeviceId: {device_id_before}")
    print(f"  lastAccessTime: {last_access_before}")
    print()
    
    # Limpiar
    print("🔄 LIMPIEZA:")
    print("-" * 80)
    
    cursor.execute(f"DELETE FROM traceAuth WHERE email = '{email}'")
    rows_trace = cursor.rowcount
    print(f"  ✅ {rows_trace} registros en traceAuth eliminados")
    
    cursor.execute(f"""
    UPDATE Users
    SET
        currentAuthStatus = 0,
        currentDeviceId = NULL,
        lastAccessTime = DATEADD(minute, -30, GETDATE()),
        oneTimeCode = NULL,
        oneTimeCodeTS = NULL,
        attempts = 0,
        locked = 0
    WHERE id = {user_id}
    """)
    print(f"  ✅ Usuario reseteado completamente")
    print()
    
    conn.commit()
    
    # Verificar estado DESPUÉS
    print("📊 ESTADO DESPUÉS:")
    print("-" * 80)
    cursor.execute(f"""
    SELECT 
        currentAuthStatus,
        currentDeviceId,
        lastAccessTime,
        DATEDIFF(minute, ISNULL(lastAccessTime, GETDATE()), GETDATE()) as minutosAtrás
    FROM Users WHERE id = {user_id}
    """)
    auth_status_after, device_id_after, last_access_after, minutes_ago = cursor.fetchone()
    print(f"  currentAuthStatus: {auth_status_after}")
    print(f"  currentDeviceId: {device_id_after}")
    print(f"  lastAccessTime: {last_access_after}")
    print(f"  Minutos atrás: {minutes_ago}")
    print()
    
    print("=" * 80)
    print("✅ LIMPIEZA COMPLETADA EN BD 'curisec'")
    print("=" * 80)
    print()
    print(f"Cambios realizados:")
    print(f"  • {rows_tokens} UserTokens marcados como expirados")
    print(f"  • {rows_auth} AuthTokens eliminados")
    print(f"  • {rows_trace} registros de auditoría eliminados")
    print(f"  • currentAuthStatus: {auth_status_before} → {auth_status_after}")
    print(f"  • lastAccessTime: {last_access_before} → hace {minutes_ago} minutos")
    print()
    print("El usuario puede ahora hacer login.")
    print()
    
    conn.close()
    
except pyodbc.Error as e:
    print(f"❌ Error SQL: {e}")
except Exception as e:
    print(f"❌ Error: {e}")

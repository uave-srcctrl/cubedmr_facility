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
    print("LIMPIEZA FINAL DE AUTENTICACIÓN - drperez@curisec.com")
    print("=" * 80)
    print()
    
    user_id = 3
    email = 'drperez@curisec.com'
    
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
    auth_status, device_id, last_access = cursor.fetchone()
    print(f"  currentAuthStatus: {auth_status}")
    print(f"  currentDeviceId: {device_id}")
    print(f"  lastAccessTime: {last_access}")
    print()
    
    # Problema identificado en SP sp_GET_UserAuthenticated:
    # select @status=0, @reason=1 from Users 
    # where [email]=@email 
    #   and currentAuthStatus=1 
    #   and @status=1 
    #   and datediff(minute,isNull(lastAccessTime,getdate()),getdate())<15
    
    print("🔍 PROBLEMA IDENTIFICADO:")
    print("-" * 80)
    print("El SP sp_GET_UserAuthenticated rechaza login si:")
    print("  1. currentAuthStatus = 1 AND")
    print("  2. lastAccessTime fue hace < 15 minutos")
    print()
    print("Incluso después de limpiar datos, el usuario fue autenticado")
    print("en intentos previos, actualizando lastAccessTime a hace ~3 minutos")
    print()
    
    # Limpiar todo lo relacionado
    print("🔄 LIMPIEZA FINAL:")
    print("-" * 80)
    
    cursor.execute(f"""
    UPDATE Users
    SET
        currentAuthStatus = 0,
        currentDeviceId = NULL,
        lastAccessTime = NULL,
        oneTimeCode = NULL,
        oneTimeCodeTS = NULL
    WHERE id = {user_id}
    """)
    print(f"  ✅ Usuario reseteado completamente")
    
    # Limpiar traceAuth (historial de intentos)
    cursor.execute(f"DELETE FROM traceAuth WHERE email = '{email}'")
    trace_rows = cursor.rowcount
    print(f"  ✅ {trace_rows} registros en traceAuth eliminados")
    print()
    
    conn.commit()
    
    # Verificar estado DESPUÉS
    print("📊 ESTADO DESPUÉS:")
    print("-" * 80)
    cursor.execute(f"""
    SELECT 
        currentAuthStatus,
        currentDeviceId,
        lastAccessTime
    FROM Users WHERE id = {user_id}
    """)
    auth_status, device_id, last_access = cursor.fetchone()
    print(f"  currentAuthStatus: {auth_status}")
    print(f"  currentDeviceId: {device_id}")
    print(f"  lastAccessTime: {last_access}")
    print()
    
    cursor.execute(f"SELECT COUNT(*) FROM traceAuth WHERE email = '{email}'")
    trace_count = cursor.fetchone()[0]
    print(f"  traceAuth registros: {trace_count}")
    print()
    
    print("=" * 80)
    print("✅ LIMPIEZA COMPLETADA")
    print("=" * 80)
    print()
    print("El usuario puede ahora hacer login sin limitaciones.")
    print()
    
    conn.close()
    
except pyodbc.Error as e:
    print(f"❌ Error SQL: {e}")
except Exception as e:
    print(f"❌ Error: {e}")

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
    print("VERIFICACIÓN DEL ESTADO ACTUAL EN BD")
    print("=" * 80)
    print()
    
    email = 'drperez@curisec.com'
    
    # Verificar estado completo
    cursor.execute(f"""
    SELECT 
        id,
        email,
        active,
        currentAuthStatus,
        currentDeviceId,
        lastAccessTime,
        DATEDIFF(minute, ISNULL(lastAccessTime, GETDATE()), GETDATE()) as minutosAtrás
    FROM Users WHERE email = '{email}'
    """)
    
    row = cursor.fetchone()
    if row:
        user_id, email_val, is_active, auth_status, device_id, last_access, minutes_ago = row
        print(f"Usuario ID: {user_id}")
        print(f"Email: {email_val}")
        print(f"Active: {is_active}")
        print(f"currentAuthStatus: {auth_status}")
        print(f"currentDeviceId: {device_id}")
        print(f"lastAccessTime: {last_access}")
        print(f"Minutos desde lastAccessTime: {minutes_ago}")
        print()
        
        # Simular la lógica del SP
        print("SIMULACIÓN DE LÓGICA DEL SP sp_GET_UserAuthenticated:")
        print("-" * 80)
        
        # 1. does not exist
        print("1. Verificar si usuario existe...")
        cursor.execute(f"SELECT COUNT(*) FROM Users WHERE email = '{email}'")
        exists = cursor.fetchone()[0] > 0
        status = 1 if exists else 0
        reason = None if exists else 3
        print(f"   Usuario existe: {exists} → @status={status}, @reason={reason}")
        
        # 2. is user currently authenticated
        print()
        print("2. Verificar si usuario está actualmente autenticado...")
        cursor.execute(f"""
        SELECT COUNT(*) 
        FROM Users 
        WHERE email = '{email}' 
        AND currentAuthStatus = 1 
        AND DATEDIFF(minute, ISNULL(lastAccessTime, GETDATE()), GETDATE()) < 15
        """)
        is_authenticated = cursor.fetchone()[0] > 0
        if is_authenticated and status == 1:
            status = 0
            reason = 1
            print(f"   ¡Usuario ESTÁ autenticado hace menos de 15 minutos!")
            print(f"   → @status=0, @reason=1 (ERROR 0x5461938)")
        else:
            print(f"   Usuario NO está autenticado (o ambos no se cumplen)")
            print(f"   → @status={status}, @reason={reason}")
        
        print()
        print("=" * 80)
        print(f"RESULTADO FINAL: status={status}, reason={reason}")
        print("=" * 80)
        print()
        
        if status == 0 and reason == 1:
            print("❌ PROBLEMA: Usuario sigue siendo bloqueado con Error 0x5461938")
            print()
            print("VERIFICANDO CONDICIONES:")
            print(f"  • currentAuthStatus = {auth_status} (esperado: 0)")
            print(f"  • lastAccessTime = {last_access}")
            print(f"  • minutos desde lastAccessTime = {minutes_ago} (esperado: >= 15)")
        else:
            print("✅ Usuario debería poder hacer login")
    else:
        print("❌ Usuario no encontrado en BD")
    
    conn.close()
    
except pyodbc.Error as e:
    print(f"❌ Error SQL: {e}")
except Exception as e:
    print(f"❌ Error: {e}")

import pyodbc
from datetime import datetime, timedelta

server = 'localhost,4433'
database = 'viglobal'
username = 'sa'
password = '3232@lano'

try:
    connection_string = f'Driver={{ODBC Driver 17 for SQL Server}};Server={server};Database={database};UID={username};PWD={password};'
    conn = pyodbc.connect(connection_string, timeout=30)
    cursor = conn.cursor()
    
    print("=" * 80)
    print("FIX: SETTEAR lastAccessTime A MÁS DE 15 MINUTOS ATRÁS")
    print("=" * 80)
    print()
    
    user_id = 3
    email = 'drperez@curisec.com'
    
    # Establecer lastAccessTime a hace 30 minutos
    past_time = datetime.now() - timedelta(minutes=30)
    
    print(f"📍 Estableciendo lastAccessTime a: {past_time}")
    print()
    
    # SQL Server usa DATE type, no DATETIME
    cursor.execute(f"""
    UPDATE Users
    SET lastAccessTime = DATEADD(minute, -30, GETDATE())
    WHERE id = {user_id}
    """)
    print(f"  ✅ lastAccessTime actualizado")
    
    conn.commit()
    
    # Verificar
    cursor.execute(f"SELECT lastAccessTime FROM Users WHERE id = {user_id}")
    new_time = cursor.fetchone()[0]
    print(f"  Nueva lastAccessTime en BD: {new_time}")
    print()
    
    # Verificar la lógica del SP
    print("📋 VERIFICACIÓN DE LÓGICA SP:")
    print("-" * 80)
    cursor.execute(f"""
    SELECT 
        currentAuthStatus,
        lastAccessTime,
        DATEDIFF(minute, ISNULL(lastAccessTime, GETDATE()), GETDATE()) as minutesAgo
    FROM Users WHERE id = {user_id}
    """)
    
    auth_status, last_access, minutes_ago = cursor.fetchone()
    print(f"  currentAuthStatus: {auth_status}")
    print(f"  lastAccessTime: {last_access}")
    print(f"  Minutos desde lastAccessTime: {minutes_ago}")
    print()
    
    if auth_status == 0 and minutes_ago >= 15:
        print("✅ Usuario PUEDE hacer login ahora")
        print(f"   • currentAuthStatus = 0 (no autenticado)")
        print(f"   • lastAccessTime fue hace {minutes_ago} minutos")
        print(f"   • {minutes_ago} >= 15 minutos ✓")
    else:
        print(f"⚠️  Usuario PODRÍA seguir bloqueado:")
        print(f"   • currentAuthStatus = {auth_status} (esperado: 0)")
        print(f"   • Minutos desde lastAccessTime: {minutes_ago} (esperado: >= 15)")
    
    print()
    print("=" * 80)
    print("✅ CONFIGURACIÓN COMPLETADA")
    print("=" * 80)
    print()
    
    conn.close()
    
except pyodbc.Error as e:
    print(f"❌ Error SQL: {e}")
except Exception as e:
    print(f"❌ Error: {e}")

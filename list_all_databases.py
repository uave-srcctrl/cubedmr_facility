import pyodbc

server = 'localhost,4433'
username = 'sa'
password = '3232@lano'

try:
    # Conectar a master
    connection_string = f'Driver={{ODBC Driver 17 for SQL Server}};Server={server};UID={username};PWD={password};'
    conn = pyodbc.connect(connection_string, timeout=30)
    cursor = conn.cursor()
    
    print("📋 BASES DE DATOS DISPONIBLES:")
    print("=" * 80)
    cursor.execute("SELECT name FROM sys.databases ORDER BY name")
    
    databases = cursor.fetchall()
    for db in databases:
        print(f"  • {db[0]}")
    
    print()
    print("📋 TABLAS Users EN CADA BD:")
    print("=" * 80)
    
    for db in databases:
        db_name = db[0]
        try:
            cursor.execute(f"SELECT COUNT(*) FROM [{db_name}].dbo.Users")
            count = cursor.fetchone()[0]
            
            # Verificar si existe drperez
            cursor.execute(f"SELECT COUNT(*) FROM [{db_name}].dbo.Users WHERE email = 'drperez@curisec.com'")
            drperez_count = cursor.fetchone()[0]
            
            status = "✓" if drperez_count > 0 else " "
            print(f"  {status} {db_name}: {count} usuarios ({drperez_count} con drperez@curisec.com)")
        except:
            pass
    
    conn.close()
    
except pyodbc.Error as e:
    print(f"❌ Error SQL: {e}")
except Exception as e:
    print(f"❌ Error: {e}")

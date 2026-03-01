import pyodbc

server = 'localhost,4433'
database = 'viglobal'
username = 'sa'
password = '3232@lano'

try:
    connection_string = f'Driver={{ODBC Driver 17 for SQL Server}};Server={server};Database={database};UID={username};PWD={password};'
    conn = pyodbc.connect(connection_string, timeout=30)
    cursor = conn.cursor()
    
    print("📋 DEFINICIÓN DE sp_GET_UserAuthenticated")
    print("=" * 80)
    
    # Obtener la definición del SP
    cursor.execute("""
    SELECT OBJECT_DEFINITION (OBJECT_ID('sp_GET_UserAuthenticated'))
    """)
    
    sp_definition = cursor.fetchone()
    if sp_definition and sp_definition[0]:
        print(sp_definition[0])
    else:
        print("❌ Stored Procedure no encontrado")
    
    conn.close()
    
except pyodbc.Error as e:
    print(f"❌ Error SQL: {e}")
except Exception as e:
    print(f"❌ Error: {e}")

import pyodbc

server = 'localhost,4433'
database = 'viglobal'
username = 'sa'
password = '3232@lano'

try:
    connection_string = f'Driver={{ODBC Driver 17 for SQL Server}};Server={server};Database={database};UID={username};PWD={password};'
    conn = pyodbc.connect(connection_string, timeout=30)
    cursor = conn.cursor()
    
    print("📋 COLUMNAS DE AuthTokens:")
    cursor.execute("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='AuthTokens' ORDER BY ORDINAL_POSITION")
    columns = cursor.fetchall()
    for col in columns:
        print(f"  • {col[0]} ({col[1]})")
    
    print()
    print("📋 CONTENIDO DE AuthTokens (primeros registros):")
    cursor.execute("SELECT TOP 5 * FROM AuthTokens")
    results = cursor.fetchall()
    if results:
        print(f"  Columnas: {[desc[0] for desc in cursor.description]}")
        for row in results:
            print(f"  {row}")
    
    print()
    print("📋 COLUMNAS DE traceAuth:")
    cursor.execute("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='traceAuth' ORDER BY ORDINAL_POSITION")
    columns = cursor.fetchall()
    for col in columns:
        print(f"  • {col[0]} ({col[1]})")
    
    print()
    print("📋 CONTENIDO DE traceAuth (primeros registros):")
    cursor.execute("SELECT TOP 5 * FROM traceAuth")
    results = cursor.fetchall()
    if results:
        print(f"  Columnas: {[desc[0] for desc in cursor.description]}")
        for row in results:
            print(f"  {row}")
    
    conn.close()
    
except pyodbc.Error as e:
    print(f"❌ Error: {e}")

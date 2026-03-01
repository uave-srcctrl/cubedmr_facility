import pyodbc

# Configuración de conexión
server = 'localhost,4433'
database = 'viglobal'
username = 'sa'
password = '3232@lano'

try:
    connection_string = f'Driver={{ODBC Driver 17 for SQL Server}};Server={server};Database={database};UID={username};PWD={password};'
    conn = pyodbc.connect(connection_string, timeout=30)
    cursor = conn.cursor()
    print("✅ Conectado a SQL Server")
    print()
    
    # Listar todas las tablas
    print("📋 TABLAS DISPONIBLES EN viglobal:")
    print("-" * 70)
    cursor.execute("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME")
    tables = cursor.fetchall()
    for table in tables:
        print(f"  • {table[0]}")
    
    print()
    print("📋 COLUMNAS DE TABLA 'Users':")
    print("-" * 70)
    cursor.execute("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Users' ORDER BY ORDINAL_POSITION")
    columns = cursor.fetchall()
    for col in columns:
        print(f"  • {col[0]} ({col[1]})")
    
    print()
    print("📋 COLUMNAS DE TABLA 'UserTokens' (si existe):")
    print("-" * 70)
    cursor.execute("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='UserTokens' ORDER BY ORDINAL_POSITION")
    columns = cursor.fetchall()
    if columns:
        for col in columns:
            print(f"  • {col[0]} ({col[1]})")
    else:
        print("  ⚠️ Tabla UserTokens no encontrada")
    
    print()
    print("📋 BÚSQUEDA DE USUARIO 'drperez':")
    print("-" * 70)
    cursor.execute("SELECT TOP 10 * FROM Users WHERE email LIKE '%drperez%'")
    results = cursor.fetchall()
    if results:
        print(f"  Columnas: {[desc[0] for desc in cursor.description]}")
        for row in results:
            print(f"  {row}")
    else:
        print("  ❌ Usuario no encontrado")
        
        # Mostrar primeros usuarios como referencia
        print()
        print("📋 PRIMEROS USUARIOS EN LA BASE DE DATOS:")
        print("-" * 70)
        cursor.execute("SELECT TOP 5 * FROM Users")
        results = cursor.fetchall()
        print(f"  Columnas: {[desc[0] for desc in cursor.description]}")
        for row in results:
            print(f"  {row}")
    
    conn.close()
    
except pyodbc.Error as e:
    print(f"❌ Error: {e}")

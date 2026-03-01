import pyodbc

server = 'localhost,4433'
database = 'curisec'
username = 'sa'
password = '3232@lano'

try:
    connection_string = f'Driver={{ODBC Driver 17 for SQL Server}};Server={server};Database={database};UID={username};PWD={password};'
    conn = pyodbc.connect(connection_string, timeout=30)
    cursor = conn.cursor()
    
    print("📋 TABLAS EN BD 'curisec':")
    print("=" * 80)
    cursor.execute("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME")
    tables = cursor.fetchall()
    for table in tables:
        print(f"  • {table[0]}")
    
    print()
    print("📋 COLUMNAS DE TABLA 'Users' EN 'curisec':")
    print("-" * 80)
    cursor.execute("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Users' ORDER BY ORDINAL_POSITION")
    columns = cursor.fetchall()
    for col in columns:
        print(f"  • {col[0]} ({col[1]})")
    
    print()
    print("📋 CONTENIDO DE LA TABLA 'Users' (usuario drperez):")
    print("-" * 80)
    cursor.execute("SELECT * FROM Users WHERE email = 'drperez@curisec.com'")
    row = cursor.fetchone()
    if row:
        print(f"  Columnas: {[desc[0] for desc in cursor.description]}")
        print(f"  Datos: {row}")
    
    conn.close()
    
except pyodbc.Error as e:
    print(f"❌ Error SQL: {e}")
except Exception as e:
    print(f"❌ Error: {e}")

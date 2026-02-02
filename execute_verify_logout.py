import pyodbc
import sys

# Configuración de conexión
server = 'localhost,4433'
database = 'viglobal'
username = 'sa'
password = '3232@lano'

# Leer el archivo SQL
try:
    with open(r'c:\Data\Trabajo\Woundcare\2026\workspace\wounddatacenter\VERIFY_AND_FORCE_LOGOUT_DRPEREZ.sql', 'r', encoding='utf-8') as f:
        sql_script = f.read()
except FileNotFoundError as e:
    print(f"Error: Archivo SQL no encontrado - {e}")
    sys.exit(1)

# Conectar a SQL Server
try:
    connection_string = f'Driver={{ODBC Driver 17 for SQL Server}};Server={server};Database={database};UID={username};PWD={password};'
    conn = pyodbc.connect(connection_string, timeout=30)
    cursor = conn.cursor()
    print("✅ Conectado a SQL Server")
    print(f"   Servidor: {server}")
    print(f"   Base de datos: {database}")
    print()
except pyodbc.Error as e:
    print(f"❌ Error de conexión: {e}")
    sys.exit(1)

# Ejecutar el script
try:
    print("📋 Ejecutando verificación de drperez@curisec.com...")
    print("-" * 70)
    
    # Dividir el script por GO para ejecutar cada batch
    batches = sql_script.split('\nGO\n')
    
    for batch in batches:
        batch = batch.strip()
        if not batch:
            continue
        
        # Ejecutar batch
        try:
            cursor.execute(batch)
            
            # Mostrar resultados
            if cursor.description:
                for row in cursor.fetchall():
                    print(row[0] if len(row) == 1 else row)
            
            conn.commit()
        except Exception as batch_error:
            print(f"Batch error: {batch_error}")
            conn.rollback()
    
    print("-" * 70)
    print("✅ Ejecución completada exitosamente")
    
except pyodbc.Error as e:
    print(f"❌ Error ejecutando script: {e}")
    sys.exit(1)
finally:
    cursor.close()
    conn.close()

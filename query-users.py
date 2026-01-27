#!/usr/bin/env python3
import pyodbc
import sys

# Configuración de conexión
server = '190.92.153.67'
database = 'curisec'
username = 'sa'
password = ''  # Probar sin contraseña primero

# Cadenas de conexión a intentar
connection_strings = [
    f'Driver={{ODBC Driver 17 for SQL Server}};Server={server};Database={database};Uid={username};Pwd=;Encrypt=yes;TrustServerCertificate=yes;',
    f'Driver={{ODBC Driver 17 for SQL Server}};Server={server};Database={database};Uid={username};Pwd=sa;Encrypt=yes;TrustServerCertificate=yes;',
    f'Driver={{ODBC Driver 18 for SQL Server}};Server={server};Database={database};Trusted_Connection=no;Connection Timeout=30;Encrypt=yes;TrustServerCertificate=yes;',
]

def connect_and_query():
    for i, conn_str in enumerate(connection_strings, 1):
        try:
            print(f"🔄 Intentando conexión {i}...")
            conn = pyodbc.connect(conn_str, timeout=10)
            cursor = conn.cursor()
            
            print('✓ Conexión exitosa a la base de datos remota\n')
            
            # Consultar usuarios
            cursor.execute('SELECT * FROM dbo.Users')
            rows = cursor.fetchall()
            
            # Obtener nombres de columnas
            columns = [description[0] for description in cursor.description]
            
            print('📊 Tabla de Usuarios:')
            print('─' * 80)
            print(f"{'ID':<40} {'Username':<30} {'Password':<40}")
            print('─' * 80)
            
            for row in rows:
                print(f"{str(row[0]):<40} {str(row[1]):<30} {str(row[2]):<40}")
            
            print(f'\n✓ Total de usuarios: {len(rows)}')
            
            conn.close()
            return True
            
        except Exception as e:
            print(f"  ❌ Error: {str(e)}\n")
            continue
    
    print("❌ No se pudo conectar con ninguna configuración")
    return False

if __name__ == '__main__':
    connect_and_query()

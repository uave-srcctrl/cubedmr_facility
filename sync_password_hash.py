import pyodbc

server = 'localhost,4433'
database = 'curisec'
username = 'sa'
password = '3232@lano'

try:
    connection_string = f'Driver={{ODBC Driver 17 for SQL Server}};Server={server};Database={database};UID={username};PWD={password};'
    conn = pyodbc.connect(connection_string, timeout=30)
    cursor = conn.cursor()
    
    print("=" * 80)
    print("SINCRONIZAR HASH DE CONTRASEÑA - drperez@curisec.com")
    print("=" * 80)
    print()
    
    email = 'drperez@curisec.com'
    correct_hash = 'ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f'
    
    # Hash actual en BD curisec
    cursor.execute(f"SELECT passwd FROM Users WHERE email = '{email}'")
    current_hash = cursor.fetchone()[0]
    
    print(f"Email: {email}")
    print()
    print(f"Hash ACTUAL en curisec:")
    print(f"  {current_hash}")
    print()
    print(f"Hash CORRECTO (de viglobal):")
    print(f"  {correct_hash}")
    print()
    
    # Actualizar
    print("🔄 ACTUALIZANDO HASH...")
    print("-" * 80)
    
    cursor.execute(f"""
    UPDATE Users 
    SET passwd = '{correct_hash}'
    WHERE email = '{email}'
    """)
    
    rows_affected = cursor.rowcount
    print(f"  ✅ {rows_affected} registro(s) actualizado(s)")
    
    conn.commit()
    
    # Verificar
    cursor.execute(f"SELECT passwd FROM Users WHERE email = '{email}'")
    new_hash = cursor.fetchone()[0]
    
    print()
    print("Nuevo hash en BD curisec:")
    print(f"  {new_hash}")
    print()
    
    if new_hash == correct_hash:
        print("✅ SINCRONIZACIÓN COMPLETADA")
        print()
        print("El usuario ahora puede hacer login con la contraseña correcta.")
    else:
        print("❌ Error en la sincronización")
    
    conn.close()
    
except pyodbc.Error as e:
    print(f"❌ Error SQL: {e}")
except Exception as e:
    print(f"❌ Error: {e}")

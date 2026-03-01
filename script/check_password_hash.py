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
    print("VERIFICACIÓN DE CONTRASEÑA - drperez@curisec.com")
    print("=" * 80)
    print()
    
    email = 'drperez@curisec.com'
    
    # Obtener contraseña en BD curisec
    cursor.execute(f"SELECT id, email, passwd FROM Users WHERE email = '{email}'")
    row = cursor.fetchone()
    
    if row:
        user_id, email_val, passwd_hash = row
        print(f"Usuario ID: {user_id}")
        print(f"Email: {email_val}")
        print(f"Contraseña hash en BD curisec: {passwd_hash}")
        print()
        
        # Contraseña que está intentando
        password_attempt = 'ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f'
        print(f"Contraseña que intenta: {password_attempt}")
        print()
        
        if passwd_hash == password_attempt:
            print("✅ Las contraseñas coinciden")
        else:
            print("❌ Las contraseñas NO coinciden")
        print()
        
        # Buscar en viglobal para comparar
        print("Comparando con BD viglobal:")
        print("-" * 80)
        
        conn2 = pyodbc.connect(f'Driver={{ODBC Driver 17 for SQL Server}};Server={server};Database=viglobal;UID={username};PWD={password};', timeout=30)
        cursor2 = conn2.cursor()
        
        cursor2.execute(f"SELECT id, email, passwd FROM Users WHERE email = '{email}'")
        row2 = cursor2.fetchone()
        
        if row2:
            user_id2, email_val2, passwd_hash2 = row2
            print(f"Usuario ID: {user_id2}")
            print(f"Email: {email_val2}")
            print(f"Contraseña hash en BD viglobal: {passwd_hash2}")
            print()
            
            if passwd_hash2 == password_attempt:
                print("✅ Coincide con viglobal")
            else:
                print("❌ No coincide con viglobal")
        
        conn2.close()
    
    conn.close()
    
except pyodbc.Error as e:
    print(f"❌ Error SQL: {e}")
except Exception as e:
    print(f"❌ Error: {e}")

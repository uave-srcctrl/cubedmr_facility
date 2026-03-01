#!/usr/bin/env python3
"""
Connect to localWoundcareDB to check authentication tables
"""

import json
import sys

try:
    import pyodbc
except ImportError:
    print("Installing pyodbc...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pyodbc"])
    import pyodbc

# Try to connect to localWoundcareDB
# This is a local SQL Server instance or ODBC data source
connection_strings = [
    # Try ODBC DSN first
    "DSN=localWoundcareDB;Trusted_Connection=yes;",
    # Try direct connection to local SQL Server
    "DRIVER={ODBC Driver 17 for SQL Server};SERVER=localhost;DATABASE=curisec;UID=sa;PWD=3232@lano;TrustServerCertificate=yes;",
    # Try with named instance
    "DRIVER={ODBC Driver 17 for SQL Server};SERVER=(local)\\SQLEXPRESS;DATABASE=curisec;Trusted_Connection=yes;",
]

conn = None
for conn_str in connection_strings:
    try:
        print(f"Trying connection: {conn_str[:50]}...")
        conn = pyodbc.connect(conn_str, timeout=5)
        print("✅ Connected successfully!\n")
        break
    except Exception as e:
        print(f"❌ Failed: {str(e)[:60]}\n")

if not conn:
    print("Could not connect to any SQL Server instance")
    sys.exit(1)

cursor = conn.cursor()

# 1. Find all tables
print("=" * 80)
print("1. FINDING AUTHENTICATION/SESSION TABLES")
print("=" * 80 + "\n")

query = """
SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
  AND (TABLE_NAME LIKE '%user%' 
    OR TABLE_NAME LIKE '%session%'
    OR TABLE_NAME LIKE '%device%'
    OR TABLE_NAME LIKE '%auth%'
    OR TABLE_NAME LIKE '%login%')
ORDER BY TABLE_NAME
"""

try:
    cursor.execute(query)
    auth_tables = [row[0] for row in cursor.fetchall()]
    
    if auth_tables:
        print(f"Found {len(auth_tables)} tables:\n")
        for i, table in enumerate(auth_tables, 1):
            print(f"  {i}. {table}")
    else:
        print("No authentication tables found with those keywords")
        print("\nListing ALL tables in database:\n")
        cursor.execute("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME")
        all_tables = [row[0] for row in cursor.fetchall()]
        for table in all_tables:
            print(f"  - {table}")
        auth_tables = all_tables
except Exception as e:
    print(f"Error querying tables: {e}")
    sys.exit(1)

# 2. Find tables with email columns
print("\n" + "=" * 80)
print("2. TABLES WITH EMAIL COLUMNS")
print("=" * 80 + "\n")

tables_with_email = []
for table in auth_tables:
    query = f"""
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = '{table}'
      AND (COLUMN_NAME LIKE '%email%' OR COLUMN_NAME = 'email')
    """
    
    try:
        cursor.execute(query)
        email_cols = [row[0] for row in cursor.fetchall()]
        
        if email_cols:
            tables_with_email.append((table, email_cols[0]))
            print(f"✅ {table}.{email_cols[0]}")
    except:
        pass

# 3. Search for drperez@curisec.com
print("\n" + "=" * 80)
print("3. SEARCHING FOR drperez@curisec.com SESSIONS")
print("=" * 80 + "\n")

email_target = "drperez@curisec.com"
found_sessions = {}

for table, email_col in tables_with_email:
    query = f"SELECT COUNT(*) FROM {table} WHERE {email_col} = ?"
    try:
        cursor.execute(query, (email_target,))
        count = cursor.fetchone()[0]
        
        if count > 0:
            print(f"🔓 Found {count} record(s) in {table}\n")
            
            # Get column names
            query_cols = f"SELECT TOP 1 * FROM {table} WHERE {email_col} = ?"
            cursor.execute(query_cols, (email_target,))
            columns = [desc[0] for desc in cursor.description]
            
            # Get data
            query_data = f"SELECT TOP 5 * FROM {table} WHERE {email_col} = ?"
            cursor.execute(query_data, (email_target,))
            
            for row in cursor.fetchall():
                data = dict(zip(columns, row))
                print(json.dumps(data, indent=2, default=str))
                print()
            
            found_sessions[table] = count
    except Exception as e:
        print(f"   Error querying {table}: {e}\n")

if not found_sessions:
    print("❌ No active sessions found for drperez@curisec.com\n")
else:
    print("\n" + "=" * 80)
    print("4. CLEANUP COMMANDS")
    print("=" * 80 + "\n")
    
    print("To force logout, execute these SQL commands:\n")
    
    for table, email_col in tables_with_email:
        if table in found_sessions:
            cmd = f"DELETE FROM {table} WHERE {email_col} = 'drperez@curisec.com';"
            print(f"{cmd}\n")

conn.close()
print("✅ Done")

#!/usr/bin/env python3
"""
Direct connection to MSSQL Docker to check authentication tables
"""

import json
import sys

try:
    import pyodbc
except ImportError:
    print(json.dumps({
        "error": "pyodbc not installed",
        "solution": "pip install pyodbc"
    }))
    sys.exit(1)

# MSSQL Docker connection
server = 'localhost'
port = 4433
database = 'curisec'
username = 'sa'
password = '3232@lano'

# Connection string
conn_str = f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={server},{port};DATABASE={database};UID={username};PWD={password};TrustServerCertificate=yes;Encrypt=no'

try:
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()
    print("✅ Connected to MSSQL successfully\n")
except pyodbc.Error as e:
    print(json.dumps({
        "error": "Connection failed",
        "details": str(e)
    }, indent=2))
    sys.exit(1)

output = {}

# 1. Find all relevant tables
print("=" * 80)
print("1. SEARCHING FOR AUTHENTICATION/SESSION TABLES")
print("=" * 80)

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

cursor.execute(query)
auth_tables = [row[0] for row in cursor.fetchall()]
print(f"\nFound {len(auth_tables)} authentication-related tables:")
for table in auth_tables:
    print(f"  - {table}")

output["auth_tables"] = auth_tables

# 2. For each table, check its columns
print("\n" + "=" * 80)
print("2. TABLE STRUCTURES")
print("=" * 80)

table_details = {}
for table in auth_tables:
    query = f"""
    SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = '{table}'
    ORDER BY ORDINAL_POSITION
    """
    
    cursor.execute(query)
    columns = cursor.fetchall()
    
    print(f"\n📋 {table}:")
    col_list = []
    for col_name, data_type, is_nullable in columns:
        nullable = "NULL" if is_nullable == "YES" else "NOT NULL"
        print(f"   - {col_name} ({data_type}) {nullable}")
        col_list.append(col_name)
    
    table_details[table] = col_list

output["table_structures"] = table_details

# 3. Look for drperez@curisec.com in these tables
print("\n" + "=" * 80)
print("3. SEARCHING FOR drperez@curisec.com ACTIVE SESSIONS")
print("=" * 80)

email_target = "drperez@curisec.com"
user_data = {}

for table in auth_tables:
    # Find email column
    email_col = None
    for col in table_details[table]:
        if col.lower() in ['email', 'emailaddress', 'user_email']:
            email_col = col
            break
    
    if not email_col:
        continue
    
    query = f"SELECT COUNT(*) FROM {table} WHERE {email_col} = ?"
    try:
        cursor.execute(query, (email_target,))
        count = cursor.fetchone()[0]
        
        if count > 0:
            print(f"\n🔓 {table}: Found {count} record(s)")
            
            # Get details
            query_detail = f"SELECT TOP 5 * FROM {table} WHERE {email_col} = ?"
            cursor.execute(query_detail, (email_target,))
            rows = cursor.fetchall()
            
            for row in rows:
                print(f"   {dict(zip([desc[0] for desc in cursor.description], row))}")
            
            user_data[table] = count
    except Exception as e:
        print(f"   ⚠️ Error checking {table}: {e}")

output["user_drperez_sessions"] = user_data

# 4. Show all active users
print("\n" + "=" * 80)
print("4. ALL CURRENTLY AUTHENTICATED USERS")
print("=" * 80)

for table in auth_tables:
    # Find email column
    email_col = None
    for col in table_details[table]:
        if col.lower() in ['email', 'emailaddress', 'user_email']:
            email_col = col
            break
    
    if not email_col:
        continue
    
    query = f"SELECT DISTINCT {email_col} FROM {table} ORDER BY {email_col}"
    try:
        cursor.execute(query)
        users = [row[0] for row in cursor.fetchall()]
        
        if users:
            print(f"\n👥 {table} ({len(users)} users):")
            for user in users[:10]:  # Show first 10
                print(f"   - {user}")
            if len(users) > 10:
                print(f"   ... and {len(users) - 10} more")
            
            output[f"users_in_{table}"] = users
    except Exception as e:
        print(f"   ⚠️ Error: {e}")

conn.close()

# 5. Generate cleanup commands
print("\n" + "=" * 80)
print("5. COMMANDS TO FORCE LOGOUT drperez@curisec.com")
print("=" * 80)

commands = []
for table in auth_tables:
    email_col = None
    for col in table_details[table]:
        if col.lower() in ['email', 'emailaddress', 'user_email']:
            email_col = col
            break
    
    if not email_col:
        continue
    
    delete_cmd = f"DELETE FROM {table} WHERE {email_col} = 'drperez@curisec.com';"
    commands.append(delete_cmd)
    print(f"\n{delete_cmd}")

output["cleanup_commands"] = commands

print("\n" + "=" * 80)
print(json.dumps(output, indent=2))

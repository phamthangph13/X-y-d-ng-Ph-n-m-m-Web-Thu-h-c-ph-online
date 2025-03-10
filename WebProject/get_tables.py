import pyodbc

# Try different connection approaches
def try_connect():
    # List of possible driver names on Windows
    drivers = [
        'ODBC Driver 18 for SQL Server',
        'ODBC Driver 17 for SQL Server',
        'ODBC Driver 13.1 for SQL Server',
        'SQL Server Native Client 11.0',
        'SQL Server'
    ]
    
    conn = None
    error_messages = []
    
    # Try each driver
    for driver in drivers:
        try:
            conn_str = f"DRIVER={{{driver}}};Server=db15290.public.databaseasp.net;Database=db15290;UID=db15290;PWD=jT+5Y2t=qM@7;Encrypt=yes;TrustServerCertificate=yes;"
            print(f"Trying connection with driver: {driver}")
            conn = pyodbc.connect(conn_str, timeout=10)
            print(f"Connected successfully using {driver}")
            return conn
        except Exception as e:
            error_messages.append(f"Failed with driver {driver}: {str(e)}")
            continue
    
    # If all driver attempts fail, try the original connection string
    try:
        original_conn_str = "Server=db15290.public.databaseasp.net; Database=db15290; User Id=db15290; Password=jT+5Y2t=qM@7; Encrypt=True; TrustServerCertificate=True; MultipleActiveResultSets=True;"
        print("Trying original connection string")
        conn = pyodbc.connect(original_conn_str, timeout=10)
        print("Connected with original string")
        return conn
    except Exception as e:
        error_messages.append(f"Failed with original string: {str(e)}")
    
    # Print all error messages for troubleshooting
    print("\nAll connection attempts failed:")
    for msg in error_messages:
        print(f"  - {msg}")
    
    raise Exception("Could not connect with any of the attempted methods")

try:
    # Establish connection
    conn = try_connect()
    cursor = conn.cursor()
    print("Database connection established successfully.")

    # Query to get all tables
    cursor.execute("""
    SELECT TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_TYPE = 'BASE TABLE'
    ORDER BY TABLE_NAME
    """)
    
    # Fetch and print the results
    tables = cursor.fetchall()
    
    print("\nTables in the database:")
    print("----------------------")
    for table in tables:
        print(table[0])
    
    print(f"\nTotal number of tables: {len(tables)}")
    
    # For the first few tables, also show column information
    print("\nDetailed information for first 5 tables:")
    print("---------------------------------------")
    
    count = 0
    for table in tables:
        if count >= 5:
            break
            
        table_name = table[0]
        cursor.execute(f"""
        SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH,
               IS_NULLABLE, COLUMNPROPERTY(OBJECT_ID('{table_name}'), COLUMN_NAME, 'IsIdentity') AS IS_IDENTITY
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '{table_name}'
        ORDER BY ORDINAL_POSITION
        """)
        
        columns = cursor.fetchall()
        
        print(f"\nTable: {table_name}")
        print("Columns:")
        for col in columns:
            col_name = col[0]
            data_type = col[1]
            max_length = col[2] if col[2] is not None else "N/A"
            nullable = "NULL" if col[3] == "YES" else "NOT NULL"
            is_identity = "IDENTITY" if col[4] == 1 else ""
            
            print(f"  - {col_name}: {data_type}({max_length}) {nullable} {is_identity}")
        
        count += 1

except pyodbc.Error as e:
    print(f"Database Error: {e}")
except Exception as e:
    print(f"Error: {e}")
finally:
    if 'conn' in locals():
        conn.close()
        print("Database connection closed.") 
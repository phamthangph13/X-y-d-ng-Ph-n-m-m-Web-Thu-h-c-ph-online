
import pyodbc
import pandas as pd

# Chuỗi kết nối với các giá trị được điều chỉnh cho ODBC Driver 17
connection_string = (
    "Driver={ODBC Driver 17 for SQL Server};"
    "Server=db15352.public.databaseasp.net;"
    "Database=db15352;"
    "Uid=db15352;"
    "Pwd=Kb9?2G+cf3W@;"
    "Encrypt=yes;"
    "TrustServerCertificate=yes;"
)

def update_user_type():
    try:
        # Kết nối đến cơ sở dữ liệu
        print("Đang kết nối đến cơ sở dữ liệu...")
        conn = pyodbc.connect(connection_string)
        cursor = conn.cursor()
        print("Kết nối thành công!")
        
        # Hiển thị thông tin người dùng trước khi cập nhật
        print("\nThông tin người dùng trước khi cập nhật:")
        query_select = "SELECT * FROM Users WHERE UserID = 1"
        user_before = pd.read_sql(query_select, conn)
        
        if len(user_before) > 0:
            print(user_before)
            
            # Thực hiện câu lệnh UPDATE
            print("\nĐang cập nhật UserType thành 'Accountant' cho người dùng có id = 1...")
            update_query = "UPDATE Users SET UserType = 'Accountant' WHERE UserID = 1"
            cursor.execute(update_query)
            conn.commit()
            print(f"Cập nhật thành công! Số dòng được cập nhật: {cursor.rowcount}")
            
            # Hiển thị thông tin người dùng sau khi cập nhật
            print("\nThông tin người dùng sau khi cập nhật:")
            user_after = pd.read_sql(query_select, conn)
            print(user_after)
        else:
            print("Không tìm thấy người dùng có id = 1!")
        
        # Đóng kết nối
        cursor.close()
        conn.close()
        print("\nĐã đóng kết nối")
        
    except Exception as e:
        print(f"Lỗi: {str(e)}")

# Hàm để lấy tên chính xác của bảng người dùng và cột UserType
def get_user_table_info():
    try:
        conn = pyodbc.connect(connection_string)
        cursor = conn.cursor()
        
        # Lấy danh sách tất cả các bảng
        cursor.execute("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'")
        tables = [table[0] for table in cursor.fetchall()]
        
        print("Danh sách các bảng trong cơ sở dữ liệu:")
        for i, table in enumerate(tables):
            print(f"{i+1}. {table}")
        
        # Hỏi người dùng chọn bảng
        table_choice = int(input("\nNhập số thứ tự bảng người dùng: ")) - 1
        if 0 <= table_choice < len(tables):
            user_table = tables[table_choice]
            
            # Lấy thông tin cột của bảng đã chọn
            cursor.execute(f"SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '{user_table}'")
            columns = [col[0] for col in cursor.fetchall()]
            
            print(f"\nCác cột trong bảng {user_table}:")
            for i, col in enumerate(columns):
                print(f"{i+1}. {col}")
            
            # Kiểm tra xem có cột ID và UserType không
            id_column = next((col for col in columns if 'ID' in col.upper() or 'Id' in col), None)
            usertype_column = next((col for col in columns if 'TYPE' in col.upper() or 'Role' in col.upper()), None)
            
            return {
                'table': user_table,
                'columns': columns,
                'id_column': id_column,
                'usertype_column': usertype_column
            }
        else:
            print("Lựa chọn không hợp lệ!")
            return None
        
    except Exception as e:
        print(f"Lỗi khi lấy thông tin bảng: {str(e)}")
        return None
    finally:
        if 'conn' in locals():
            conn.close()

# Hàm cập nhật dựa trên thông tin bảng người dùng
def update_user_type_dynamic():
    table_info = get_user_table_info()
    
    if not table_info:
        return
    
    if not table_info['id_column'] or not table_info['usertype_column']:
        print("Không tìm thấy cột ID hoặc UserType/Role!")
        id_col = input("Nhập tên cột ID: ") if not table_info['id_column'] else table_info['id_column']
        type_col = input("Nhập tên cột UserType/Role: ") if not table_info['usertype_column'] else table_info['usertype_column']
    else:
        id_col = table_info['id_column']
        type_col = table_info['usertype_column']
    
    user_id = input("\nNhập ID của người dùng cần cập nhật (mặc định: 1): ") or "1"
    new_type = input("Nhập loại người dùng mới (mặc định: Accountant): ") or "Accountant"
    
    try:
        conn = pyodbc.connect(connection_string)
        cursor = conn.cursor()
        
        # Kiểm tra xem người dùng có tồn tại không
        check_query = f"SELECT * FROM [{table_info['table']}] WHERE [{id_col}] = {user_id}"
        user_before = pd.read_sql(check_query, conn)
        
        if len(user_before) > 0:
            print("\nThông tin người dùng trước khi cập nhật:")
            print(user_before)
            
            # Thực hiện câu lệnh UPDATE
            update_query = f"UPDATE [{table_info['table']}] SET [{type_col}] = '{new_type}' WHERE [{id_col}] = {user_id}"
            print(f"\nCâu lệnh SQL: {update_query}")
            
            confirm = input("\nXác nhận cập nhật? (y/n): ")
            if confirm.lower() == 'y':
                cursor.execute(update_query)
                conn.commit()
                print(f"Cập nhật thành công! Số dòng được cập nhật: {cursor.rowcount}")
                
                # Hiển thị thông tin người dùng sau khi cập nhật
                user_after = pd.read_sql(check_query, conn)
                print("\nThông tin người dùng sau khi cập nhật:")
                print(user_after)
            else:
                print("Đã hủy cập nhật!")
        else:
            print(f"Không tìm thấy người dùng có {id_col} = {user_id}!")
    
    except Exception as e:
        print(f"Lỗi: {str(e)}")
    finally:
        if 'conn' in locals():
            conn.close()
            print("\nĐã đóng kết nối")

# Chạy chương trình
if __name__ == "__main__":
    choice = input("Chọn phương thức cập nhật:\n1. Tự động (mặc định bảng Users)\n2. Tương tác (chọn bảng và cột)\nLựa chọn của bạn (1/2): ")
    
    if choice == "2":
        update_user_type_dynamic()
    else:
        # Phiên bản đơn giản hơn nếu bảng đã biết chính xác là Users và có cột UserType
        print("\nSử dụng phương thức mặc định với bảng Users và cột UserType...")
        update_user_type()
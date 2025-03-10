import pyodbc
import pandas as pd

# Chuỗi kết nối với các giá trị được điều chỉnh cho ODBC Driver 17
connection_string = (
    "Driver={ODBC Driver 17 for SQL Server};"
    "Server=db15352.public.databaseasp.net;"
    "Database=db15352;"
    "Uid=db15352;"  # Thay User Id bằng Uid
    "Pwd=Kb9?2G+cf3W@;"  # Thay Password bằng Pwd
    "Encrypt=yes;"  # Thay True bằng yes
    "TrustServerCertificate=yes;"  # Thay True bằng yes
    "MultipleActiveResultSets=True;"  # Tham số này không quan trọng cho ODBC
)

# Hàm liệt kê tất cả các bảng trong cơ sở dữ liệu
def list_all_tables():
    try:
        # Kết nối đến cơ sở dữ liệu
        print("Đang kết nối đến cơ sở dữ liệu...")
        conn = pyodbc.connect(connection_string)
        print(f"Kết nối thành công!")
        
        # Lấy danh sách tất cả các bảng
        cursor = conn.cursor()
        cursor.execute("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'")
        tables = cursor.fetchall()
        
        print("\nDanh sách các bảng trong cơ sở dữ liệu:")
        if tables:
            for i, table in enumerate(tables):
                print(f"{i+1}. {table[0]}")
        else:
            print("Không tìm thấy bảng nào trong cơ sở dữ liệu.")
        
        # Đóng kết nối
        cursor.close()
        conn.close()
        print("\nĐã đóng kết nối")
        
        return [table[0] for table in tables]
        
    except Exception as e:
        print(f"Lỗi: {str(e)}")
        return []

# Hàm truy vấn tất cả dữ liệu từ một bảng
def query_table(table_name):
    try:
        # Kết nối đến cơ sở dữ liệu
        conn = pyodbc.connect(connection_string)
        
        # Truy vấn dữ liệu
        query = f"SELECT * FROM [{table_name}]"
        
        # Sử dụng pandas để đọc dữ liệu
        df = pd.read_sql(query, conn)
        
        # Hiển thị thông tin về dữ liệu
        print(f"\nThông tin bảng [{table_name}]:")
        print(f"Số lượng bản ghi: {len(df)}")
        print(f"Các cột: {', '.join(df.columns)}")
        
        # Hiển thị dữ liệu
        if len(df) > 0:
            print("\n5 bản ghi đầu tiên:")
            print(df.head())
        else:
            print("\nBảng không có dữ liệu.")
        
        # Đóng kết nối
        conn.close()
        
        return df
    
    except Exception as e:
        print(f"Lỗi khi truy vấn bảng {table_name}: {str(e)}")
        return None

# Chạy chương trình
if __name__ == "__main__":
    tables = list_all_tables()
    
    if tables:
        while True:
            try:
                choice = input("\nNhập số thứ tự bảng bạn muốn xem dữ liệu (hoặc 'q' để thoát): ")
                
                if choice.lower() == 'q':
                    break
                    
                index = int(choice) - 1
                if 0 <= index < len(tables):
                    selected_table = tables[index]
                    df = query_table(selected_table)
                    
                    if df is not None and len(df) > 0:
                        export = input("\nBạn có muốn xuất dữ liệu ra file CSV không? (y/n): ")
                        if export.lower() == 'y':
                            filename = f"{selected_table}.csv"
                            df.to_csv(filename, index=False, encoding='utf-8-sig')
                            print(f"Đã xuất dữ liệu ra file: {filename}")
                else:
                    print("Số thứ tự không hợp lệ!")
            
            except ValueError:
                print("Vui lòng nhập một số hợp lệ!")
            
            except Exception as e:
                print(f"Lỗi: {str(e)}")
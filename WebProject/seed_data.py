import pyodbc
import random
from datetime import datetime, timedelta

# Connection string with explicit driver specification and correct encryption parameters
conn_str = "Driver={ODBC Driver 17 for SQL Server};Server=db15352.public.databaseasp.net;Database=db15352;Uid=db15352;Pwd=Kb9?2G+cf3W@;TrustServerCertificate=yes;Encrypt=yes;"

# Departments to add (Khoa)
departments = [
    {"name": "Khoa CNTT & TT", "code": "CNTT"},
    {"name": "Khoa Quản Trị Và Kinh Doanh", "code": "QTKD"},
    {"name": "Khoa Ngôn Ngữ Hàn", "code": "NNH"},
    {"name": "Khoa Ngôn Ngữ Nhật", "code": "NNN"}
]

# Class name templates for random generation
class_templates = [
    "{code}{year}A", 
    "{code}{year}B", 
    "{code}{year}C",
    "{code}{year}D"
]

# Academic years (2023-2026)
academic_years = ["2023-2024", "2024-2025", "2025-2026"]

# Semester data
semesters = []
for year in academic_years:
    # Fall semester (Học kỳ 1)
    start_year = int(year.split("-")[0])
    semesters.append({
        "name": f"Học kỳ 1 {year}",
        "start_date": datetime(start_year, 8, 15),
        "end_date": datetime(start_year, 12, 31),
        "academic_year": year,
        "is_active": year == "2023-2024"  # Only current year is active
    })
    
    # Spring semester (Học kỳ 2)
    end_year = int(year.split("-")[1])
    semesters.append({
        "name": f"Học kỳ 2 {year}",
        "start_date": datetime(end_year, 1, 15),
        "end_date": datetime(end_year, 5, 31),
        "academic_year": year,
        "is_active": year == "2023-2024"  # Only current year is active
    })

def main():
    try:
        # Print available drivers for debugging
        print("Available ODBC drivers:")
        for driver in pyodbc.drivers():
            print(f"  - {driver}")
            
        # Connect to the database
        print("Attempting to connect with connection string:")
        print(conn_str)
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        
        print("Connected to database successfully")
        
        # Insert departments
        department_ids = {}
        for dept in departments:
            # Check if department already exists
            cursor.execute("SELECT DepartmentID FROM Departments WHERE DepartmentCode = ?", dept["code"])
            result = cursor.fetchone()
            
            if result:
                department_ids[dept["code"]] = result[0]
                print(f"Department {dept['name']} already exists with ID {result[0]}")
            else:
                cursor.execute(
                    "INSERT INTO Departments (DepartmentName, DepartmentCode) VALUES (?, ?)",
                    dept["name"], dept["code"]
                )
                cursor.execute("SELECT @@IDENTITY")
                dept_id = cursor.fetchone()[0]
                department_ids[dept["code"]] = dept_id
                print(f"Added department: {dept['name']} with ID {dept_id}")
        
        # Insert classes for each department
        for dept_code, dept_id in department_ids.items():
            for year in range(2023, 2027):
                year_suffix = str(year)[-2:]  # Get last 2 digits of the year
                
                # Generate 2-3 random classes per department per year
                num_classes = random.randint(2, 4)
                for i in range(num_classes):
                    class_code = f"{dept_code}{year_suffix}{chr(65+i)}"  # e.g., CNTT23A, CNTT23B
                    class_name = f"{departments[list(department_ids.keys()).index(dept_code)]['name']} - Khóa {year} - Lớp {chr(65+i)}"
                    
                    # Check if class already exists
                    cursor.execute("SELECT ClassID FROM Classes WHERE ClassCode = ?", class_code)
                    result = cursor.fetchone()
                    
                    if not result:
                        cursor.execute(
                            "INSERT INTO Classes (ClassName, ClassCode, DepartmentID) VALUES (?, ?, ?)",
                            class_name, class_code, dept_id
                        )
                        print(f"Added class: {class_name} ({class_code})")
        
        # Insert semesters
        for semester in semesters:
            # Check if semester already exists
            cursor.execute("SELECT SemesterID FROM Semesters WHERE SemesterName = ?", semester["name"])
            result = cursor.fetchone()
            
            if not result:
                cursor.execute(
                    """INSERT INTO Semesters 
                        (SemesterName, StartDate, EndDate, AcademicYear, IsActive) 
                       VALUES (?, ?, ?, ?, ?)""",
                    semester["name"], 
                    semester["start_date"], 
                    semester["end_date"], 
                    semester["academic_year"], 
                    semester["is_active"]
                )
                print(f"Added semester: {semester['name']}")
        
        # Commit all changes
        conn.commit()
        print("All data has been inserted successfully!")
        
    except Exception as e:
        print(f"Error: {str(e)}")
    finally:
        if 'conn' in locals():
            conn.close()
            print("Database connection closed")

if __name__ == "__main__":
    main() 
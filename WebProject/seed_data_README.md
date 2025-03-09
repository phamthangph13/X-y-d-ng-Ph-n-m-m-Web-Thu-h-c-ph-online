# Database Seeding Script

This Python script seeds your SQL Server database with departments, classes, and academic semesters for the Online Fee Payment System.

## Data Included

1. **Departments (Khoa):**
   - Khoa CNTT & TT
   - Khoa Quản Trị Và Kinh Doanh
   - Khoa Ngôn Ngữ Hàn
   - Khoa Ngôn Ngữ Nhật

2. **Classes (Lớp):**
   - Randomly generated classes for each department and academic year
   - Format: [Department Code][Year][Section], e.g., CNTT23A, QTKD24B

3. **Semesters (Học kỳ):**
   - Academic years: 2023-2024, 2024-2025, 2025-2026
   - Two semesters per academic year (Fall and Spring)

## Requirements

- Python 3.7 or higher
- The pyodbc package

## Setup

1. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```

2. Ensure you have the Microsoft ODBC Driver for SQL Server installed on your system.
   - For Windows, it's often installed with SQL Server Management Studio.
   - For other platforms, follow the Microsoft documentation.

## Running the Script

1. Make sure your database server is accessible.

2. Run the script:
   ```
   python seed_data.py
   ```

3. The script will:
   - Check if data already exists before inserting
   - Print progress information as it runs
   - Handle errors appropriately

## Notes

- The connection string is hardcoded in the script using the values from your appsettings.json file.
- This script is idempotent - you can run it multiple times without creating duplicate data.
- Any exceptions will be caught and displayed. 
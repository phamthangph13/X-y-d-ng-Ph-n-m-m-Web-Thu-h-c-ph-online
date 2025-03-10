import pyodbc
import datetime
import random
from decimal import Decimal

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

    # Check if User with ID 1 exists, if not create one
    # Enable IDENTITY_INSERT for Users table
    cursor.execute("IF NOT EXISTS (SELECT 1 FROM Users WHERE UserID = 1) BEGIN SET IDENTITY_INSERT Users ON; INSERT INTO Users (UserID, Email, Password, FullName, PhoneNumber, UserType, IsActive, RegistrationDate, LastLogin) VALUES (1, 'student1@example.com', 'hashed_password', 'John Smith', '0987654321', 'Student', 1, GETDATE(), GETDATE()); SET IDENTITY_INSERT Users OFF; END")
    
    # Check if Student with UserID 1 exists, if not create one
    cursor.execute("""
    IF NOT EXISTS (SELECT 1 FROM Students WHERE UserID = 1)
    BEGIN
        -- First ensure Department and Class exist
        IF NOT EXISTS (SELECT 1 FROM Departments WHERE DepartmentID = 1)
        BEGIN
            SET IDENTITY_INSERT Departments ON;
            INSERT INTO Departments (DepartmentID, DepartmentName, DepartmentCode) 
            VALUES (1, 'Computer Science', 'CS');
            SET IDENTITY_INSERT Departments OFF;
        END
        
        IF NOT EXISTS (SELECT 1 FROM Classes WHERE ClassID = 1)
        BEGIN
            SET IDENTITY_INSERT Classes ON;
            INSERT INTO Classes (ClassID, ClassName, ClassCode, DepartmentID) 
            VALUES (1, 'CS2023A', 'CS23A', 1);
            SET IDENTITY_INSERT Classes OFF;
        END
        
        SET IDENTITY_INSERT Students ON;
        INSERT INTO Students (StudentID, UserID, StudentCode, DepartmentID, ClassID, EnrollmentYear, CurrentSemester) 
        VALUES (1, 1, 'ST001', 1, 1, 2023, 2);
        SET IDENTITY_INSERT Students OFF;
    END
    """)
    
    # Ensure Semester exists
    cursor.execute("""
    IF NOT EXISTS (SELECT 1 FROM Semesters WHERE SemesterID = 1)
    BEGIN
        SET IDENTITY_INSERT Semesters ON;
        INSERT INTO Semesters (SemesterID, SemesterName, StartDate, EndDate, AcademicYear, IsActive)
        VALUES (1, 'Spring 2023', '2023-01-15', '2023-05-30', '2022-2023', 1);
        SET IDENTITY_INSERT Semesters OFF;
    END
    """)
    
    # Ensure Fee Categories exist
    fee_categories = [
        (1, 'Tuition Fee', 'Regular course tuition fees', 1),
        (2, 'Library Fee', 'Access to library resources', 1),
        (3, 'Laboratory Fee', 'Use of laboratory facilities', 1),
        (4, 'Student Activities', 'Student clubs and events', 1)
    ]
    
    # Enable IDENTITY_INSERT for FeeCategories table
    cursor.execute("SET IDENTITY_INSERT FeeCategories ON")
    
    for category in fee_categories:
        cursor.execute(f"""
        IF NOT EXISTS (SELECT 1 FROM FeeCategories WHERE FeeCategoryID = {category[0]})
        BEGIN
            INSERT INTO FeeCategories (FeeCategoryID, CategoryName, Description, IsActive)
            VALUES ({category[0]}, '{category[1]}', '{category[2]}', {category[3]})
        END
        """)
    
    # Disable IDENTITY_INSERT for FeeCategories table
    cursor.execute("SET IDENTITY_INSERT FeeCategories OFF")
    
    # Ensure Fee Structure exists
    fee_structures = [
        (1, 1, 1, 1, 5000000, 1),  # Tuition fee per credit
        (2, 1, 1, 2, 500000, 0),   # Library fee (fixed)
        (3, 1, 1, 3, 1000000, 0),  # Laboratory fee (fixed)
        (4, 1, 1, 4, 300000, 0)    # Student activities fee (fixed)
    ]
    
    # Enable IDENTITY_INSERT for FeeStructures table (changed from FeeStructure to FeeStructures)
    cursor.execute("SET IDENTITY_INSERT FeeStructures ON")
    
    for struct in fee_structures:
        cursor.execute(f"""
        IF NOT EXISTS (SELECT 1 FROM FeeStructures WHERE DepartmentID = {struct[1]} AND SemesterID = {struct[2]} AND FeeCategoryID = {struct[3]})
        BEGIN
            INSERT INTO FeeStructures (FeeStructureID, DepartmentID, SemesterID, FeeCategoryID, Amount, PerCredit, CreatedDate, LastUpdated)
            VALUES ({struct[0]}, {struct[1]}, {struct[2]}, {struct[3]}, {struct[4]}, {struct[5]}, GETDATE(), GETDATE())
        END
        """)
    
    # Disable IDENTITY_INSERT for FeeStructures table
    cursor.execute("SET IDENTITY_INSERT FeeStructures OFF")
    
    # Create some courses
    courses = [
        (1, 'CS101', 'Introduction to Programming', 3, 1),
        (2, 'CS102', 'Data Structures', 4, 1),
        (3, 'CS201', 'Database Systems', 3, 1),
        (4, 'CS202', 'Web Development', 3, 1)
    ]
    
    # Enable IDENTITY_INSERT for Courses table
    cursor.execute("SET IDENTITY_INSERT Courses ON")
    
    for course in courses:
        cursor.execute(f"""
        IF NOT EXISTS (SELECT 1 FROM Courses WHERE CourseID = {course[0]})
        BEGIN
            INSERT INTO Courses (CourseID, CourseCode, CourseName, Credits, DepartmentID, IsActive)
            VALUES ({course[0]}, '{course[1]}', '{course[2]}', {course[3]}, {course[4]}, 1)
        END
        """)
    
    # Disable IDENTITY_INSERT for Courses table
    cursor.execute("SET IDENTITY_INSERT Courses OFF")
    
    # Register student for courses
    student_courses = [
        (1, 1, 1, 1),
        (2, 1, 2, 1),
        (3, 1, 3, 1),
        (4, 1, 4, 1)
    ]
    
    # Enable IDENTITY_INSERT for StudentCourses table
    cursor.execute("SET IDENTITY_INSERT StudentCourses ON")
    
    for i, sc in enumerate(student_courses, 1):
        cursor.execute(f"""
        IF NOT EXISTS (SELECT 1 FROM StudentCourses WHERE StudentID = {sc[1]} AND CourseID = {sc[2]} AND SemesterID = {sc[3]})
        BEGIN
            INSERT INTO StudentCourses (StudentCourseID, StudentID, CourseID, SemesterID, RegistrationDate)
            VALUES ({i}, {sc[1]}, {sc[2]}, {sc[3]}, GETDATE())
        END
        """)
    
    # Disable IDENTITY_INSERT for StudentCourses table
    cursor.execute("SET IDENTITY_INSERT StudentCourses OFF")
    
    # Calculate total credits
    cursor.execute("""
    SELECT SUM(c.Credits) 
    FROM StudentCourses sc
    JOIN Courses c ON sc.CourseID = c.CourseID
    WHERE sc.StudentID = 1 AND sc.SemesterID = 1
    """)
    total_credits = cursor.fetchone()[0] or 0
    
    # Calculate total fee amount
    # Tuition fee (per credit) + fixed fees
    tuition_per_credit = 5000000  # From fee structure
    total_tuition = tuition_per_credit * total_credits
    fixed_fees = 500000 + 1000000 + 300000  # Library + Lab + Activities
    total_fee_amount = total_tuition + fixed_fees
    
    # Create Student Fee record
    due_date = datetime.datetime.now() + datetime.timedelta(days=30)
    
    # Enable IDENTITY_INSERT for StudentFees table
    cursor.execute("SET IDENTITY_INSERT StudentFees ON")
    
    cursor.execute(f"""
    IF NOT EXISTS (SELECT 1 FROM StudentFees WHERE StudentID = 1 AND SemesterID = 1)
    BEGIN
        INSERT INTO StudentFees (StudentFeeID, StudentID, SemesterID, TotalAmount, DueDate, Status, CreatedDate, LastUpdated)
        VALUES (1, 1, 1, {total_fee_amount}, '{due_date.strftime('%Y-%m-%d')}', 'Unpaid', GETDATE(), GETDATE())
    END
    """)
    
    # Disable IDENTITY_INSERT for StudentFees table
    cursor.execute("SET IDENTITY_INSERT StudentFees OFF")
    
    # Create Student Fee Details
    fee_details = [
        (1, 1, 1, total_tuition),  # Tuition
        (2, 1, 2, 500000),         # Library
        (3, 1, 3, 1000000),        # Laboratory
        (4, 1, 4, 300000)          # Student Activities
    ]
    
    # Enable IDENTITY_INSERT for StudentFeeDetails table
    cursor.execute("SET IDENTITY_INSERT StudentFeeDetails ON")
    
    for detail in fee_details:
        cursor.execute(f"""
        IF NOT EXISTS (SELECT 1 FROM StudentFeeDetails WHERE StudentFeeDetailID = {detail[0]})
        BEGIN
            INSERT INTO StudentFeeDetails (StudentFeeDetailID, StudentFeeID, FeeCategoryID, Amount)
            VALUES ({detail[0]}, {detail[1]}, {detail[2]}, {detail[3]})
        END
        """)
    
    # Disable IDENTITY_INSERT for StudentFeeDetails table
    cursor.execute("SET IDENTITY_INSERT StudentFeeDetails OFF")
    
    # Create Payment Methods
    payment_methods = [
        (1, 'Credit Card', 'Payment via credit card'),
        (2, 'Bank Transfer', 'Payment via bank transfer'),
        (3, 'Cash', 'Payment in cash at the cashier')
    ]
    
    # Enable IDENTITY_INSERT for PaymentMethods table
    cursor.execute("SET IDENTITY_INSERT PaymentMethods ON")
    
    for method in payment_methods:
        cursor.execute(f"""
        IF NOT EXISTS (SELECT 1 FROM PaymentMethods WHERE PaymentMethodID = {method[0]})
        BEGIN
            INSERT INTO PaymentMethods (PaymentMethodID, MethodName, Description, IsActive)
            VALUES ({method[0]}, '{method[1]}', '{method[2]}', 1)
        END
        """)
    
    # Disable IDENTITY_INSERT for PaymentMethods table
    cursor.execute("SET IDENTITY_INSERT PaymentMethods OFF")
    
    # Create a partial payment (50% of the total)
    payment_amount = total_fee_amount * 0.5
    transaction_id = f"TRX{random.randint(100000, 999999)}"
    payment_date = datetime.datetime.now() - datetime.timedelta(days=7)
    
    # Enable IDENTITY_INSERT for Payments table
    cursor.execute("SET IDENTITY_INSERT Payments ON")
    
    cursor.execute(f"""
    IF NOT EXISTS (SELECT 1 FROM Payments WHERE PaymentID = 1)
    BEGIN
        INSERT INTO Payments (PaymentID, StudentFeeID, PaymentMethodID, Amount, TransactionID, PaymentDate, Status, PaymentReference)
        VALUES (1, 1, 2, {payment_amount}, '{transaction_id}', '{payment_date.strftime('%Y-%m-%d')}', 'Success', 'First payment')
    END
    """)
    
    # Disable IDENTITY_INSERT for Payments table
    cursor.execute("SET IDENTITY_INSERT Payments OFF")
    
    # Update StudentFees status to reflect partial payment
    cursor.execute("""
    UPDATE StudentFees 
    SET Status = 'Partially Paid', LastUpdated = GETDATE()
    WHERE StudentFeeID = 1
    """)
    
    # Create an invoice for the payment
    invoice_number = f"INV{random.randint(1000, 9999)}"
    invoice_date = payment_date
    
    # Enable IDENTITY_INSERT for Invoices table
    cursor.execute("SET IDENTITY_INSERT Invoices ON")
    
    cursor.execute(f"""
    IF NOT EXISTS (SELECT 1 FROM Invoices WHERE InvoiceID = 1)
    BEGIN
        INSERT INTO Invoices (InvoiceID, PaymentID, InvoiceNumber, InvoiceDate, InvoicePath, SentToEmail)
        VALUES (1, 1, '{invoice_number}', '{invoice_date.strftime('%Y-%m-%d')}', '/invoices/{invoice_number}.pdf', 1)
    END
    """)
    
    # Disable IDENTITY_INSERT for Invoices table
    cursor.execute("SET IDENTITY_INSERT Invoices OFF")
    
    # Add a notification for the payment
    # Enable IDENTITY_INSERT for Notifications table
    cursor.execute("SET IDENTITY_INSERT Notifications ON")
    
    cursor.execute(f"""
    IF NOT EXISTS (SELECT 1 FROM Notifications WHERE NotificationID = 1)
    BEGIN
        INSERT INTO Notifications (NotificationID, UserID, Title, Message, NotificationType, SentDate, IsRead)
        VALUES (1, 1, 'Payment Received', 'We have received your payment of {payment_amount} VND for the Spring 2023 semester.', 'Email', '{payment_date.strftime('%Y-%m-%d')}', 0)
    END
    """)
    
    # Disable IDENTITY_INSERT for Notifications table
    cursor.execute("SET IDENTITY_INSERT Notifications OFF")
    
    # Commit all changes
    conn.commit()
    print("Example data for User ID 1 has been generated successfully.")
    
    # Print a summary of the data created
    print("\nSummary of Generated Data:")
    print("--------------------------")
    
    cursor.execute("SELECT FullName FROM Users WHERE UserID = 1")
    user = cursor.fetchone()
    print(f"User: {user[0]}")
    
    cursor.execute("SELECT StudentCode FROM Students WHERE UserID = 1")
    student = cursor.fetchone()
    print(f"Student Code: {student[0]}")
    
    cursor.execute("SELECT SemesterName FROM Semesters WHERE SemesterID = 1")
    semester = cursor.fetchone()
    print(f"Semester: {semester[0]}")
    
    print(f"Total Fee Amount: {total_fee_amount} VND")
    print(f"Payment Made: {payment_amount} VND")
    print(f"Payment Status: Partially Paid")
    print(f"Invoice Number: {invoice_number}")
    
    print("\nFee Breakdown:")
    for detail in fee_details:
        cursor.execute(f"SELECT CategoryName FROM FeeCategories WHERE FeeCategoryID = {detail[2]}")
        category = cursor.fetchone()
        print(f"  - {category[0]}: {detail[3]} VND")
    
    print("\nRegistered Courses:")
    for sc in student_courses:
        cursor.execute(f"SELECT CourseName, Credits FROM Courses WHERE CourseID = {sc[2]}")
        course = cursor.fetchone()
        print(f"  - {course[0]} ({course[1]} credits)")

except pyodbc.Error as e:
    print(f"Database Error: {e}")
except Exception as e:
    print(f"Error: {e}")
finally:
    if 'conn' in locals():
        conn.close()
        print("Database connection closed.") 
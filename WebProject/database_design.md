-- Users Table (Base table for all user types)
CREATE TABLE Users (
    UserID INT PRIMARY KEY IDENTITY(1,1),
    Email VARCHAR(100) NOT NULL UNIQUE,
    Password VARCHAR(255) NOT NULL,
    FullName NVARCHAR(100) NOT NULL,
    PhoneNumber VARCHAR(20),
    UserType VARCHAR(20) NOT NULL, -- 'Student', 'Admin', 'Accountant'
    IsActive BIT DEFAULT 1,
    RegistrationDate DATETIME DEFAULT GETDATE(),
    LastLogin DATETIME NULL
);

-- Students Table
CREATE TABLE Students (
    StudentID INT PRIMARY KEY IDENTITY(1,1),
    UserID INT UNIQUE NOT NULL,
    StudentCode VARCHAR(20) NOT NULL UNIQUE,
    DepartmentID INT NOT NULL,
    ClassID INT NOT NULL,
    EnrollmentYear INT NOT NULL,
    CurrentSemester INT,
    FOREIGN KEY (UserID) REFERENCES Users(UserID)
);

-- Departments Table
CREATE TABLE Departments (
    DepartmentID INT PRIMARY KEY IDENTITY(1,1),
    DepartmentName NVARCHAR(100) NOT NULL,
    DepartmentCode VARCHAR(20) NOT NULL UNIQUE
);

-- Classes Table
CREATE TABLE Classes (
    ClassID INT PRIMARY KEY IDENTITY(1,1),
    ClassName NVARCHAR(100) NOT NULL,
    ClassCode VARCHAR(20) NOT NULL UNIQUE,
    DepartmentID INT NOT NULL,
    FOREIGN KEY (DepartmentID) REFERENCES Departments(DepartmentID)
);

-- Courses Table
CREATE TABLE Courses (
    CourseID INT PRIMARY KEY IDENTITY(1,1),
    CourseCode VARCHAR(20) NOT NULL UNIQUE,
    CourseName NVARCHAR(100) NOT NULL,
    Credits INT NOT NULL,
    DepartmentID INT NOT NULL,
    Description NVARCHAR(500),
    IsActive BIT DEFAULT 1,
    FOREIGN KEY (DepartmentID) REFERENCES Departments(DepartmentID)
);

-- Semesters Table
CREATE TABLE Semesters (
    SemesterID INT PRIMARY KEY IDENTITY(1,1),
    SemesterName NVARCHAR(100) NOT NULL,
    StartDate DATE NOT NULL,
    EndDate DATE NOT NULL,
    AcademicYear VARCHAR(20) NOT NULL,
    IsActive BIT DEFAULT 1
);

-- Student Courses (Registration)
CREATE TABLE StudentCourses (
    StudentCourseID INT PRIMARY KEY IDENTITY(1,1),
    StudentID INT NOT NULL,
    CourseID INT NOT NULL,
    SemesterID INT NOT NULL,
    RegistrationDate DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (StudentID) REFERENCES Students(StudentID),
    FOREIGN KEY (CourseID) REFERENCES Courses(CourseID),
    FOREIGN KEY (SemesterID) REFERENCES Semesters(SemesterID),
    CONSTRAINT UC_StudentCourse UNIQUE (StudentID, CourseID, SemesterID)
);

-- Fee Categories Table
CREATE TABLE FeeCategories (
    FeeCategoryID INT PRIMARY KEY IDENTITY(1,1),
    CategoryName NVARCHAR(100) NOT NULL,
    Description NVARCHAR(255),
    IsActive BIT DEFAULT 1
);

-- Fee Structure Table
CREATE TABLE FeeStructure (
    FeeStructureID INT PRIMARY KEY IDENTITY(1,1),
    DepartmentID INT NOT NULL,
    SemesterID INT NOT NULL,
    FeeCategoryID INT NOT NULL,
    Amount DECIMAL(10, 2) NOT NULL,
    PerCredit BIT DEFAULT 0, -- If true, amount is per credit
    CreatedDate DATETIME DEFAULT GETDATE(),
    LastUpdated DATETIME,
    FOREIGN KEY (DepartmentID) REFERENCES Departments(DepartmentID),
    FOREIGN KEY (SemesterID) REFERENCES Semesters(SemesterID),
    FOREIGN KEY (FeeCategoryID) REFERENCES FeeCategories(FeeCategoryID),
    CONSTRAINT UC_FeeStructure UNIQUE (DepartmentID, SemesterID, FeeCategoryID)
);

-- Student Fee Table
CREATE TABLE StudentFees (
    StudentFeeID INT PRIMARY KEY IDENTITY(1,1),
    StudentID INT NOT NULL,
    SemesterID INT NOT NULL,
    TotalAmount DECIMAL(10, 2) NOT NULL,
    DueDate DATE NOT NULL,
    Status VARCHAR(20) DEFAULT 'Unpaid', -- 'Unpaid', 'Paid', 'Overdue'
    CreatedDate DATETIME DEFAULT GETDATE(),
    LastUpdated DATETIME,
    FOREIGN KEY (StudentID) REFERENCES Students(StudentID),
    FOREIGN KEY (SemesterID) REFERENCES Semesters(SemesterID),
    CONSTRAINT UC_StudentFee UNIQUE (StudentID, SemesterID)
);

-- Student Fee Details Table
CREATE TABLE StudentFeeDetails (
    StudentFeeDetailID INT PRIMARY KEY IDENTITY(1,1),
    StudentFeeID INT NOT NULL,
    FeeCategoryID INT NOT NULL,
    Amount DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (StudentFeeID) REFERENCES StudentFees(StudentFeeID),
    FOREIGN KEY (FeeCategoryID) REFERENCES FeeCategories(FeeCategoryID)
);

-- Payment Methods Table
CREATE TABLE PaymentMethods (
    PaymentMethodID INT PRIMARY KEY IDENTITY(1,1),
    MethodName VARCHAR(50) NOT NULL,
    Description NVARCHAR(255),
    IsActive BIT DEFAULT 1
);

-- Payments Table
CREATE TABLE Payments (
    PaymentID INT PRIMARY KEY IDENTITY(1,1),
    StudentFeeID INT NOT NULL,
    PaymentMethodID INT NOT NULL,
    Amount DECIMAL(10, 2) NOT NULL,
    TransactionID VARCHAR(100),
    PaymentDate DATETIME DEFAULT GETDATE(),
    Status VARCHAR(50) NOT NULL, -- 'Success', 'Failed', 'Pending'
    PaymentReference VARCHAR(255),
    FOREIGN KEY (StudentFeeID) REFERENCES StudentFees(StudentFeeID),
    FOREIGN KEY (PaymentMethodID) REFERENCES PaymentMethods(PaymentMethodID)
);

-- Invoices Table
CREATE TABLE Invoices (
    InvoiceID INT PRIMARY KEY IDENTITY(1,1),
    PaymentID INT NOT NULL,
    InvoiceNumber VARCHAR(50) NOT NULL UNIQUE,
    InvoiceDate DATETIME DEFAULT GETDATE(),
    InvoicePath VARCHAR(255), -- Path to stored PDF
    SentToEmail BIT DEFAULT 0,
    FOREIGN KEY (PaymentID) REFERENCES Payments(PaymentID)
);

-- Notifications Table
CREATE TABLE Notifications (
    NotificationID INT PRIMARY KEY IDENTITY(1,1),
    UserID INT NOT NULL,
    Title NVARCHAR(100) NOT NULL,
    Message NVARCHAR(500) NOT NULL,
    NotificationType VARCHAR(50), -- 'Email', 'SMS', 'System'
    SentDate DATETIME DEFAULT GETDATE(),
    IsRead BIT DEFAULT 0,
    FOREIGN KEY (UserID) REFERENCES Users(UserID)
);

-- Login History Table
CREATE TABLE LoginHistory (
    LoginHistoryID INT PRIMARY KEY IDENTITY(1,1),
    UserID INT NOT NULL,
    LoginTime DATETIME DEFAULT GETDATE(),
    LogoutTime DATETIME NULL,
    IPAddress VARCHAR(50),
    DeviceInfo NVARCHAR(255),
    FOREIGN KEY (UserID) REFERENCES Users(UserID)
);

-- External Authentication Table
CREATE TABLE ExternalAuthentication (
    ExternalAuthID INT PRIMARY KEY IDENTITY(1,1),
    UserID INT NOT NULL,
    Provider VARCHAR(50) NOT NULL, -- 'Google', 'Facebook'
    ProviderUserID VARCHAR(100) NOT NULL,
    FOREIGN KEY (UserID) REFERENCES Users(UserID),
    CONSTRAINT UC_ExternalAuth UNIQUE (Provider, ProviderUserID)
);

-- System Settings Table
CREATE TABLE SystemSettings (
    SettingID INT PRIMARY KEY IDENTITY(1,1),
    SettingName VARCHAR(100) NOT NULL UNIQUE,
    SettingValue NVARCHAR(MAX),
    Description NVARCHAR(255),
    LastUpdated DATETIME DEFAULT GETDATE()
);
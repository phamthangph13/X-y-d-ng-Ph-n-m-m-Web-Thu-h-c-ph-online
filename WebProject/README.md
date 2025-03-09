# Online Fee Payment System Database Structure

This document provides an overview of the database structure for the Online Fee Payment System. The system allows students to register for courses, calculates their tuition fees, and enables them to make payments online.

## Table of Contents

- [Users](#users)
- [Students](#students)
- [Departments](#departments)
- [Classes](#classes)
- [Courses](#courses)
- [Semesters](#semesters)
- [Student Courses](#student-courses)
- [Fee Categories](#fee-categories)
- [Fee Structure](#fee-structure)
- [Student Fees](#student-fees)
- [Student Fee Details](#student-fee-details)
- [Payment Methods](#payment-methods)
- [Payments](#payments)
- [Invoices](#invoices)
- [Notifications](#notifications)
- [Login History](#login-history)
- [External Authentication](#external-authentication)
- [System Settings](#system-settings)
- [Entity Relationships](#entity-relationships)

## Users

The `Users` table stores information about all users in the system, including students, administrators, and accountants.

| Field | Type | Description |
| ----- | ---- | ----------- |
| UserID | int | Primary key |
| Email | string | User's email address (unique) |
| Password | string | Hashed password |
| FullName | string | User's full name |
| PhoneNumber | string | User's phone number (optional) |
| UserType | string | 'Student', 'Admin', or 'Accountant' |
| IsActive | bool | Whether the user's account is active |
| RegistrationDate | DateTime | When the user registered |
| LastLogin | DateTime | Last time the user logged in |

## Students

The `Students` table stores additional information about users who are students.

| Field | Type | Description |
| ----- | ---- | ----------- |
| StudentID | int | Primary key |
| UserID | int | Foreign key to Users table |
| StudentCode | string | Unique student code |
| DepartmentID | int | Student's department |
| ClassID | int | Student's class |
| EnrollmentYear | int | Year of enrollment |
| CurrentSemester | int | Current semester (optional) |

## Departments

The `Departments` table stores information about academic departments.

| Field | Type | Description |
| ----- | ---- | ----------- |
| DepartmentID | int | Primary key |
| DepartmentName | string | Name of the department |
| DepartmentCode | string | Unique department code |

## Classes

The `Classes` table stores information about student classes within departments.

| Field | Type | Description |
| ----- | ---- | ----------- |
| ClassID | int | Primary key |
| ClassName | string | Name of the class |
| ClassCode | string | Unique class code |
| DepartmentID | int | Department the class belongs to |

## Courses

The `Courses` table stores information about academic courses.

| Field | Type | Description |
| ----- | ---- | ----------- |
| CourseID | int | Primary key |
| CourseCode | string | Unique course code |
| CourseName | string | Name of the course |
| Credits | int | Number of credits for the course |
| DepartmentID | int | Department offering the course |
| Description | string | Course description (optional) |
| IsActive | bool | Whether the course is active |

## Semesters

The `Semesters` table stores information about academic semesters.

| Field | Type | Description |
| ----- | ---- | ----------- |
| SemesterID | int | Primary key |
| SemesterName | string | Name of the semester |
| StartDate | DateTime | Start date of the semester |
| EndDate | DateTime | End date of the semester |
| AcademicYear | string | Academic year (e.g., "2023-2024") |
| IsActive | bool | Whether the semester is active |

## Student Courses

The `StudentCourses` table manages the many-to-many relationship between students and courses, representing course registration.

| Field | Type | Description |
| ----- | ---- | ----------- |
| StudentCourseID | int | Primary key |
| StudentID | int | Foreign key to Students table |
| CourseID | int | Foreign key to Courses table |
| SemesterID | int | Foreign key to Semesters table |
| RegistrationDate | DateTime | When the student registered for the course |

## Fee Categories

The `FeeCategories` table stores different types of fees (e.g., tuition, library, laboratory).

| Field | Type | Description |
| ----- | ---- | ----------- |
| FeeCategoryID | int | Primary key |
| CategoryName | string | Name of the fee category |
| Description | string | Description of the fee category (optional) |
| IsActive | bool | Whether the fee category is active |

## Fee Structure

The `FeeStructure` table defines fee amounts for each department and semester.

| Field | Type | Description |
| ----- | ---- | ----------- |
| FeeStructureID | int | Primary key |
| DepartmentID | int | Foreign key to Departments table |
| SemesterID | int | Foreign key to Semesters table |
| FeeCategoryID | int | Foreign key to FeeCategories table |
| Amount | decimal | Fee amount |
| PerCredit | bool | Whether the fee is charged per credit |
| CreatedDate | DateTime | When the fee structure was created |
| LastUpdated | DateTime | When the fee structure was last updated |

## Student Fees

The `StudentFees` table stores fee information for each student for a specific semester.

| Field | Type | Description |
| ----- | ---- | ----------- |
| StudentFeeID | int | Primary key |
| StudentID | int | Foreign key to Students table |
| SemesterID | int | Foreign key to Semesters table |
| TotalAmount | decimal | Total fee amount |
| DueDate | DateTime | Payment due date |
| Status | string | 'Unpaid', 'Paid', or 'Overdue' |
| CreatedDate | DateTime | When the fee was created |
| LastUpdated | DateTime | When the fee was last updated |

## Student Fee Details

The `StudentFeeDetails` table breaks down the total fee into specific fee categories for each student.

| Field | Type | Description |
| ----- | ---- | ----------- |
| StudentFeeDetailID | int | Primary key |
| StudentFeeID | int | Foreign key to StudentFees table |
| FeeCategoryID | int | Foreign key to FeeCategories table |
| Amount | decimal | Fee amount for this category |

## Payment Methods

The `PaymentMethods` table stores available payment methods (e.g., credit card, bank transfer).

| Field | Type | Description |
| ----- | ---- | ----------- |
| PaymentMethodID | int | Primary key |
| MethodName | string | Name of the payment method |
| Description | string | Description of the payment method (optional) |
| IsActive | bool | Whether the payment method is active |

## Payments

The `Payments` table stores payment transactions.

| Field | Type | Description |
| ----- | ---- | ----------- |
| PaymentID | int | Primary key |
| StudentFeeID | int | Foreign key to StudentFees table |
| PaymentMethodID | int | Foreign key to PaymentMethods table |
| Amount | decimal | Payment amount |
| TransactionID | string | External transaction ID (optional) |
| PaymentDate | DateTime | When the payment was made |
| Status | string | 'Success', 'Failed', or 'Pending' |
| PaymentReference | string | Additional payment reference (optional) |

## Invoices

The `Invoices` table stores invoice information for payments.

| Field | Type | Description |
| ----- | ---- | ----------- |
| InvoiceID | int | Primary key |
| PaymentID | int | Foreign key to Payments table |
| InvoiceNumber | string | Unique invoice number |
| InvoiceDate | DateTime | When the invoice was generated |
| InvoicePath | string | Path to the stored PDF (optional) |
| SentToEmail | bool | Whether the invoice was sent via email |

## Notifications

The `Notifications` table stores notifications sent to users.

| Field | Type | Description |
| ----- | ---- | ----------- |
| NotificationID | int | Primary key |
| UserID | int | Foreign key to Users table |
| Title | string | Notification title |
| Message | string | Notification message |
| NotificationType | string | 'Email', 'SMS', or 'System' (optional) |
| SentDate | DateTime | When the notification was sent |
| IsRead | bool | Whether the notification has been read |

## Login History

The `LoginHistory` table tracks user login sessions.

| Field | Type | Description |
| ----- | ---- | ----------- |
| LoginHistoryID | int | Primary key |
| UserID | int | Foreign key to Users table |
| LoginTime | DateTime | When the user logged in |
| LogoutTime | DateTime | When the user logged out (optional) |
| IPAddress | string | IP address of the user (optional) |
| DeviceInfo | string | Information about the user's device (optional) |

## External Authentication

The `ExternalAuthentication` table stores information about users who sign in using third-party providers.

| Field | Type | Description |
| ----- | ---- | ----------- |
| ExternalAuthID | int | Primary key |
| UserID | int | Foreign key to Users table |
| Provider | string | Authentication provider (e.g., 'Google', 'Facebook') |
| ProviderUserID | string | User ID from the external provider |

## System Settings

The `SystemSettings` table stores application settings.

| Field | Type | Description |
| ----- | ---- | ----------- |
| SettingID | int | Primary key |
| SettingName | string | Name of the setting |
| SettingValue | string | Value of the setting (optional) |
| Description | string | Description of the setting (optional) |
| LastUpdated | DateTime | When the setting was last updated |

## Entity Relationships

### One-to-One Relationships
- Each Student is associated with exactly one User (through UserID)

### One-to-Many Relationships
- Each Department can have multiple Classes
- Each Department can have multiple Students
- Each Department can have multiple Courses
- Each Class can have multiple Students
- Each Course can be taken by multiple Students (through StudentCourses)
- Each Semester can have multiple StudentCourses
- Each Semester can have multiple StudentFees
- Each Student can have multiple StudentCourses
- Each Student can have multiple StudentFees
- Each User can have multiple Notifications
- Each User can have multiple LoginHistory records
- Each User can have multiple ExternalAuthentication records
- Each StudentFee can have multiple StudentFeeDetails
- Each StudentFee can have multiple Payments
- Each Payment can have multiple Invoices
- Each PaymentMethod can be used for multiple Payments
- Each FeeCategory can be used in multiple FeeStructures
- Each FeeCategory can be used in multiple StudentFeeDetails

### Composite Unique Constraints
- StudentCourses: A student cannot register for the same course in the same semester more than once (StudentID, CourseID, SemesterID)
- FeeStructure: There cannot be duplicate fee structures for the same department, semester, and fee category (DepartmentID, SemesterID, FeeCategoryID)
- StudentFees: A student cannot have multiple fee records for the same semester (StudentID, SemesterID)
- ExternalAuthentication: A user cannot have multiple authentication records for the same provider and provider user ID (Provider, ProviderUserID)

## Database Configuration Notes

- Cascade delete behavior has been restricted where appropriate to prevent unintended data loss
- Unique constraints are enforced for fields like Email, StudentCode, CourseCode, etc.
- Foreign key relationships ensure referential integrity throughout the database 
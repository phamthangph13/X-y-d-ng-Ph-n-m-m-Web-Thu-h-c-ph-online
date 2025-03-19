-- Thêm dữ liệu cho bảng Semesters
INSERT INTO Semesters (SemesterName, StartDate, EndDate, AcademicYear, IsActive)
VALUES 
('Học kỳ 1 - 2023-2024', '2023-09-01', '2024-01-31', '2023-2024', 1),
('Học kỳ 2 - 2023-2024', '2024-02-01', '2024-06-30', '2023-2024', 1),
('Học kỳ Hè - 2024', '2024-07-01', '2024-08-31', '2023-2024', 1),
('Học kỳ 1 - 2024-2025', '2024-09-01', '2025-01-31', '2024-2025', 1);

-- Nếu muốn kiểm tra dữ liệu đã thêm
-- SELECT * FROM Semesters; 
-- Thêm dữ liệu mẫu cho bảng PaymentMethods
INSERT INTO PaymentMethods (MethodName, Description, IsActive)
VALUES 
('Tiền mặt', 'Thanh toán bằng tiền mặt tại quầy thu ngân', 1),
('Chuyển khoản ngân hàng', 'Chuyển khoản qua tài khoản ngân hàng của trường', 1),
('Ví điện tử MoMo', 'Thanh toán qua ví điện tử MoMo', 1),
('Ví điện tử ZaloPay', 'Thanh toán qua ví điện tử ZaloPay', 1),
('Thẻ tín dụng/ghi nợ', 'Thanh toán qua thẻ tín dụng hoặc thẻ ghi nợ', 1);

-- Kiểm tra dữ liệu đã thêm
SELECT * FROM PaymentMethods; 
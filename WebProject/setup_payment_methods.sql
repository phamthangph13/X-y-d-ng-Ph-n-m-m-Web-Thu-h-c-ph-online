-- Add sample data to the PaymentMethods table  
INSERT INTO PaymentMethods (MethodName, Description, IsActive)  
VALUES  
('Cash', 'Payment in cash at the cashier', 1),  
('Bank Transfer', 'Transfer via the school’s bank account', 1),  
('MoMo E-wallet', 'Payment via MoMo e-wallet', 1),  
('ZaloPay E-wallet', 'Payment via ZaloPay e-wallet', 1),  
('Credit/Debit Card', 'Payment via credit or debit card', 1);  

-- Check the inserted data  
SELECT * FROM PaymentMethods;
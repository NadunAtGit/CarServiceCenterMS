
CREATE DATABASE CarServiceCenter;
USE CarServiceCenter;

-- Customers Table
CREATE TABLE Customers (
    CustomerID VARCHAR(10) PRIMARY KEY,  -- Example: C-0001
    FirstName VARCHAR(50),
    SecondName VARCHAR(50),
    Telephone VARCHAR(20),
    Email VARCHAR(100),
    Password VARCHAR(255),
    Username VARCHAR(50) UNIQUE
);

-- Vehicles Table
CREATE TABLE Vehicles (
    VehicleNo VARCHAR(20) PRIMARY KEY,  -- Example: V-0001
    Model VARCHAR(50),
    Type VARCHAR(50),
    CustomerID VARCHAR(10),
    FOREIGN KEY (CustomerID) REFERENCES Customers(CustomerID) ON DELETE CASCADE
);

-- Appointments Table
CREATE TABLE Appointments (
    AppointmentID VARCHAR(10) PRIMARY KEY, -- Example: A-0001
    CustomerID VARCHAR(10),
    VehicleID VARCHAR(20),
    Date DATE,
    Time TIME,
    Status VARCHAR(20),
    FOREIGN KEY (CustomerID) REFERENCES Customers(CustomerID) ON DELETE CASCADE,
    FOREIGN KEY (VehicleID) REFERENCES Vehicles(VehicleNo) ON DELETE CASCADE
);

-- Employees Table
CREATE TABLE Employees (
    EmployeeID VARCHAR(10) PRIMARY KEY,  -- Example: E-0001
    Name VARCHAR(100),
    Phone VARCHAR(20),
    Role VARCHAR(50),
    Rating FLOAT,
    Username VARCHAR(50) UNIQUE,
    Password VARCHAR(255)
);

-- JobCards Table
CREATE TABLE JobCards (
    JobCardID VARCHAR(10) PRIMARY KEY, -- Example: J-0001
    ServiceDetails TEXT,
    Type VARCHAR(50),
    ServiceRecordID VARCHAR(10),
    InvoiceID VARCHAR(10),
    AppointmentID VARCHAR(10),
    FOREIGN KEY (AppointmentID) REFERENCES Appointments(AppointmentID) ON DELETE CASCADE
);

-- Mechanics Assigned Table (Many-to-Many between JobCards and Employees)
CREATE TABLE Mechanics_Assigned (
    JobCardID VARCHAR(10),
    EmployeeID VARCHAR(10),
    PRIMARY KEY (JobCardID, EmployeeID),
    FOREIGN KEY (JobCardID) REFERENCES JobCards(JobCardID) ON DELETE CASCADE,
    FOREIGN KEY (EmployeeID) REFERENCES Employees(EmployeeID) ON DELETE CASCADE
);

-- Parts Table
CREATE TABLE Parts (
    PartID VARCHAR(10) PRIMARY KEY,  -- Example: P-0001
    Name VARCHAR(100),
    Cost DECIMAL(10,2)
);

-- Service Records Table
CREATE TABLE ServiceRecords (
    ServiceRecord_ID VARCHAR(10) PRIMARY KEY, -- Example: SR-0001
    Description TEXT,
    JobCardID VARCHAR(10),
    VehicleID VARCHAR(20),
    PartID VARCHAR(10),
    FOREIGN KEY (JobCardID) REFERENCES JobCards(JobCardID) ON DELETE CASCADE,
    FOREIGN KEY (VehicleID) REFERENCES Vehicles(VehicleNo) ON DELETE CASCADE,
    FOREIGN KEY (PartID) REFERENCES Parts(PartID) ON DELETE CASCADE
);

-- Invoice Table
CREATE TABLE Invoice (
    Invoice_ID VARCHAR(10) PRIMARY KEY,  -- Example: I-0001
    Total DECIMAL(10,2),
    Parts_Cost DECIMAL(10,2),
    JobCard_ID VARCHAR(10),
    Labour_Cost DECIMAL(10,2),
    FOREIGN KEY (JobCard_ID) REFERENCES JobCards(JobCardID) ON DELETE CASCADE
);

-- Parts Used Table (Many-to-Many between Parts and Invoices)
CREATE TABLE Parts_Used (
    PartID VARCHAR(10),
    InvoiceID VARCHAR(10),
    PRIMARY KEY (PartID, InvoiceID),
    FOREIGN KEY (PartID) REFERENCES Parts(PartID) ON DELETE CASCADE,
    FOREIGN KEY (InvoiceID) REFERENCES Invoice(Invoice_ID) ON DELETE CASCADE
);

ALTER TABLE Vehicles
ADD COLUMN VehiclePicUrl VARCHAR(255) NOT NULL;

ALTER TABLE Appointments
MODIFY Status VARCHAR(20) DEFAULT 'not confirmed';

ALTER TABLE Appointments
ADD AppointmentMadeDate DATETIME DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE Employees
MODIFY Rating float DEFAULT 0.0;

ALTER TABLE Employees
ADD COLUMN Email VARCHAR(100) NOT NULL,
ADD COLUMN ProfilePicUrl VARCHAR(255) NOT NULL;

ALTER TABLE JobCards
DROP COLUMN ServiceRecordID;

ALTER TABLE JobCards
MODIFY COLUMN InvoiceID VARCHAR(10) DEFAULT NULL;

CREATE TABLE Attendances (
    AttendanceID INT AUTO_INCREMENT PRIMARY KEY,
    EmployeeID VARCHAR(10),
    Date DATE NOT NULL,
    Status ENUM('Present', 'Absent', 'On Leave') NOT NULL,
    ArrivalTime DATETIME DEFAULT NULL,
    DepartureTime DATETIME DEFAULT NULL,
    FOREIGN KEY (EmployeeID) REFERENCES Employees(EmployeeID) ON DELETE CASCADE,
    UNIQUE (EmployeeID, Date) -- Ensures an employee can only have one record per day
);

ALTER TABLE JobCards
ADD COLUMN Status ENUM('Created', 'Assigned', 'Ongoing', 'Finished') NOT NULL DEFAULT 'Created';

CREATE TABLE LeaveRequests (
    LeaveID INT AUTO_INCREMENT PRIMARY KEY,
    EmployeeID VARCHAR(10),
    LeaveDate DATE NOT NULL,
    LeaveType ENUM('Full Day', 'Half Day') NOT NULL,
    Status ENUM('Approved', 'Not Approved') DEFAULT 'Not Approved',
    Reason TEXT NOT NULL,
    FOREIGN KEY (EmployeeID) REFERENCES Employees(EmployeeID) ON DELETE CASCADE
);

ALTER TABLE Attendances 
ADD COLUMN isWorking BOOLEAN DEFAULT FALSE;

-- Add this column to your Users table
ALTER TABLE Customers
ADD COLUMN FirebaseToken VARCHAR(255) NULL;

ALTER TABLE ServiceRecords
ADD ServiceType VARCHAR(50), -- Adding Service Type column
ADD Status VARCHAR(20);

ALTER TABLE ServiceRecords
MODIFY Status VARCHAR(20) DEFAULT 'Not Started' CHECK (Status IN ('Not Started', 'Ongoing', 'Finished'));

ALTER TABLE ServiceRecords MODIFY ServiceRecord_ID VARCHAR(20);

ALTER TABLE ServiceRecords DROP CHECK servicerecords_chk_1;

ALTER TABLE ServiceRecords
MODIFY Status VARCHAR(20) DEFAULT 'Not Started' CHECK (Status IN ('Not Started', 'Ongoing', 'Finished', 'Started'));

ALTER TABLE ServiceRecords
DROP FOREIGN KEY servicerecords_ibfk_3;

ALTER TABLE ServiceRecords
DROP COLUMN PartID;

CREATE TABLE Service_Parts (
    ServiceRecord_ID VARCHAR(20),
    PartID VARCHAR(10),
    Quantity INT DEFAULT 1,
    PRIMARY KEY (ServiceRecord_ID, PartID),
    FOREIGN KEY (ServiceRecord_ID) REFERENCES ServiceRecords(ServiceRecord_ID) ON DELETE CASCADE,
    FOREIGN KEY (PartID) REFERENCES Parts(PartID) ON DELETE CASCADE
);

ALTER TABLE Parts
ADD COLUMN Stock INT DEFAULT 0;

CREATE TABLE PartOrders (
    OrderID VARCHAR(10) PRIMARY KEY,           -- PO-0001
    JobCardID VARCHAR(10),                     -- Linked Job Card
    RequestedBy VARCHAR(10),                   -- Mechanic ID
    RequestedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    ApprovedBy VARCHAR(10),                    -- Cashier ID (nullable until approved)
    ApprovedAt DATETIME,
    OrderStatus ENUM('Sent', 'Approved', 'Rejected', 'Returned') DEFAULT 'Sent',
    FOREIGN KEY (JobCardID) REFERENCES JobCards(JobCardID) ON DELETE CASCADE,
    FOREIGN KEY (RequestedBy) REFERENCES Employees(EmployeeID),
    FOREIGN KEY (ApprovedBy) REFERENCES Employees(EmployeeID)
);
CREATE TABLE Order_ServiceRecords (
    OrderID VARCHAR(10),
    ServiceRecordID VARCHAR(20),
    PRIMARY KEY (OrderID, ServiceRecordID),
    FOREIGN KEY (OrderID) REFERENCES PartOrders(OrderID) ON DELETE CASCADE,
    FOREIGN KEY (ServiceRecordID) REFERENCES ServiceRecords(ServiceRecord_ID) ON DELETE CASCADE
);
CREATE TABLE Order_Parts (
    OrderID VARCHAR(10),
    ServiceRecordID VARCHAR(20),
    PartID VARCHAR(10),
    Quantity INT DEFAULT 1,
    PRIMARY KEY (OrderID, ServiceRecordID, PartID),
    FOREIGN KEY (OrderID) REFERENCES PartOrders(OrderID) ON DELETE CASCADE,
    FOREIGN KEY (ServiceRecordID) REFERENCES ServiceRecords(ServiceRecord_ID) ON DELETE CASCADE,
    FOREIGN KEY (PartID) REFERENCES Parts(PartID) ON DELETE CASCADE
);

CREATE TABLE Suppliers (
    SupplierID VARCHAR(10) PRIMARY KEY,
    Name VARCHAR(100),
    Email VARCHAR(100),
    Telephone VARCHAR(20),
    Address TEXT
);

ALTER TABLE Parts
ADD COLUMN Description VARCHAR(200);


CREATE TABLE Stock (
    StockID VARCHAR(10) PRIMARY KEY,
    SupplierID VARCHAR(10),
    Date DATE,
    FOREIGN KEY (SupplierID) REFERENCES Suppliers(SupplierID) ON DELETE SET NULL
);

CREATE TABLE StockItems (
    StockID VARCHAR(10),
    PartID VARCHAR(10),
    Quantity INT,
    StockPrice DECIMAL(10, 2),
    RetailPrice DECIMAL(10, 2),
    PRIMARY KEY (StockID, PartID),
    FOREIGN KEY (StockID) REFERENCES Stock(StockID) ON DELETE CASCADE,
    FOREIGN KEY (PartID) REFERENCES Parts(PartID) ON DELETE CASCADE
);

CREATE TABLE Services (
    ServiceID VARCHAR(10) PRIMARY KEY,  -- Unique identifier for each service
    ServiceName VARCHAR(255) NOT NULL,  -- Name of the service (e.g., Oil Change, Brake Repair)
    Description TEXT,                   -- Detailed description of the service
    Price DECIMAL(10, 2) NOT NULL,      -- Price of the service
    TypeService VARCHAR(100),           -- Type of service (e.g., Maintenance, Repair)
    Duration INT,                       -- Estimated duration for the service in minutes
    DateAdded TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Timestamp of when the service was added
    Active BOOLEAN DEFAULT TRUE         -- Flag to mark if the service is active or discontinued
);

CREATE TABLE notifications (
  notification_id VARCHAR(36) PRIMARY KEY,
  CustomerID VARCHAR(36) NOT NULL,
  title VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  notification_type VARCHAR(50) NOT NULL,
  icon_type VARCHAR(50) NOT NULL,
  color_code VARCHAR(10) NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (CustomerID) REFERENCES customers(CustomerID)
);

ALTER TABLE notifications
ADD COLUMN navigate_id VARCHAR(100);

ALTER TABLE notifications
ADD COLUMN metadata JSON DEFAULT NULL;

-- new changes
ALTER TABLE StockItems
ADD COLUMN BatchNumber VARCHAR(20),
ADD COLUMN ManufacturingDate DATE,
ADD COLUMN ExpiryDate DATE,
ADD COLUMN RemainingQuantity INT DEFAULT 0,
ADD COLUMN EntryDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

UPDATE StockItems SET RemainingQuantity = Quantity WHERE RemainingQuantity = 0;

-- Update PartOrders to track fulfillment status
ALTER TABLE PartOrders 
ADD COLUMN FulfillmentStatus ENUM('Pending', 'Fulfilled', 'Partially Fulfilled', 'Cancelled') DEFAULT 'Pending',
ADD COLUMN FulfilledBy VARCHAR(10),
ADD COLUMN FulfilledAt DATETIME,
ADD COLUMN Notes TEXT,
ADD FOREIGN KEY (FulfilledBy) REFERENCES Employees(EmployeeID);

-- Create table to track inventory movements
CREATE TABLE PartInventoryLogs (
    LogID VARCHAR(10) PRIMARY KEY,
    PartID VARCHAR(10),
    StockItemID VARCHAR(10),
    BatchNumber VARCHAR(20),
    TransactionType ENUM('Purchase', 'Issue', 'Return', 'Adjustment'),
    Quantity INT,
    RemainingQuantity INT,
    UnitPrice DECIMAL(10, 2),
    TransactionDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    OrderID VARCHAR(10),
    JobCardID VARCHAR(10),
    EmployeeID VARCHAR(10),
    Notes TEXT,
    FOREIGN KEY (PartID) REFERENCES Parts(PartID),
    FOREIGN KEY (OrderID) REFERENCES PartOrders(OrderID) ON DELETE SET NULL,
    FOREIGN KEY (JobCardID) REFERENCES JobCards(JobCardID) ON DELETE SET NULL,
    FOREIGN KEY (EmployeeID) REFERENCES Employees(EmployeeID) ON DELETE SET NULL
);

-- Create table to track individual stock batches (for FIFO)
CREATE TABLE StockBatches (
    BatchID VARCHAR(20) PRIMARY KEY,
    StockID VARCHAR(10),
    PartID VARCHAR(10),
    BatchNumber VARCHAR(20),
    InitialQuantity INT,
    RemainingQuantity INT,
    CostPrice DECIMAL(10, 2),
    RetailPrice DECIMAL(10, 2),
    ManufacturingDate DATE,
    ExpiryDate DATE,
    ReceiptDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (StockID) REFERENCES Stock(StockID),
    FOREIGN KEY (PartID) REFERENCES Parts(PartID)
);

-- Create table to track fulfilled orders with batch information
CREATE TABLE FulfilledOrderItems (
    FulfillmentID VARCHAR(20) PRIMARY KEY,
    OrderID VARCHAR(10),
    ServiceRecordID VARCHAR(20),
    PartID VARCHAR(10),
    BatchID VARCHAR(20),
    RequestedQuantity INT,
    FulfilledQuantity INT,
    UnitPrice DECIMAL(10, 2),
    FulfillmentDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FulfilledBy VARCHAR(10),
    Notes TEXT,
    FOREIGN KEY (OrderID) REFERENCES PartOrders(OrderID) ON DELETE CASCADE,
    FOREIGN KEY (ServiceRecordID) REFERENCES ServiceRecords(ServiceRecord_ID) ON DELETE CASCADE,
    FOREIGN KEY (PartID) REFERENCES Parts(PartID) ON DELETE CASCADE,
    FOREIGN KEY (BatchID) REFERENCES StockBatches(BatchID) ON DELETE SET NULL,
    FOREIGN KEY (FulfilledBy) REFERENCES Employees(EmployeeID)
);

-- Modify Invoice table to include more detailed information
ALTER TABLE Invoice
ADD COLUMN GeneratedBy VARCHAR(10),
ADD COLUMN GeneratedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN PaidStatus ENUM('Pending', 'Paid', 'Partially Paid', 'Cancelled') DEFAULT 'Pending',
ADD COLUMN PaymentMethod VARCHAR(50),
ADD COLUMN PaymentDate DATETIME,
ADD COLUMN Notes TEXT,
ADD FOREIGN KEY (GeneratedBy) REFERENCES Employees(EmployeeID);

-- Update Parts_Used table to include batch information
ALTER TABLE Parts_Used
ADD COLUMN BatchID VARCHAR(20),
ADD COLUMN UnitPrice DECIMAL(10, 2),
ADD COLUMN Quantity INT DEFAULT 1,
ADD COLUMN TotalPrice DECIMAL(10, 2),
ADD FOREIGN KEY (BatchID) REFERENCES StockBatches(BatchID) ON DELETE SET NULL;


ALTER TABLE JobCards 
MODIFY COLUMN Status ENUM('Created', 'Assigned', 'Ongoing', 'Finished', 'Invoice Generated') NOT NULL DEFAULT 'Created';

ALTER TABLE Vehicles
ADD CurrentMilleage INT;

ALTER TABLE Vehicles
ADD NextServiceMilleage INT;

ALTER TABLE jobcards
ADD ServiceMilleage INT;

CREATE TABLE Reports (
    ReportID VARCHAR(15) PRIMARY KEY,  -- Example: REP-20250426-01
    ReportType ENUM('Daily', 'Weekly', 'Monthly', 'Custom') NOT NULL,
    StartDate DATE NOT NULL,
    EndDate DATE NOT NULL,
    Department VARCHAR(50) DEFAULT 'All',
    Transactions INT DEFAULT 0,
    Revenue DECIMAL(12,2) DEFAULT 0,
    ServicesCompleted INT DEFAULT 0,
    PartsSold INT DEFAULT 0,
    ServiceRevenue DECIMAL(12,2) DEFAULT 0,
    PartsRevenue DECIMAL(12,2) DEFAULT 0,
    GeneratedBy VARCHAR(10),
    GeneratedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ReportData JSON,  -- Store additional breakdown data
    FOREIGN KEY (GeneratedBy) REFERENCES Employees(EmployeeID)
);

CREATE TABLE BreakdownRequests (
    RequestID VARCHAR(15) PRIMARY KEY,
    CustomerID VARCHAR(10),
    Latitude DECIMAL(10, 8) NOT NULL,
    Longitude DECIMAL(11, 8) NOT NULL,
    Description TEXT,
    ContactName VARCHAR(100) NOT NULL,
    ContactPhone VARCHAR(20) NOT NULL,
    Status ENUM('Pending', 'Assigned', 'InProgress', 'Completed', 'Cancelled') DEFAULT 'Pending',
    RequestTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CompletedTime TIMESTAMP,
    FOREIGN KEY (CustomerID) REFERENCES Customers(CustomerID)
    
);


ALTER TABLE Employees
ADD Department ENUM('Repair', 'Maintenance', 'Detailing');

ALTER TABLE BreakdownRequests 
ADD COLUMN DriverID VARCHAR(10),
ADD COLUMN AcceptedTime TIMESTAMP,
ADD COLUMN CancellationReason TEXT,
ADD COLUMN CancelledTime TIMESTAMP,
ADD FOREIGN KEY (DriverID) REFERENCES Employees(EmployeeID);


-- First add the column
ALTER TABLE BreakdownRequests 
ADD COLUMN InvoiceID VARCHAR(10);

-- Then add the foreign key constraint
ALTER TABLE BreakdownRequests 
ADD CONSTRAINT fk_breakdown_invoice
FOREIGN KEY (InvoiceID) REFERENCES Invoice(Invoice_ID);


ALTER TABLE BreakdownRequests 
MODIFY COLUMN Status ENUM('Pending', 'Assigned', 'InProgress', 'Completed', 'Cancelled', 'Invoice Generated') DEFAULT 'Pending';

CREATE TABLE PasswordResetTokens (
  ResetID VARCHAR(36) PRIMARY KEY,
  UserID VARCHAR(36) NOT NULL,
  Token VARCHAR(255) NOT NULL,
  ExpiryDate DATETIME NOT NULL,
  IsUsed TINYINT DEFAULT 0,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (Token),
  INDEX (UserID)
);

ALTER TABLE JobCards 
MODIFY COLUMN Status ENUM('Created', 'Assigned', 'Ongoing', 'Finished', 'Invoice Generated','Paid') NOT NULL DEFAULT 'Created';

ALTER TABLE BreakdownRequests 
MODIFY COLUMN Status ENUM('Pending', 'Assigned', 'InProgress', 'Completed', 'Cancelled', 'Invoice Generated','paid') DEFAULT 'Pending';

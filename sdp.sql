DROP DATABASE IF EXISTS CarServiceCenter;
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



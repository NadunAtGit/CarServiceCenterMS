const db = require("./db");

const generateCustomerId = async () => {
    return new Promise((resolve, reject) => {
        const query = "SELECT CustomerID FROM Customers ORDER BY CustomerID DESC LIMIT 1";

        db.query(query, (err, result) => {
            if (err) {
                console.error("Error fetching last ID:", err);
                return reject(err);
            }

            console.log("DB Result:", result); // Add this log to check the database result

            let newId;
            if (result.length === 0 || !result[0].CustomerID) {
                newId = "C-0001"; // First entry
            } else {
                let lastId = result[0].CustomerID; // Example: "C-0009"
                let lastNum = parseInt(lastId.split("-")[1], 10) || 0; // Ensure it's a number
                let nextNum = lastNum + 1;
                newId = `C-${nextNum.toString().padStart(4, "0")}`; // Format "C-0010"
            }
            resolve(newId);
        });
    });
};


const generateAppointmentId = async () => {
    return new Promise((resolve, reject) => {
        const query = "SELECT AppointmentID FROM Appointments ORDER BY AppointmentID DESC LIMIT 1";

        db.query(query, (err, result) => {
            if (err) {
                console.error("Error fetching last AppointmentID:", err);
                return reject(err);
            }

            let newId;
            if (result.length === 0 || !result[0].AppointmentID) {
                newId = "A-0001"; // First appointment
            } else {
                let lastId = result[0].AppointmentID; // Example: "A-0009"
                let lastNum = parseInt(lastId.split("-")[1], 10) || 0; // Ensure it's a number
                let nextNum = lastNum + 1;
                newId = `A-${nextNum.toString().padStart(4, "0")}`; // Format "A-0010"
            }
            resolve(newId);
        });
    });
};


const generateEmployeeId = async (role) => {
    return new Promise((resolve, reject) => {
        let prefix;

        switch (role.toLowerCase()) {
            case "admin":
                prefix = "A";
                break;
            case "service advisor":
                prefix = "SA";
                break;
            case "mechanic":
                prefix = "M";
                break;
            case "team leader":
                prefix = "TL";
                break;
            case "cashier":
                prefix = "C";
                break;
            default:
                return reject(new Error("Invalid role provided"));
        }

        const query = `SELECT EmployeeID FROM Employees WHERE EmployeeID LIKE '${prefix}-%' ORDER BY EmployeeID DESC LIMIT 1`;

        db.query(query, (err, result) => {
            if (err) {
                console.error("Error fetching last EmployeeID:", err);
                return reject(err);
            }

            let newId;
            if (result.length === 0 || !result[0].EmployeeID) {
                newId = `${prefix}-001`; // First employee in this role
            } else {
                let lastId = result[0].EmployeeID; // Example: "A-009"
                let lastNum = parseInt(lastId.split("-")[1], 10) || 0; // Extract number
                let nextNum = lastNum + 1;
                newId = `${prefix}-${nextNum.toString().padStart(3, "0")}`; // Format "A-010"
            }
            resolve(newId);
        });
    });
};

const generateJobCardId = async () => {
    return new Promise((resolve, reject) => {
        const query = "SELECT JobCardID FROM JobCards ORDER BY JobCardID DESC LIMIT 1";

        db.query(query, (err, result) => {
            if (err) {
                console.error("Error fetching last JobCardID:", err);
                return reject(err);
            }

            let newId;
            if (result.length === 0 || !result[0].JobCardID) {
                newId = "JC-0001"; // First JobCard
            } else {
                let lastId = result[0].JobCardID; // Example: "JC-0009"
                let lastNum = parseInt(lastId.split("-")[1], 10) || 0; // Extract numeric part
                let nextNum = lastNum + 1;

                // Prevent overflow beyond "JC-9999"
                if (nextNum > 9999) {
                    console.error("JobCardID limit reached! Consider a new format.");
                    return reject(new Error("JobCardID limit reached!"));
                }

                // Format as "JC-0001", "JC-0002", ..., "JC-9999"
                newId = `JC-${nextNum.toString().padStart(4, "0")}`;
            }
            resolve(newId);
        });
    });
};

const generateOrderId = async () => {
    return new Promise((resolve, reject) => {
        const query = "SELECT OrderID FROM PartOrders ORDER BY OrderID DESC LIMIT 1";

        db.query(query, (err, result) => {
            if (err) {
                console.error("Error fetching last OrderID:", err);
                return reject(err);
            }

            let newId;
            if (result.length === 0 || !result[0].OrderID) {
                newId = "PO-0001"; // First Order ID
            } else {
                let lastId = result[0].OrderID; // e.g., "PO-9999" or "PO-00009"
                let lastNum = parseInt(lastId.split("-")[1], 10) || 0;
                let nextNum = lastNum + 1;

                // Dynamically determine how many digits needed (minimum 4, then expand)
                let length = nextNum > 9999 ? 5 : 4;

                newId = `PO-${nextNum.toString().padStart(length, "0")}`;
            }

            resolve(newId);
        });
    });
};

const generateSupplierId = async () => {
    return new Promise((resolve, reject) => {
        const query = "SELECT SupplierID FROM Suppliers ORDER BY SupplierID DESC LIMIT 1";

        db.query(query, (err, result) => {
            if (err) {
                console.error("Error fetching last SupplierID:", err);
                return reject(err);
            }

            let newId;
            if (result.length === 0 || !result[0].SupplierID) {
                newId = "SUP-001"; // First Supplier ID
            } else {
                let lastId = result[0].SupplierID; // e.g., "SUP-009"
                let lastNum = parseInt(lastId.split("-")[1], 10) || 0;
                let nextNum = lastNum + 1;

                // Dynamically determine how many digits needed (minimum 3, then expand)
                let length = nextNum > 999 ? 4 : 3;

                newId = `SUP-${nextNum.toString().padStart(length, "0")}`;
            }

            resolve(newId);
        });
    });
};

const generatePartId = async () => {
    return new Promise((resolve, reject) => {
        const query = "SELECT PartID FROM Parts ORDER BY PartID DESC LIMIT 1";

        db.query(query, (err, result) => {
            if (err) {
                console.error("Error fetching last PartID:", err);
                return reject(err);
            }

            let newId;
            if (result.length === 0 || !result[0].PartID) {
                newId = "P-001"; // First Part ID
            } else {
                let lastId = result[0].PartID; // e.g., "P-009"
                let lastNum = parseInt(lastId.split("-")[1], 10) || 0;
                let nextNum = lastNum + 1;

                let length = nextNum > 999 ? 4 : 3;
                newId = `P-${nextNum.toString().padStart(length, "0")}`;
            }

            resolve(newId);
        });
    });
};

const generateStockID = async () => {
    return new Promise((resolve, reject) => {
        const query = "SELECT StockID FROM Stock ORDER BY StockID DESC LIMIT 1";

        db.query(query, (err, result) => {
            if (err) {
                console.error("Error fetching last StockID:", err);
                return reject(err);
            }

            let newId;
            if (result.length === 0 || !result[0].StockID) {
                newId = "STK-0001"; // First Stock ID
            } else {
                let lastId = result[0].StockID; // e.g., "STK-0009"
                let lastNum = parseInt(lastId.split("-")[1], 10) || 0;
                let nextNum = lastNum + 1;

                // Dynamically determine how many digits needed (minimum 4)
                let length = nextNum > 999 ? 4 : 4; // Always 4 digits

                newId = `STK-${nextNum.toString().padStart(length, "0")}`;
            }

            resolve(newId);
        });
    });
};









module.exports = {
    generateCustomerId,
    generateAppointmentId,
    generateEmployeeId,
    generateJobCardId,
    generateOrderId,
    generateSupplierId,
    generatePartId,
    generateStockID
};



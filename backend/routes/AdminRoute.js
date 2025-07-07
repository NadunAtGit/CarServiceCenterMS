const express = require("express");
const bcrypt = require("bcryptjs"); // ✅ Import bcrypt
const db = require("../db");
const {generateEmployeeId,generateSupplierId}=require("../GenerateId")
const { validateEmail, validatePhoneNumber } = require("../validations");
const jwt = require("jsonwebtoken");
const{authenticateToken,authorizeRoles}=require("../utilities");
const moment = require("moment");
const { v4: uuidv4 } = require("uuid");
const multer = require("multer");
const path = require("path");
const { messaging, bucket } = require("../firebaseConfig"); 
// Firebase storage bucket

// Multer Storage Config
const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = express.Router();


router.use((req, res, next) => {
    console.log("Admin Route Hit:", req.method, req.url);
    next();
});

router.post("/signin-admin", async (req, res) => {
    console.log("Request received:", req.body);
    const { Name, Phone, Role, Username, Password, Email, ProfilePicUrl } = req.body;

    // Validate required fields
    if (!Name || !Email || !Password || !Role || !Phone || !Username || !ProfilePicUrl) {
        console.log("Missing parameters");
        return res.status(400).json({ error: true, message: "All parameters required" });
    }
    if (!validateEmail(Email)) {
        return res.status(400).json({ error: "Invalid email format" });
    }

    if (!validatePhoneNumber(Phone)) {
        return res.status(400).json({ error: "Invalid phone number format" });
    }

    try {
        // Check if an admin already exists
        const adminQuery = "SELECT * FROM Employees WHERE Role = 'Admin' LIMIT 1";
        const existingAdmin = await new Promise((resolve, reject) => {
            db.query(adminQuery, (err, result) => {
                if (err) return reject(err);
                resolve(result.length > 0 ? result[0] : null);
            });
        });

        if (existingAdmin) {
            return res.status(400).json({
                error: true,
                message: "An admin already exists. Use the admin account to create additional users."
            });
        }

        // Check if the user already exists
        const userQuery = "SELECT * FROM Employees WHERE Email = ?";
        const existingUser = await new Promise((resolve, reject) => {
            db.query(userQuery, [Email], (err, result) => {
                if (err) return reject(err);
                resolve(result.length > 0 ? result[0] : null);
            });
        });

        if (existingUser) {
            return res.status(400).json({ error: true, message: "User already exists" });
        }

        // Generate a new EmployeeID
        const EmployeeID = await generateEmployeeId(Role);

        // Hash the password
        const hashedPassword = await bcrypt.hash(Password, 10);

        // Insert new admin into the database with Rating set to 0.0
        const insertQuery = `INSERT INTO Employees (EmployeeID, Name, Phone, Role, Username, Password, Email, ProfilePicUrl, Rating) 
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await new Promise((resolve, reject) => {
            db.query(insertQuery, [EmployeeID, Name, Phone, Role, Username, hashedPassword, Email, ProfilePicUrl, 0.0], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        console.log("New Admin Created:", EmployeeID);

        // Generate JWT Token
        const accessToken = jwt.sign(
            { EmployeeID, Role, Email },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "72h" }
        );

        return res.status(200).json({
            error: false,
            user: {
                EmployeeID,
                Name,
                Email,
                Role,
                Rating: 0.0 // Include rating in the response
            },
            accessToken,
            message: "Admin created successfully"
        });

    } catch (error) {
        console.error("Error in /signin-admin:", error);
        return res.status(500).json({ error: true, message: "Server error" });
    }
});

router.get("/get-info-emp", authenticateToken, async (req, res) => {
    console.log("Admin route hit: GET /get-info-emp"); 
    try {
        const { EmployeeID } = req.user; // Extract employeeId from the token

        const query = "SELECT * FROM employees WHERE EmployeeID = ?";
        db.query(query, [EmployeeID], (err, result) => {
            if (err) {
                console.error("Error fetching employee info:", err);
                return res.status(500).json({ message: "Internal server error" });
            }

            if (result.length === 0) {
                return res.status(404).json({ message: "Employee not found" });
            }

            res.status(200).json({
                success: true,
                message: "Employee information retrieved successfully",
                employeeInfo: result[0],
            });
        });
    } catch (error) {
        console.error("Error during /get-info:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.post("/employee-login", async (req, res) => {
    const { email, password } = req.body;

    // Check if email and password are provided
    if (!email || !password) {
        return res.status(400).json({ error: true, message: "All parameters required" });
    }

    try {
        // Query to check if employee exists
        const query = "SELECT * FROM Employees WHERE Email = ?";
        db.query(query, [email], async (err, result) => {
            if (err) {
                console.error("Database query error:", err);
                return res.status(500).json({ error: true, message: "Internal server error" });
            }

            // If no employee found
            if (result.length === 0) {
                return res.status(404).json({ error: true, message: "Employee not found" });
            }

            const employee = result[0];
            // The employee record from DB

            // Compare hashed password with the stored password
            const match = await bcrypt.compare(password, employee.Password);
            if (!match) {
                return res.status(400).json({ error: true, message: "Invalid password" });
            }
            console.log("🔹 Assigned Role in JWT:", employee.Role);
            

            // Generate JWT token for the employee
            const accessToken = jwt.sign(
                { EmployeeID: employee.EmployeeID, email: employee.email, role: employee.Role ,department:employee.Department},
                process.env.ACCESS_TOKEN_SECRET, // Make sure to set this in your .env file
                { expiresIn: "2h" } // Token expires in 1 hour
            );

            // Send success response with token
            res.status(200).json({
                success: true,
                message: "Login successful",
                EmployeeID: employee.EmployeeID,
                Name: employee.Name,
                Role: employee.Role,
                accessToken,
            });
        });
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ error: true, message: "Internal server error" });
    }
});


router.post("/create-employee", authenticateToken, authorizeRoles(['Admin']), async (req, res) => {
    console.log("Request received:", req.body);
    const { name, phone, role, username, password, email, profilePicUrl, department } = req.body;

    // Convert to expected backend format
    const Name = name;
    const Phone = phone;
    const Role = role;
    const Username = username;
    const Password = password;
    const Email = email;
    const ProfilePicUrl = profilePicUrl;
    const Department = department;

    if (!Name || !Email || !Password || !Role || !Phone || !Username || (ProfilePicUrl !== "" && !ProfilePicUrl) || !Department) {
        console.log("Missing parameters");
        return res.status(400).json({ error: true, message: "All parameters required" });
    }
    
    if (!validateEmail(Email)) {
        return res.status(400).json({ error: "Invalid email format" });
    }
    if (!validatePhoneNumber(Phone)) {
        return res.status(400).json({ error: "Invalid phone number format" });
    }

    try {
        // Check if the employee already exists
        const userQuery = "SELECT * FROM Employees WHERE Email = ?";
        const existingUser = await new Promise((resolve, reject) => {
            db.query(userQuery, [Email], (err, result) => {
                if (err) return reject(err);
                resolve(result.length > 0 ? result[0] : null);
            });
        });

        if (existingUser) {
            return res.status(400).json({ error: true, message: "Employee already exists" });
        }

        // Generate a new EmployeeID
        const EmployeeID = await generateEmployeeId(Role);

        // Hash the password
        const hashedPassword = await bcrypt.hash(Password, 10);

        // Insert new employee into the database with Rating set to 0.0 and the Department
        const insertQuery = `INSERT INTO Employees (EmployeeID, Name, Phone, Role, Username, Password, Email, ProfilePicUrl, Rating, Department)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await new Promise((resolve, reject) => {
            db.query(insertQuery, [EmployeeID, Name, Phone, Role, Username, hashedPassword, Email, ProfilePicUrl, 0.0, Department], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        console.log("New Employee Created:", EmployeeID);

        // Generate JWT Token
        const accessToken = jwt.sign(
            { EmployeeID, Role, Email, Department },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "72h" }
        );

        return res.status(200).json({
            error: false,
            user: {
                EmployeeID,
                Name,
                Email,
                Role,
                Department,
                Rating: 0.0 // Include rating in the response
            },
            accessToken,
            message: "Employee created successfully"
        });

    } catch (error) {
        console.error("Error in /create-employee:", error);
        return res.status(500).json({ error: true, message: "Server error" });
    }
});


router.get("/all-employees", authenticateToken, authorizeRoles(["Admin"]), async (req, res) => {
    try {
        const query = "SELECT * FROM employees";
        
        db.query(query, (err, result) => {
            if (err) {
                console.error("Database query error:", err);
                return res.status(500).json({ error: true, message: "Internal server error" });
            }

            return res.status(200).json({
                success: true,
                employees: result,
            });
        });

    } catch (error) {
        console.error("Unexpected error in /all-employees:", error);
        return res.status(500).json({ error: true, message: "Something went wrong" });
    }
});

router.delete("/delete-employee/:id", authenticateToken, authorizeRoles(["Admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const { transferToEmployeeId } = req.body; // Optional: ID of employee to transfer references to
  
      if (!id) {
        return res.status(400).json({ error: true, message: "Employee ID is required" });
      }
  
      // Begin a transaction to ensure all operations are atomic
      db.beginTransaction(async (err) => {
        if (err) {
          console.error("Error starting transaction:", err);
          return res.status(500).json({ error: true, message: "Database transaction error" });
        }
  
        try {
          // First, check if employee exists
          const employeeQuery = "SELECT * FROM employees WHERE EmployeeID = ?";
          const employee = await new Promise((resolve, reject) => {
            db.query(employeeQuery, [id], (err, result) => {
              if (err) reject(err);
              resolve(result[0]);
            });
          });
  
          if (!employee) {
            db.rollback();
            return res.status(404).json({ error: true, message: "Employee not found" });
          }
  
          // Check for references in PartOrders table
          const partOrdersCheckQuery = "SELECT COUNT(*) as count FROM partorders WHERE RequestedBy = ? OR ApprovedBy = ? OR FulfilledBy = ?";
          const partOrdersCount = await new Promise((resolve, reject) => {
            db.query(partOrdersCheckQuery, [id, id, id], (err, result) => {
              if (err) reject(err);
              resolve(result[0].count);
            });
          });
  
          // Check for references in other tables as needed
          // Example: Check Mechanics_Assigned
          const mechanicsAssignedCheckQuery = "SELECT COUNT(*) as count FROM mechanics_assigned WHERE EmployeeID = ?";
          const mechanicsAssignedCount = await new Promise((resolve, reject) => {
            db.query(mechanicsAssignedCheckQuery, [id], (err, result) => {
              if (err) reject(err);
              resolve(result[0].count);
            });
          });
  
          // Check attendance and leave records
          const attendanceCheckQuery = "SELECT COUNT(*) as count FROM attendances WHERE EmployeeID = ?";
          const attendanceCount = await new Promise((resolve, reject) => {
            db.query(attendanceCheckQuery, [id], (err, result) => {
              if (err) reject(err);
              resolve(result[0].count);
            });
          });
  
          const leaveCheckQuery = "SELECT COUNT(*) as count FROM leaverequests WHERE EmployeeID = ?";
          const leaveCount = await new Promise((resolve, reject) => {
            db.query(leaveCheckQuery, [id], (err, result) => {
              if (err) reject(err);
              resolve(result[0].count);
            });
          });
  
          // Check invoice, inventory logs, and fulfilled orders
          const invoiceCheckQuery = "SELECT COUNT(*) as count FROM invoice WHERE GeneratedBy = ?";
          const invoiceCount = await new Promise((resolve, reject) => {
            db.query(invoiceCheckQuery, [id], (err, result) => {
              if (err) reject(err);
              resolve(result[0].count);
            });
          });
  
          const inventoryLogsCheckQuery = "SELECT COUNT(*) as count FROM partinventorylogs WHERE EmployeeID = ?";
          const inventoryLogsCount = await new Promise((resolve, reject) => {
            db.query(inventoryLogsCheckQuery, [id], (err, result) => {
              if (err) reject(err);
              resolve(result[0].count);
            });
          });
  
          const fulfilledOrdersCheckQuery = "SELECT COUNT(*) as count FROM fulfilledorderitems WHERE FulfilledBy = ?";
          const fulfilledOrdersCount = await new Promise((resolve, reject) => {
            db.query(fulfilledOrdersCheckQuery, [id], (err, result) => {
              if (err) reject(err);
              resolve(result[0].count);
            });
          });
  
          const reportsCheckQuery = "SELECT COUNT(*) as count FROM reports WHERE GeneratedBy = ?";
          const reportsCount = await new Promise((resolve, reject) => {
            db.query(reportsCheckQuery, [id], (err, result) => {
              if (err) reject(err);
              resolve(result[0].count);
            });
          });
  
          // Calculate total references
          const totalReferences = partOrdersCount + mechanicsAssignedCount + attendanceCount + 
                                leaveCount + invoiceCount + inventoryLogsCount + 
                                fulfilledOrdersCount + reportsCount;
  
          // If there are references and no transfer ID was provided, return an error
          if (totalReferences > 0 && !transferToEmployeeId) {
            db.rollback();
            return res.status(400).json({ 
              error: true, 
              message: "Cannot delete employee: This employee has references in other tables.",
              references: {
                partOrders: partOrdersCount,
                mechanicsAssigned: mechanicsAssignedCount,
                attendance: attendanceCount,
                leaveRequests: leaveCount,
                invoices: invoiceCount,
                inventoryLogs: inventoryLogsCount,
                fulfilledOrders: fulfilledOrdersCount,
                reports: reportsCount,
                total: totalReferences
              }
            });
          }
  
          // If transfer ID is provided, transfer all references
          if (transferToEmployeeId) {
            // Check if transfer employee exists
            const transferEmployeeQuery = "SELECT * FROM employees WHERE EmployeeID = ?";
            const transferEmployee = await new Promise((resolve, reject) => {
              db.query(transferEmployeeQuery, [transferToEmployeeId], (err, result) => {
                if (err) reject(err);
                resolve(result[0]);
              });
            });
  
            if (!transferEmployee) {
              db.rollback();
              return res.status(404).json({ error: true, message: "Transfer employee not found" });
            }
  
            // Transfer references in PartOrders
            const updatePartOrdersRequestedByQuery = "UPDATE partorders SET RequestedBy = ? WHERE RequestedBy = ?";
            await new Promise((resolve, reject) => {
              db.query(updatePartOrdersRequestedByQuery, [transferToEmployeeId, id], (err, result) => {
                if (err) reject(err);
                resolve(result);
              });
            });
  
            const updatePartOrdersApprovedByQuery = "UPDATE partorders SET ApprovedBy = ? WHERE ApprovedBy = ?";
            await new Promise((resolve, reject) => {
              db.query(updatePartOrdersApprovedByQuery, [transferToEmployeeId, id], (err, result) => {
                if (err) reject(err);
                resolve(result);
              });
            });
  
            const updatePartOrdersFulfilledByQuery = "UPDATE partorders SET FulfilledBy = ? WHERE FulfilledBy = ?";
            await new Promise((resolve, reject) => {
              db.query(updatePartOrdersFulfilledByQuery, [transferToEmployeeId, id], (err, result) => {
                if (err) reject(err);
                resolve(result);
              });
            });
  
            // Transfer references in Mechanics_Assigned
            const updateMechanicsAssignedQuery = "UPDATE mechanics_assigned SET EmployeeID = ? WHERE EmployeeID = ?";
            await new Promise((resolve, reject) => {
              db.query(updateMechanicsAssignedQuery, [transferToEmployeeId, id], (err, result) => {
                if (err) reject(err);
                resolve(result);
              });
            });
  
            // Transfer references in Invoice
            const updateInvoiceQuery = "UPDATE invoice SET GeneratedBy = ? WHERE GeneratedBy = ?";
            await new Promise((resolve, reject) => {
              db.query(updateInvoiceQuery, [transferToEmployeeId, id], (err, result) => {
                if (err) reject(err);
                resolve(result);
              });
            });
  
            // Transfer references in PartInventoryLogs
            const updateInventoryLogsQuery = "UPDATE partinventorylogs SET EmployeeID = ? WHERE EmployeeID = ?";
            await new Promise((resolve, reject) => {
              db.query(updateInventoryLogsQuery, [transferToEmployeeId, id], (err, result) => {
                if (err) reject(err);
                resolve(result);
              });
            });
  
            // Transfer references in FulfilledOrderItems
            const updateFulfilledOrdersQuery = "UPDATE fulfilledorderitems SET FulfilledBy = ? WHERE FulfilledBy = ?";
            await new Promise((resolve, reject) => {
              db.query(updateFulfilledOrdersQuery, [transferToEmployeeId, id], (err, result) => {
                if (err) reject(err);
                resolve(result);
              });
            });
  
            // Transfer references in Reports
            const updateReportsQuery = "UPDATE reports SET GeneratedBy = ? WHERE GeneratedBy = ?";
            await new Promise((resolve, reject) => {
              db.query(updateReportsQuery, [transferToEmployeeId, id], (err, result) => {
                if (err) reject(err);
                resolve(result);
              });
            });
  
            // Note: For attendance and leave records, you might want to keep them associated with the original employee
            // for historical purposes, or you could delete them along with the employee
          }
  
          // Now delete the employee
          const deleteQuery = "DELETE FROM employees WHERE EmployeeID = ?";
          await new Promise((resolve, reject) => {
            db.query(deleteQuery, [id], (err, result) => {
              if (err) reject(err);
              resolve(result);
            });
          });
  
          // Commit the transaction
          db.commit((err) => {
            if (err) {
              console.error("Error committing transaction:", err);
              db.rollback();
              return res.status(500).json({ error: true, message: "Database transaction error" });
            }
  
            return res.status(200).json({
              success: true,
              message: transferToEmployeeId 
                ? `Employee deleted successfully. All references transferred to employee ${transferToEmployeeId}.`
                : "Employee deleted successfully.",
            });
          });
  
        } catch (error) {
          console.error("Error in delete-employee transaction:", error);
          db.rollback();
          return res.status(500).json({ error: true, message: "Internal server error" });
        }
      });
    } catch (error) {
      console.error("Unexpected error in /delete-employee:", error);
      return res.status(500).json({ error: true, message: "Something went wrong" });
    }
  });

router.post("/mark-attendance", authenticateToken, async (req, res) => {
    try {
        const { email, EmployeeID } = req.user; // Get authenticated user's email and EmployeeID
        const { status } = req.body; // Get attendance status from request body

        // Validate required fields
        if (!status) {
            return res.status(400).json({ error: true, message: "Status is required." });
        }

        // Validate status value
        if (!["Present", "Absent", "On Leave"].includes(status)) {
            return res.status(400).json({
                error: true,
                message: "Invalid status. Status should be one of 'Present', 'Absent', or 'On Leave'.",
            });
        }

        // Check if it's past 9 AM
        const currentTime = moment();
        const cutoffTime = moment().set({ hour: 9, minute: 0, second: 0 });
        
        if (currentTime.isAfter(cutoffTime)) {
            return res.status(400).json({
                error: true,
                message: "Attendance cannot be marked after 9 AM.",
            });
        }

        // Check if EmployeeID exists in Employees table
        const employeeQuery = "SELECT EmployeeID FROM Employees WHERE Email = ?";
        const employeeResult = await new Promise((resolve, reject) => {
            db.query(employeeQuery, [email], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        if (employeeResult.length === 0) {
            return res.status(404).json({ error: true, message: "Employee not found" });
        }

        const employeeId = employeeResult[0].EmployeeID;
        const todayDate = moment().format("YYYY-MM-DD"); // Format today's date

        // Check if attendance for today is already marked
        const checkAttendanceQuery = "SELECT * FROM Attendances WHERE EmployeeID = ? AND Date = ?";
        const existingAttendance = await new Promise((resolve, reject) => {
            db.query(checkAttendanceQuery, [employeeId, todayDate], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        if (existingAttendance.length > 0) {
            return res.status(400).json({
                error: true,
                message: "Attendance for today has already been marked.",
            });
        }

        const arrivalTime = status === "Present" ? moment().format("YYYY-MM-DD HH:mm:ss") : null;

        // Insert attendance record
        const insertQuery = `
            INSERT INTO Attendances (EmployeeID, Date, Status, ArrivalTime)
            VALUES (?, ?, ?, ?)
        `;

        await new Promise((resolve, reject) => {
            db.query(insertQuery, [employeeId, todayDate, status, arrivalTime], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        return res.status(201).json({
            error: false,
            message: "Attendance marked successfully",
            attendance: {
                EmployeeID: employeeId,
                Date: todayDate,
                Status: status,
                ArrivalTime: arrivalTime,
            },
        });

    } catch (error) {
        console.error("Error marking attendance:", error);
        return res.status(500).json({ error: true, message: "Failed to mark attendance. Please try again later." });
    }
});

router.post("/mark-departure", authenticateToken, async (req, res) => {
    try {
        const { email } = req.user; // Get authenticated user's email
        const todayDate = moment().format("YYYY-MM-DD"); // Get today's date
        const departureTime = moment().format("YYYY-MM-DD HH:mm:ss"); // Get current timestamp

        // Get EmployeeID from Employees table using email
        const employeeQuery = "SELECT EmployeeID FROM Employees WHERE Email = ?";
        const employeeResult = await new Promise((resolve, reject) => {
            db.query(employeeQuery, [email], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        if (employeeResult.length === 0) {
            return res.status(404).json({ error: true, message: "Employee not found" });
        }

        const employeeId = employeeResult[0].EmployeeID;

        // Check if today's attendance exists
        const checkAttendanceQuery = "SELECT * FROM Attendances WHERE EmployeeID = ? AND Date = ?";
        const attendanceResult = await new Promise((resolve, reject) => {
            db.query(checkAttendanceQuery, [employeeId, todayDate], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        if (attendanceResult.length === 0) {
            return res.status(400).json({
                error: true,
                message: "Attendance record not found for today. Please mark attendance first.",
            });
        }

        const attendance = attendanceResult[0];

        // Ensure the employee was marked "Present" before allowing departure
        if (attendance.Status !== "Present") {
            return res.status(400).json({
                error: true,
                message: "Departure time can only be recorded for employees marked as 'Present'.",
            });
        }

        // Ensure departure time hasn't been already recorded
        if (attendance.DepartureTime) {
            return res.status(400).json({
                error: true,
                message: "Departure time has already been marked for today.",
            });
        }

        // Update attendance with departure time
        const updateDepartureQuery = "UPDATE Attendances SET DepartureTime = ? WHERE EmployeeID = ? AND Date = ?";
        await new Promise((resolve, reject) => {
            db.query(updateDepartureQuery, [departureTime, employeeId, todayDate], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        return res.status(200).json({
            error: false,
            message: "Departure time marked successfully",
            attendance: {
                EmployeeID: employeeId,
                Date: todayDate,
                Status: attendance.Status,
                ArrivalTime: attendance.ArrivalTime,
                DepartureTime: departureTime,
            },
        });

    } catch (error) {
        console.error("Error marking departure:", error);
        return res.status(500).json({ error: true, message: "Failed to mark departure. Please try again later." });
    }
});


router.post("/upload-image/:folder",upload.single("image"), async (req, res) => {
    try {
        const { folder } = req.params;
        console.log("Folder:", folder);

        // Sanitize folder name (remove disallowed characters such as newline)
        const sanitizedFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '');

        // Validate sanitized folder
        if (!["employeepics", "cars","customerpics"].includes(sanitizedFolder)) {
            return res.status(400).json({ error: true, message: "Invalid folder name" });
        }

        if (!req.file) {
            return res.status(400).json({ error: true, message: "No image uploaded" });
        }

        // Generate a unique filename
        const filename = `${sanitizedFolder}/${uuidv4()}${path.extname(req.file.originalname)}`;
        const file = bucket.file(filename);

        // Upload file to Firebase Storage
        const stream = file.createWriteStream({
            metadata: { contentType: req.file.mimetype },
        });

        stream.on("error", (err) => {
            console.error("Upload error:", err);
            return res.status(500).json({ error: true, message: "Image upload failed" });
        });

        stream.on("finish", async () => {
            await file.makePublic(); // Make the file public
            const imageUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
            res.status(201).json({ imageUrl });
        });

        stream.end(req.file.buffer);
    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ error: true, message: error.message });
    }
});

router.get("/search-employee", async (req, res) => {
    let { query } = req.query; // Use let instead of const to allow reassignment
  
    if (!query) {
      return res.status(400).json({ error: true, message: "Search query is required" });
    }
  
    query = query.trim(); // Trim the query
    const searchQuery = `%${query}%`; // Create search query
  
    console.log("Search Query:", searchQuery); // Log the search query being passed
  
    try {
      // Define the SQL query with placeholders for parameters
      const sqlQuery = `SELECT * FROM Employees WHERE EmployeeID LIKE ? OR Name LIKE ? OR Role LIKE ?`;
      console.log("Executing SQL:", sqlQuery, [searchQuery, searchQuery, searchQuery]);
  
      // Use db.query() with callback like in the /all-employees route
      db.query(sqlQuery, [searchQuery, searchQuery, searchQuery], (err, result) => {
        if (err) {
          console.error("Database query error:", err);
          return res.status(500).json({ error: true, message: "Internal server error" });
        }
  
        // Log the result for debugging
        console.log("Search Results:", result);
  
        return res.status(200).json({
          success: true,
          message: "Search completed successfully",
          results: result, // Send the result as search results
        });
      });
    } catch (error) {
      console.error("Unexpected error in /search-employee:", error);
      return res.status(500).json({ error: true, message: "Something went wrong" });
    }
});

router.post("/addsupplier", authenticateToken, authorizeRoles(["Admin"]), async (req, res) => {
    try {
        const { Name, Email, Telephone, Address } = req.body;

        // Input validation
        if (!Name || !Email || !Telephone || !Address) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Generate a new Supplier ID
        const SupplierID = await generateSupplierId();

        // Insert supplier details into the database
        const query = `INSERT INTO suppliers (SupplierID, Name, Email, Telephone, Address)
                       VALUES (?, ?, ?, ?, ?)`;

        db.query(query, [SupplierID, Name, Email, Telephone, Address], (err, result) => {
            if (err) {
                return res.status(500).json({ message: "Error adding supplier", error: err });
            }

            res.status(201).json({ message: "Supplier added successfully", SupplierID });
        });
    } catch (error) {
        console.error("Error in addsupplier route:", error);
        res.status(500).json({ message: "Internal server error", error });
    }
});

router.get("/getsuppliers", authenticateToken, authorizeRoles(["Admin","Cashier"]), async (req, res) => {
    try {
        const query = "SELECT * FROM Suppliers";

        db.query(query, (err, results) => {
            if (err) {
                return res.status(500).json({ message: "Error fetching suppliers", error: err });
            }

            if (results.length === 0) {
                return res.status(404).json({ message: "No suppliers found" });
            }

            res.status(200).json({
                message: "Suppliers fetched successfully",
                suppliers: results
            });
        });
    } catch (error) {
        console.error("Error in getsuppliers route:", error);
        res.status(500).json({ message: "Internal server error", error });
    }
});

router.get("/getsupplier/:id", authenticateToken, authorizeRoles(["Admin","Cashier"]), async (req, res) => {
    try {
        const { id } = req.params;

        const query = "SELECT * FROM Suppliers WHERE SupplierID = ?";

        db.query(query, [id], (err, results) => {
            if (err) {
                return res.status(500).json({ message: "Error fetching supplier", error: err });
            }

            if (results.length === 0) {
                return res.status(404).json({ message: "Supplier not found" });
            }

            res.status(200).json({
                message: "Supplier fetched successfully",
                supplier: results[0]
            });
        });
    } catch (error) {
        console.error("Error in getsupplier route:", error);
        res.status(500).json({ message: "Internal server error", error });
    }
});

router.put("/updatesupplier/:id", authenticateToken, authorizeRoles(["Admin"]), async (req, res) => {
    try {
        const { id } = req.params;
        const { Name, Email, Telephone, Address } = req.body;

        // Input validation
        if (!Name || !Email || !Telephone || !Address) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const query = `UPDATE Suppliers
                       SET Name = ?, Email = ?, Telephone = ?, Address = ?
                       WHERE SupplierID = ?`;

        db.query(query, [Name, Email, Telephone, Address, id], (err, result) => {
            if (err) {
                return res.status(500).json({ message: "Error updating supplier", error: err });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "Supplier not found" });
            }

            res.status(200).json({ message: "Supplier updated successfully" });
        });
    } catch (error) {
        console.error("Error in updatesupplier route:", error);
        res.status(500).json({ message: "Internal server error", error });
    }
});

router.delete("/deletesupplier/:id", authenticateToken, authorizeRoles(["Admin"]), async (req, res) => {
    try {
        const { id } = req.params;

        const query = "DELETE FROM Suppliers WHERE SupplierID = ?";

        db.query(query, [id], (err, result) => {
            if (err) {
                return res.status(500).json({ message: "Error deleting supplier", error: err });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "Supplier not found" });
            }

            res.status(200).json({ message: "Supplier deleted successfully" });
        });
    } catch (error) {
        console.error("Error in deletesupplier route:", error);
        res.status(500).json({ message: "Internal server error", error });
    }
});

// Add this to your backend API routes file
// Add this to your AdminRoute.js file

router.get("/filter-employees-by-role", authenticateToken, authorizeRoles(["Admin"]), async (req, res) => {
    try {
      const { role } = req.query;
      
      let query = "SELECT * FROM employees";
      let params = [];
      
      if (role && role !== "") {
        query += " WHERE Role = ?";
        params.push(role);
      }
      
      db.query(query, params, (err, result) => {
        if (err) {
          console.error("Database query error:", err);
          return res.status(500).json({ error: true, message: "Internal server error" });
        }
        
        return res.status(200).json({
          success: true,
          employees: result,
        });
      });
      
    } catch (error) {
      console.error("Error filtering employees by role:", error);
      return res.status(500).json({ error: true, message: "Something went wrong" });
    }
  });

router.get("/get-employee/:id", authenticateToken, authorizeRoles(["Admin"]), async (req, res) => {
    try {
      const employeeId = req.params.id;
      
      const query = "SELECT * FROM employees WHERE EmployeeID = ? LIMIT 1";
      
      db.query(query, [employeeId], (err, result) => {
        if (err) {
          console.error("Database query error:", err);
          return res.status(500).json({ success: false, message: "Internal server error" });
        }
        
        if (result.length === 0) {
          return res.status(404).json({ success: false, message: "Employee not found" });
        }
        
        return res.status(200).json({
          success: true,
          employee: result[0],
        });
      });
    } catch (error) {
      console.error("Unexpected error in /get-employee/:id:", error);
      return res.status(500).json({ success: false, message: "Something went wrong" });
    }
});

// API to get customer details by ID
router.get('/getcustomer/:id', authenticateToken, authorizeRoles(["Admin", "Cashier"]), (req, res) => {
  const customerId = req.params.id;
  
  const query = `SELECT CustomerID, FirstName, SecondName, Telephone, Email, Username 
                FROM Customers WHERE CustomerID = ?`;

  db.query(query, [customerId], (err, results) => {
      if (err) {
          console.error("Error fetching customer:", err);
          return res.status(500).json({ message: "Error fetching customer", error: err });
      }

      if (results.length === 0) {
          return res.status(404).json({ message: "Customer not found" });
      }

      res.status(200).json({ message: "Customer fetched successfully", customer: results[0] });
  });
});

// API to get vehicles owned by a customer
router.get('/getcustomer/:id/vehicles', authenticateToken, authorizeRoles(["Admin", "Cashier"]), (req, res) => {
  const customerId = req.params.id;
  
  const query = `SELECT v.VehicleNo, v.Model, v.Type, v.VehiclePicUrl, v.CurrentMilleage, v.NextServiceMilleage 
                FROM Vehicles v 
                WHERE v.CustomerID = ?`;

  db.query(query, [customerId], (err, results) => {
      if (err) {
          console.error("Error fetching customer vehicles:", err);
          return res.status(500).json({ message: "Error fetching customer vehicles", error: err });
      }

      if (results.length === 0) {
          return res.status(404).json({ message: "No vehicles found for this customer" });
      }

      res.status(200).json({ message: "Vehicles fetched successfully", vehicles: results });
  });
});


// Apply for leave
router.post("/apply-leave", authenticateToken, async (req, res) => {
  try {
    const { leaveDate, leaveType, reason } = req.body;
    const employeeId = req.user.employeeId;
    
    if (!leaveDate || !leaveType || !reason) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: leaveDate, leaveType, and reason are required"
      });
    }
    
    // Validate leave type
    if (!['Full Day', 'Half Day'].includes(leaveType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid leave type. Must be 'Full Day' or 'Half Day'"
      });
    }
    
    // Check if leave already exists for this date
    const checkQuery = "SELECT * FROM LeaveRequests WHERE EmployeeID = ? AND LeaveDate = ?";
    
    db.query(checkQuery, [employeeId, leaveDate], (checkErr, checkResults) => {
      if (checkErr) {
        console.error("Error checking existing leave:", checkErr);
        return res.status(500).json({
          success: false,
          message: "Database error while checking existing leave"
        });
      }
      
      if (checkResults.length > 0) {
        return res.status(400).json({
          success: false,
          message: "You already have a leave request for this date"
        });
      }
      
      // Insert new leave request
      const insertQuery = `
        INSERT INTO LeaveRequests (EmployeeID, LeaveDate, LeaveType, Reason)
        VALUES (?, ?, ?, ?)
      `;
      
      db.query(insertQuery, [employeeId, leaveDate, leaveType, reason], (insertErr, insertResults) => {
        if (insertErr) {
          console.error("Error applying for leave:", insertErr);
          return res.status(500).json({
            success: false,
            message: "Database error while applying for leave"
          });
        }
        
        return res.status(201).json({
          success: true,
          message: "Leave application submitted successfully",
          leaveId: insertResults.insertId
        });
      });
    });
  } catch (error) {
    console.error("Error in apply-leave endpoint:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

// Approve leave request
router.put("/approve-leave", authenticateToken, authorizeRoles(["Admin"]), async (req, res) => {
  try {
    const { leaveId } = req.body;
    
    if (!leaveId) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: leaveId"
      });
    }
    
    // Check if leave request exists
    const checkQuery = "SELECT * FROM LeaveRequests WHERE LeaveID = ?";
    
    db.query(checkQuery, [leaveId], (checkErr, checkResults) => {
      if (checkErr) {
        console.error("Error checking leave request:", checkErr);
        return res.status(500).json({
          success: false,
          message: "Database error while checking leave request"
        });
      }
      
      if (checkResults.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Leave request not found"
        });
      }
      
      const leaveRequest = checkResults[0];
      
      if (leaveRequest.Status === 'Approved') {
        return res.status(400).json({
          success: false,
          message: "Leave request is already approved"
        });
      }
      
      // Update leave request status
      const updateQuery = "UPDATE LeaveRequests SET Status = 'Approved' WHERE LeaveID = ?";
      
      db.query(updateQuery, [leaveId], (updateErr, updateResults) => {
        if (updateErr) {
          console.error("Error approving leave:", updateErr);
          return res.status(500).json({
            success: false,
            message: "Database error while approving leave"
          });
        }
        
        // Create attendance record for the approved leave
        const insertAttendanceQuery = `
          INSERT INTO Attendances (EmployeeID, Date, Status)
          VALUES (?, ?, 'On Leave')
        `;
        
        db.query(insertAttendanceQuery, [leaveRequest.EmployeeID, leaveRequest.LeaveDate], (attendanceErr) => {
          if (attendanceErr) {
            console.error("Error creating attendance record:", attendanceErr);
            // Continue with success response even if attendance record creation fails
          }
          
          return res.status(200).json({
            success: true,
            message: "Leave request approved successfully"
          });
        });
      });
    });
  } catch (error) {
    console.error("Error in approve-leave endpoint:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

// Reject leave request
router.put("/reject-leave", authenticateToken, authorizeRoles(["Admin"]), async (req, res) => {
  try {
    const { leaveId, rejectionReason } = req.body;
    
    if (!leaveId) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: leaveId"
      });
    }
    
    // Check if leave request exists
    const checkQuery = "SELECT * FROM LeaveRequests WHERE LeaveID = ?";
    
    db.query(checkQuery, [leaveId], (checkErr, checkResults) => {
      if (checkErr) {
        console.error("Error checking leave request:", checkErr);
        return res.status(500).json({
          success: false,
          message: "Database error while checking leave request"
        });
      }
      
      if (checkResults.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Leave request not found"
        });
      }
      
      const leaveRequest = checkResults[0];
      
      if (leaveRequest.Status !== 'Not Approved') {
        return res.status(400).json({
          success: false,
          message: "Cannot reject a leave request that has already been processed"
        });
      }
      
      // Update leave request status
      const updateQuery = `
        UPDATE LeaveRequests 
        SET Status = 'Rejected', 
            Reason = CONCAT(Reason, '\nRejection reason: ', ?)
        WHERE LeaveID = ?
      `;
      
      db.query(updateQuery, [rejectionReason || 'No reason provided', leaveId], (updateErr, updateResults) => {
        if (updateErr) {
          console.error("Error rejecting leave:", updateErr);
          return res.status(500).json({
            success: false,
            message: "Database error while rejecting leave"
          });
        }
        
        return res.status(200).json({
          success: true,
          message: "Leave request rejected successfully"
        });
      });
    });
  } catch (error) {
    console.error("Error in reject-leave endpoint:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});
















  
  
  
  
  
  
  
  
  


module.exports = router;

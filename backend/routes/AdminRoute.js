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

            const employee = result[0]; // The employee record from DB

            // Compare hashed password with the stored password
            const match = await bcrypt.compare(password, employee.Password);
            if (!match) {
                return res.status(400).json({ error: true, message: "Invalid password" });
            }
            console.log("🔹 Assigned Role in JWT:", employee.Role);

            // Generate JWT token for the employee
            const accessToken = jwt.sign(
                { EmployeeID: employee.EmployeeID, email: employee.email, role: employee.Role },
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
    const { name, phone, role, username, password, email, profilePicUrl } = req.body;

// Convert to expected backend format
            const Name = name;
            const Phone = phone;
            const Role = role;
            const Username = username;
            const Password = password;
            const Email = email;
            const ProfilePicUrl = profilePicUrl;

            if (!Name || !Email || !Password || !Role || !Phone || !Username || !ProfilePicUrl && ProfilePicUrl !== "") {
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

        // Insert new employee into the database with Rating set to 0.0
        const insertQuery = `INSERT INTO Employees (EmployeeID, Name, Phone, Role, Username, Password, Email, ProfilePicUrl, Rating) 
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await new Promise((resolve, reject) => {
            db.query(insertQuery, [EmployeeID, Name, Phone, Role, Username, hashedPassword, Email, ProfilePicUrl, 0.0], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        console.log("New Employee Created:", EmployeeID);

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

        if (!id) {
            return res.status(400).json({ error: true, message: "Employee ID is required" });
        }

        const deleteQuery = "DELETE FROM employees WHERE EmployeeID = ?";

        db.query(deleteQuery, [id], (err, result) => {
            if (err) {
                console.error("Database query error:", err);
                return res.status(500).json({ error: true, message: "Internal server error" });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: true, message: "Employee not found" });
            }

            return res.status(200).json({
                success: true,
                message: "Employee deleted successfully",
            });
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

        if (!status) {
            return res.status(400).json({ error: true, message: "Status is required." });
        }

        if (!["Present", "Absent", "On Leave"].includes(status)) {
            return res.status(400).json({
                error: true,
                message: "Invalid status. Status should be one of 'Present', 'Absent', or 'On Leave'.",
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










  
  
  
  
  
  
  
  
  


module.exports = router;

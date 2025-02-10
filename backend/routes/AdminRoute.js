const express = require("express");
const bcrypt = require("bcryptjs"); // ✅ Import bcrypt
const db = require("../db");
const {generateEmployeeId}=require("../GenerateId")
const { validateEmail, validatePhoneNumber } = require("../validations");
const jwt = require("jsonwebtoken");
const{authenticateToken,authorizeRoles}=require("../utilities");
const moment = require("moment");

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

            // Generate JWT token for the employee
            const accessToken = jwt.sign(
                { EmployeeID: employee.EmployeeID, email: employee.email, role: employee.Role },
                process.env.ACCESS_TOKEN_SECRET, // Make sure to set this in your .env file
                { expiresIn: "1h" } // Token expires in 1 hour
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











module.exports = router;

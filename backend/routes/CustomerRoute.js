const express = require("express");
const bcrypt = require("bcryptjs"); // ✅ Import bcrypt
const db = require("../db");
const generateCustomerId = require("../GenerateId");
const { validateEmail, validatePhoneNumber } = require("../validations");
const jwt = require("jsonwebtoken");
const{authenticateToken,authorizeRoles}=require("../utilities")

const router = express.Router();

router.use((req, res, next) => {
    console.log("Customer Route Hit:", req.method, req.url);
    next();
});

router.post("/customer-signup", async (req, res) => {
    try {
        console.log("Inside /customer-signup route handler");

        const { FirstName, SecondName, Telephone, Email, Password, Username } = req.body;

        if (!FirstName || !Email || !Password || !Username) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        if (!validateEmail(Email)) {
            return res.status(400).json({ error: "Invalid email format" });
        }

        if (!validatePhoneNumber(Telephone)) {
            return res.status(400).json({ error: "Invalid phone number format" });
        }

        // ✅ Fix: Hash the password correctly
        const hashedPassword = await bcrypt.hash(Password, 10); 

        const CustomerId = await generateCustomerId();
        const query = "INSERT INTO Customers (CustomerID, FirstName, SecondName, Telephone, Email, Password, Username) VALUES (?, ?, ?, ?, ?, ?, ?)";
        const values = [CustomerId, FirstName, SecondName, Telephone, Email, hashedPassword, Username];

        db.query(query, values, (err, result) => {
            if (err) {
                console.error("Error inserting customer:", err);
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ success: true, message: "Customer registered successfully!", CustomerId });
        });

    } catch (error) {
        console.error("Error generating Customer ID:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.post("/customer-login", async (req, res) => {
    const { email, password } = req.body;

    // Check if email and password are provided
    if (!email || !password) {
        return res.status(400).json({ error: true, message: "All parameters required" });
    }

    try {
        // Query to check if customer exists
        const query = "SELECT * FROM customers WHERE email = ?";
        db.query(query, [email], async (err, result) => {
            if (err) {
                console.error("Database query error:", err);
                return res.status(500).json({ error: true, message: "Internal server error" });
            }

            // If no user found
            if (result.length === 0) {
                return res.status(404).json({ error: true, message: "Customer not found" });
            }

            const customer = result[0]; // The customer record from DB

            // Compare hashed password with the stored password
            const match = await bcrypt.compare(password, customer.Password);
            if (!match) {
                return res.status(400).json({ error: true, message: "Invalid password" });
            }

            // Generate JWT token for the user
            const accessToken = jwt.sign(
                { customerId: customer.CustomerID, email: customer.Email,role: "Customer" },
                process.env.ACCESS_TOKEN_SECRET, // Make sure to set this in your .env file
                { expiresIn: '1h' } // Optional: set expiration for the token
            );

            // Send success response with token
            res.status(200).json({
                success: true,
                message: "Login successful",
                accessToken,
            });
        });
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ error: true, message: "Internal server error" });
    }
});

router.get("/get-info", authenticateToken,authorizeRoles(['Customer']), async (req, res) => {
    try {
        const { customerId } = req.user; // Extract customerId from the token
        const query = "SELECT * FROM customers WHERE CustomerID = ?";
        
        db.query(query, [customerId], (err, result) => {
            if (err) {
                console.error("Error fetching customer info:", err);
                return res.status(500).json({ message: "Internal server error" });
            }

            // If customer not found
            if (result.length === 0) {
                return res.status(404).json({ message: "Customer not found" });
            }

            // Send customer info
            res.status(200).json({
                success: true,
                message: "Customer information retrieved successfully",
                customerInfo: result[0], // Send the first (and only) row of the result
            });
        });

    } catch (error) {
        console.error("Error during /get-info:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.post("/add-vehicle", authenticateToken,authorizeRoles(['Customer']),  async (req, res) => {
    try {
        const { customerId } = req.user;
        const { VehicleNo, Model, Type, VehiclePicUrl } = req.body;  // Include VehiclePicUrl if needed

        if (!VehicleNo || !Model || !Type) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Check if the VehicleNo already exists
        const checkQuery = "SELECT * FROM Vehicles WHERE VehicleNo = ?";
        db.query(checkQuery, [VehicleNo], (err, result) => {
            if (err) {
                console.error("Error checking vehicle number:", err);
                return res.status(500).json({ error: err.message });
            }

            if (result.length > 0) {
                // Vehicle number already exists
                return res.status(400).json({ error: "Vehicle number already registered" });
            }

            // Insert the new vehicle if no duplicate found
            const insertQuery = "INSERT INTO Vehicles (VehicleNo, Model, Type, CustomerID, VehiclePicUrl) VALUES (?, ?, ?, ?, ?)";
            const values = [VehicleNo, Model, Type, customerId, VehiclePicUrl || null];  // Use null if no VehiclePicUrl

            db.query(insertQuery, values, (err, result) => {
                if (err) {
                    console.error("Error inserting vehicle:", err);
                    return res.status(500).json({ error: err.message });
                }
                res.status(201).json({ success: true, message: "Vehicle added successfully!", VehicleNo });
            });
        });
    } catch (error) {
        console.error("Error during /add-vehicle:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});




module.exports = router;

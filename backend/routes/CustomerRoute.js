const express = require("express");
const bcrypt = require("bcryptjs"); // ✅ Import bcrypt
const db = require("../db");
const {generateCustomerId,generateNotificationId}=require("../GenerateId")
const { validateEmail, validatePhoneNumber } = require("../validations");
const jwt = require("jsonwebtoken");
const{authenticateToken,authorizeRoles}=require("../utilities")
const admin=require("firebase-admin");
const router = express.Router();

router.use((req, res, next) => {
    console.log("Customer Route Hit:", req.method, req.url);
    next();
});

router.post("/customer-signup", async (req, res) => {
    try {
        console.log("Inside /customer-signup route handler");

        const { FirstName, SecondName, Telephone, Email, Password, Username, profilePicUrl, FirebaseToken } = req.body;

        if (!FirstName || !Email || !Password || !Username || !FirebaseToken) {
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

        // Set default profilePicUrl if not provided
        const defaultProfilePicUrl = "https://example.com/default-profile-pic.png"; // Replace with your default image URL
        const profilePic = profilePicUrl || defaultProfilePicUrl; // Use provided URL or fallback to default
        console.log("generateCustomerId:", generateCustomerId); 
        // Generate Customer ID (use await here)
        const CustomerId = await generateCustomerId(); 

        const query = "INSERT INTO Customers (CustomerID, FirstName, SecondName, Telephone, Email, Password, Username, profilePicUrl, FirebaseToken) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        const values = [CustomerId, FirstName, SecondName, Telephone, Email, hashedPassword, Username, profilePic, FirebaseToken];

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
                customerId: customer.CustomerID 
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

router.get("/get-vehicles",authenticateToken,async(req,res)=>{
    try{
        const { customerId } = req.user; // Extract customerId from the token
        const query = "SELECT * FROM vehicles WHERE CustomerID = ?";

        db.query(query, [customerId], (err, result) => {
            if (err) {
                console.error("Error fetching customer info:", err);
                return res.status(500).json({ message: "Internal server error" });
            }

            // If customer not found
            if (result.length === 0) {
                return res.status(404).json({ message: "Vehicles not found" });
            }

            // Send customer info
            res.status(200).json({
                success: true,
                message: "Vehicle information retrieved successfully",
                vehicleInfo: result, // Send the first (and only) row of the result
            });
        });
    }catch(error){
        console.error("Error during /get-vehicles:", error);
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

router.get('/getcustomers', authenticateToken, authorizeRoles(["Admin", "Cashier"]), (req, res) => {
    const query = `SELECT CustomerID, FirstName, SecondName, Telephone, Email, Username FROM Customers`;

    db.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching customers:", err);
            return res.status(500).json({ message: "Error fetching customers", error: err });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: "No customers found" });
        }

        res.status(200).json({ message: "Customers fetched successfully", customers: results });
    });
});


// Update your API endpoint to match the parameter names sent from the app
router.post('/update-fcm-token', (req, res) => {
    const { customerId, firebaseToken } = req.body;
  
    console.log('FCM token update request received:', { customerId, firebaseToken });
  
    if (!customerId || !firebaseToken) {
      console.log('Missing required parameters:', { customerId, firebaseToken });
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters',
      });
    }
  
    const query = `UPDATE Customers SET FirebaseToken = ? WHERE CustomerID = ?`;
  
    db.query(query, [firebaseToken, customerId], (err, result) => {
      if (err) {
        console.error('Error updating FCM token:', err);
        return res.status(500).json({ success: false, message: 'Internal server error' });
      }
  
      console.log('Database update result:', result);
  
      if (result.affectedRows === 1) {
        console.log('FCM token updated successfully for customer:', customerId);
        return res.status(200).json({ success: true });
      } else {
        console.log('Customer not found:', customerId);
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }
    });
  });


router.get("/notifications", authenticateToken, async (req, res) => {

    const customerID = req.user.customerId;
    
    try {
      const query = `
        SELECT * FROM notifications 
        WHERE CustomerID = ? 
        ORDER BY created_at DESC 
        LIMIT 50`;
        
      db.query(query, [customerID], (err, results) => {
        if (err) {
          console.error("Error fetching notifications:", err);
          return res.status(500).json({ error: true, message: "Database error" });
        }
        
        return res.status(200).json({
          success: true,
          notifications: results
        });
      });
    } catch (error) {
      console.error("Error retrieving notifications:", error);
      return res.status(500).json({ error: true, message: "Server error" });
    }
});

router.get("/getjobcards/:vehicleno", authenticateToken, authorizeRoles(["Customer"]), async (req, res) => {
    const customerId = req.user.customerId;
    const vehicleNo = req.params.vehicleno;

    try {
        // Step 1: Verify vehicle belongs to customer
        const vehicleQuery = `
            SELECT * FROM Vehicles
            WHERE VehicleNo = ? AND CustomerID = ?
        `;

        db.query(vehicleQuery, [vehicleNo, customerId], (vehErr, vehicleResults) => {
            if (vehErr) {
                console.error("Error verifying vehicle ownership:", vehErr);
                return res.status(500).json({ message: "Error verifying vehicle" });
            }

            if (vehicleResults.length === 0) {
                return res.status(403).json({ message: "Vehicle not found or doesn't belong to this customer" });
            }

            // Step 2: Get appointments related to this vehicle
            const appointmentQuery = `
                SELECT AppointmentID FROM Appointments
                WHERE VehicleID = ?
            `;

            db.query(appointmentQuery, [vehicleNo], (apptErr, appointments) => {
                if (apptErr) {
                    console.error("Error fetching appointments:", apptErr);
                    return res.status(500).json({ message: "Error fetching appointments" });
                }

                if (appointments.length === 0) {
                    return res.status(200).json({ message: "No appointments found for this vehicle", data: [] });
                }

                // Step 3: For each appointment, get job cards
                const allJobCards = [];
                let completed = 0;

                appointments.forEach(appt => {
                    const jobCardQuery = `
                        SELECT * FROM JobCards
                        WHERE AppointmentID = ?
                    `;

                    db.query(jobCardQuery, [appt.AppointmentID], (jobErr, jobCards) => {
                        if (jobErr) {
                            console.error(`Error fetching job cards for appointment ${appt.AppointmentID}:`, jobErr);
                            return res.status(500).json({ message: "Error fetching job cards" });
                        }

                        allJobCards.push({
                            VehicleID: vehicleNo,
                            AppointmentID: appt.AppointmentID,
                            JobCards: jobCards
                        });

                        completed++;
                        if (completed === appointments.length) {
                            return res.status(200).json({
                                message: "Job cards fetched successfully",
                                data: allJobCards
                            });
                        }
                    });
                });
            });
        });
    } catch (error) {
        console.error("Unexpected error:", error);
        return res.status(500).json({ message: "Internal server error", error });
    }
});



router.get("/servicerecords/:jobcardid",authenticateToken, async (req, res) => {
    const jobCardId = req.params.jobcardid;
    // Get the job card ID from the request parameters

    try {
        // Query to fetch service records for the given job card ID
        const query = `
            SELECT * FROM servicerecords 
            WHERE JobCardID = ?
        `;

        db.query(query, [jobCardId], (err, results) => {
            if (err) {
                console.error("Error fetching service records:", err);
                return res.status(500).json({ error: true, message: "Database error" });
            }

            if (results.length === 0) {
                return res.status(404).json({ error: true, message: "No service records found for this job card" });
            }

            return res.status(200).json({
                success: true,
                serviceRecords: results
            });
        });
    } catch (error) {
        console.error("Error retrieving service records:", error);
        return res.status(500).json({ error: true, message: "Server error" });
    }
});



  




module.exports = router;

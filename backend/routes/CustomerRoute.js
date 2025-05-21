const express = require("express");
const bcrypt = require("bcryptjs"); // ✅ Import bcrypt
const db = require("../db");
const {generateCustomerId,generateNotificationId}=require("../GenerateId")
const { validateEmail, validatePhoneNumber } = require("../validations");
const jwt = require("jsonwebtoken");
const{authenticateToken,authorizeRoles}=require("../utilities")
const admin=require("firebase-admin");
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// router.use((req, res, next) => {
//     console.log("Customer Route Hit:", req.method, req.url);
//     next();
// });



const transporter = nodemailer.createTransport({
  service: 'gmail', // Replace with your email service
  auth: {
    user: process.env.EMAIL_USER, // Use environment variables
    pass: process.env.EMAIL_PASSWORD,
  },
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
                { expiresIn: '24h' } // Optional: set expiration for the token
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

router.post("/add-vehicle", authenticateToken, authorizeRoles(['Customer']), async (req, res) => {
    try {
        const { customerId } = req.user;
        const { VehicleNo, Model, Type, VehiclePicUrl, CurrentMilleage } = req.body;

        if (!VehicleNo || !Model || !Type || CurrentMilleage === undefined) {
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
                return res.status(400).json({ error: "Vehicle number already registered" });
            }

            // Insert the new vehicle
            const insertQuery = `
                INSERT INTO Vehicles (VehicleNo, Model, Type, CustomerID, VehiclePicUrl, CurrentMilleage) 
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            const values = [VehicleNo, Model, Type, customerId, VehiclePicUrl || null, CurrentMilleage];

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

router.put("/update-milleage/:VehicleNo", authenticateToken, authorizeRoles(['Customer']), async (req, res) => {
    try {
        const { VehicleNo } = req.params;
        const { CurrentMilleage } = req.body;
        const { customerId } = req.user;

        if (CurrentMilleage === undefined) {
            return res.status(400).json({ error: "CurrentMilleage is required" });
        }

        // Check if the vehicle belongs to the customer and get the current mileage
        const checkQuery = "SELECT CurrentMilleage FROM Vehicles WHERE VehicleNo = ? AND CustomerID = ?";
        db.query(checkQuery, [VehicleNo, customerId], (err, result) => {
            if (err) {
                console.error("Error checking vehicle:", err);
                return res.status(500).json({ error: err.message });
            }

            if (result.length === 0) {
                return res.status(403).json({ error: "You are not authorized to update this vehicle's mileage" });
            }

            const existingMileage = result[0].CurrentMilleage;
            if (CurrentMilleage <= existingMileage) {
                return res.status(400).json({ error: `New mileage (${CurrentMilleage}) must be greater than existing mileage (${existingMileage})` });
            }

            // Update mileage
            const updateQuery = "UPDATE Vehicles SET CurrentMilleage = ? WHERE VehicleNo = ?";
            db.query(updateQuery, [CurrentMilleage, VehicleNo], (err, updateResult) => {
                if (err) {
                    console.error("Error updating mileage:", err);
                    return res.status(500).json({ error: err.message });
                }

                res.status(200).json({ success: true, message: "Mileage updated successfully!" });
            });
        });
    } catch (error) {
        console.error("Error during /update-milleage:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.get("/get-mileage/:VehicleNo", authenticateToken, async (req, res) => {
    try {
        const { VehicleNo } = req.params;

        const query = `
            SELECT 
                CurrentMilleage, 
                NextServiceMilleage 
            FROM Vehicles 
            WHERE VehicleNo = ?
        `;

        db.query(query, [VehicleNo], (err, results) => {
            if (err) {
                console.error("Database error:", err);
                return res.status(500).json({ error: "Database error" });
            }

            if (results.length === 0) {
                return res.status(404).json({ error: "Vehicle not found" });
            }

            const vehicle = results[0];

            res.status(200).json({
                success: true,
                data: {
                    vehicleNo: VehicleNo,
                    currentMileage: vehicle.CurrentMilleage,
                    nextServiceMileage: vehicle.NextServiceMilleage
                }
            });
        });
    } catch (error) {
        console.error("Error in /get-mileage:", error);
        res.status(500).json({ error: "Internal server error" });
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
                WHERE VehicleID = ? AND Status != 'Cancelled'
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

router.get("/get-notconfirmed-appointments", authenticateToken, async (req, res) => {
    const customerId = req.user.customerId;
    try {
        const query = `
            SELECT a.*, v.Model as VehicleModel 
            FROM Appointments a
            LEFT JOIN Vehicles v ON a.VehicleID = v.VehicleNo
            WHERE a.CustomerID = ? AND a.Status = 'Not Confirmed'
        `;
        
        db.query(query, [customerId], (err, results) => {
            if (err) {
                console.error("Error fetching pending appointments:", err);
                return res.status(500).json({ 
                    success: false, 
                    message: "Error fetching pending appointments", 
                    error: err 
                });
            }
            
            // Format dates if needed
            const appointments = results.map(appointment => {
                // Convert date objects to ISO strings for consistent JSON serialization
                if (appointment.AppointmentDate instanceof Date) {
                    appointment.AppointmentDate = appointment.AppointmentDate.toISOString();
                }
                if (appointment.AppointmentMadeDate instanceof Date) {
                    appointment.AppointmentMadeDate = appointment.AppointmentMadeDate.toISOString();
                }
                return appointment;
            });
            
            return res.status(200).json({
                success: true,
                message: "Pending appointments retrieved successfully",
                appointments: appointments,
                count: appointments.length
            });
        });
    } catch (error) {
        console.error("Error in get-notconfirmed-appointments route:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Internal server error", 
            error: error.message 
        });
    }
});


router.get("/get-assigned-workers/:JobCardId", authenticateToken, async (req, res) => {
    const { JobCardId } = req.params;
    
    try {
        // Validate the JobCardId parameter
        if (!JobCardId) {
            return res.status(400).json({
                success: false,
                message: "JobCardId is required"
            });
        }
        
        // First check if the job card exists
        const jobCardQuery = "SELECT * FROM JobCards WHERE JobCardID = ?";
        
        db.query(jobCardQuery, [JobCardId], (err, jobCardResult) => {
            if (err) {
                console.error("Error checking job card:", err);
                return res.status(500).json({
                    success: false,
                    message: "Error checking job card",
                    error: err
                });
            }
            
            if (jobCardResult.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Job card not found"
                });
            }
            
            // Query to get assigned mechanics with their details from Employees table
            const assignedMechanicsQuery = `
                SELECT ma.JobCardID, ma.EmployeeID, 
                       e.Name ,e.Role, e.Rating, e.ProfilePicUrl
                FROM Mechanics_Assigned ma
                JOIN Employees e ON ma.EmployeeID = e.EmployeeID
                WHERE ma.JobCardID = ?
                ORDER BY e.Role, e.Rating DESC
            `;
            
            db.query(assignedMechanicsQuery, [JobCardId], (err, mechanics) => {
                if (err) {
                    console.error("Error fetching assigned mechanics:", err);
                    return res.status(500).json({
                        success: false,
                        message: "Error fetching assigned mechanics",
                        error: err
                    });
                }
                
                // Format the response data
                const formattedMechanics = mechanics.map(mechanic => {
                    return {
                        employeeId: mechanic.EmployeeID,
                        name: `${mechanic.Name}`,
                        role: mechanic.Role,
                        rating: mechanic.Rating,
                        profilePicUrl: mechanic.ProfilePicUrl || null
                    };
                });
                
                // Return the response
                return res.status(200).json({
                    success: true,
                    message: "Assigned mechanics retrieved successfully",
                    jobCardId: JobCardId,
                    assignedMechanics: formattedMechanics,
                    count: formattedMechanics.length
                });
            });
        });
    } catch (error) {
        console.error("Unhandled error in get-assigned-workers route:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
});

router.get("/get-notfinished-jobcards", authenticateToken, async (req, res) => {
    try {
        // Get the customer ID from the authenticated user
        const customerId = req.user.customerId;
        
        if (!customerId) {
            return res.status(400).json({
                success: false,
                message: "Customer ID not found in authentication token"
            });
        }
        
        // First query to get job cards that belong to the logged-in user and are not finished
        const jobCardsQuery = `
            SELECT jc.*, a.Date as AppointmentDate, a.Time as AppointmentTime, 
                   v.Model as VehicleModel, v.Type as VehicleType, v.VehicleNo
            FROM JobCards jc
            JOIN Appointments a ON jc.AppointmentID = a.AppointmentID
            JOIN Vehicles v ON a.VehicleID = v.VehicleNo
            WHERE a.CustomerID = ? AND jc.Status NOT IN ('Paid')

            ORDER BY jc.JobCardID DESC
        `;
        
        db.query(jobCardsQuery, [customerId], (err, jobCards) => {
            if (err) {
                console.error("Error fetching job cards:", err);
                return res.status(500).json({
                    success: false,
                    message: "Error fetching job cards",
                    error: err
                });
            }
            
            // If no job cards found, return empty array
            if (jobCards.length === 0) {
                return res.status(200).json({
                    success: true,
                    jobCards: [],
                    count: 0
                });
            }
            
            // Extract job card IDs for the second query
            const jobCardIds = jobCards.map(jobCard => jobCard.JobCardID);
            
            // Second query to get service records for these job cards
            const serviceRecordsQuery = `
                SELECT sr.*
                FROM ServiceRecords sr
                WHERE sr.JobCardID IN (?)
                ORDER BY sr.ServiceRecord_ID
            `;
            
            db.query(serviceRecordsQuery, [jobCardIds], (err, serviceRecords) => {
                if (err) {
                    console.error("Error fetching service records:", err);
                    return res.status(500).json({
                        success: false,
                        message: "Error fetching service records",
                        error: err
                    });
                }
                
                // Format dates for consistent JSON serialization
                const formattedJobCards = jobCards.map(jobCard => {
                    // Format the appointment date
                    if (jobCard.AppointmentDate instanceof Date) {
                        jobCard.AppointmentDate = jobCard.AppointmentDate.toISOString();
                    }
                    
                    // Add service records related to this job card
                    const jobCardServices = serviceRecords.filter(
                        record => record.JobCardID === jobCard.JobCardID
                    );
                    
                    // Return the job card with its service records
                    return {
                        ...jobCard,
                        Services: jobCardServices
                    };
                });
                
                return res.status(200).json({
                    success: true,
                    jobCards: formattedJobCards,
                    count: formattedJobCards.length
                });
            });
        });
    } catch (error) {
        console.error("Unhandled error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
});


router.get("/getjobcard/:id", authenticateToken, async (req, res) => {
    try {
        // Get the customer ID from the authenticated user
        const customerId = req.user.customerId;
        const jobCardId = req.params.id;
        
        if (!customerId) {
            return res.status(400).json({
                success: false,
                message: "Customer ID not found in authentication token"
            });
        }
        
        if (!jobCardId) {
            return res.status(400).json({
                success: false,
                message: "Job card ID is required"
            });
        }
        
        // First query to get the specific job card that belongs to the logged-in user
        const jobCardQuery = `
            SELECT jc.*, a.Date as AppointmentDate, a.Time as AppointmentTime, 
                   v.Model as VehicleModel, v.Type as VehicleType, v.VehicleNo
            FROM JobCards jc
            JOIN Appointments a ON jc.AppointmentID = a.AppointmentID
            JOIN Vehicles v ON a.VehicleID = v.VehicleNo
            WHERE a.CustomerID = ? AND jc.JobCardID = ?
        `;
        
        db.query(jobCardQuery, [customerId, jobCardId], (err, jobCards) => {
            if (err) {
                console.error("Error fetching job card:", err);
                return res.status(500).json({
                    success: false,
                    message: "Error fetching job card",
                    error: err
                });
            }
            
            // If job card not found, return appropriate message
            if (jobCards.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Job card not found or does not belong to the authenticated user"
                });
            }
            
            // Second query to get service records for this job card
            const serviceRecordsQuery = `
                SELECT sr.*
                FROM ServiceRecords sr
                WHERE sr.JobCardID = ?
                ORDER BY sr.ServiceRecord_ID
            `;
            
            db.query(serviceRecordsQuery, [jobCardId], (err, serviceRecords) => {
                if (err) {
                    console.error("Error fetching service records:", err);
                    return res.status(500).json({
                        success: false,
                        message: "Error fetching service records",
                        error: err
                    });
                }
                
                // Format dates for consistent JSON serialization
                const formattedJobCards = jobCards.map(jobCard => {
                    // Format the appointment date
                    if (jobCard.AppointmentDate instanceof Date) {
                        jobCard.AppointmentDate = jobCard.AppointmentDate.toISOString();
                    }
                    
                    // Return the job card with its service records
                    return {
                        ...jobCard,
                        Services: serviceRecords
                    };
                });
                
                return res.status(200).json({
                    success: true,
                    jobCards: formattedJobCards,
                    count: formattedJobCards.length
                });
            });
        });
    } catch (error) {
        console.error("Unhandled error in getjobcard/:id route:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
});


router.put("/pay-invoice-cash/:InvoiceID", authenticateToken, authorizeRoles(['Customer']), async (req, res) => {
    try {
      const { InvoiceID } = req.params;
      
      // Update the invoice status to "Paid" and set the payment method to "Cash"
      const updateQuery = `
        UPDATE Invoice 
        SET  PaymentMethod = 'Cash',
            PaymentDate = CURRENT_TIMESTAMP
        WHERE Invoice_ID = ?
      `;
      
      db.query(updateQuery, [InvoiceID], (err, result) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({
            success: false,
            message: "Failed to update invoice payment status",
            error: err.message
          });
        }
        
        if (result.affectedRows === 0) {
          return res.status(404).json({
            success: false,
            message: "Invoice not found or already paid"
          });
        }
        
        return res.status(200).json({
          success: true,
          message: "Invoice marked as paid successfully",
          invoiceId: InvoiceID
        });
      });
      
    } catch (error) {
      console.error("Error updating invoice payment:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to process payment",
        error: error.message
      });
    }
  });
  

// GET endpoint to retrieve pending invoices for the logged-in customer
// Adjust the path to your database connection

router.get("/pending-invoices", authenticateToken, async (req, res) => {
  try {
    const customerId = req.user.customerId; // Assuming the customer ID is stored in the token
    
    // Simplified query to get just pending invoices info
    const query = `
      SELECT i.Invoice_ID, i.Total, i.Parts_Cost, i.Labour_Cost, i.GeneratedDate, 
             i.PaidStatus, j.JobCardID, a.AppointmentID, v.VehicleNo, v.Model
      FROM Invoice i
      INNER JOIN JobCards j ON i.JobCard_ID = j.JobCardID
      INNER JOIN Appointments a ON j.AppointmentID = a.AppointmentID
      INNER JOIN Vehicles v ON a.VehicleID = v.VehicleNo
      WHERE a.CustomerID = ? AND i.PaidStatus = 'Pending'
      ORDER BY i.GeneratedDate DESC
    `;
    
    db.query(query, [customerId], (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch pending invoices",
          error: err.message
        });
      }
      
      return res.status(200).json({
        success: true,
        message: results.length > 0 ? "Pending invoices retrieved successfully" : "No pending invoices found",
        count: results.length,
        data: results
      });
    });
    
  } catch (error) {
    console.error("Error fetching pending invoices:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch pending invoices",
      error: error.message
    });
  }
});

router.get("/pending-breakdown-invoices", authenticateToken, async (req, res) => {
  try {
    const customerId = req.user.customerId; // Assuming the customer ID is stored in the token
    
    // Query to get pending invoices from breakdown services
    const query = `
      SELECT i.Invoice_ID, i.Total, i.Parts_Cost, i.Labour_Cost, i.GeneratedDate, 
             i.PaidStatus, i.Notes, br.RequestID, br.Description
      FROM Invoice i
      INNER JOIN BreakdownRequests br ON br.InvoiceID = i.Invoice_ID
      WHERE br.CustomerID = ? AND i.PaidStatus = 'Pending'
      ORDER BY i.GeneratedDate DESC
    `;
    
    db.query(query, [customerId], (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch pending breakdown invoices",
          error: err.message
        });
      }
      
      return res.status(200).json({
        success: true,
        message: results.length > 0 ? "Pending breakdown invoices retrieved successfully" : "No pending breakdown invoices found",
        count: results.length,
        data: results
      });
    });
    
  } catch (error) {
    console.error("Error fetching pending breakdown invoices:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch pending breakdown invoices",
      error: error.message
    });
  }
});

router.get("/all-pending-invoices", authenticateToken, async (req, res) => {
  try {
    const customerId = req.user.customerId;
    
    // Query for regular service invoices
    const regularInvoicesQuery = `
      SELECT i.Invoice_ID, i.Total, i.Parts_Cost, i.Labour_Cost, i.GeneratedDate, 
             i.PaidStatus, j.JobCardID, a.AppointmentID, v.VehicleNo, v.Model,
             'service' as invoiceType
      FROM Invoice i
      INNER JOIN JobCards j ON i.JobCard_ID = j.JobCardID
      INNER JOIN Appointments a ON j.AppointmentID = a.AppointmentID
      INNER JOIN Vehicles v ON a.VehicleID = v.VehicleNo
      WHERE a.CustomerID = ? AND i.PaidStatus = 'Pending'
    `;
    
    // Query for breakdown service invoices
    const breakdownInvoicesQuery = `
      SELECT i.Invoice_ID, i.Total, i.Parts_Cost, i.Labour_Cost, i.GeneratedDate, 
             i.PaidStatus, NULL as JobCardID, NULL as AppointmentID, 
             NULL as VehicleNo, NULL as Model, br.RequestID, br.Description,
             'breakdown' as invoiceType
      FROM Invoice i
      INNER JOIN BreakdownRequests br ON br.InvoiceID = i.Invoice_ID
      WHERE br.CustomerID = ? AND i.PaidStatus = 'Pending'
    `;
    
    db.query(regularInvoicesQuery, [customerId], (err1, regularResults) => {
      if (err1) {
        console.error("Database error for regular invoices:", err1);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch regular pending invoices",
          error: err1.message
        });
      }
      
      db.query(breakdownInvoicesQuery, [customerId], (err2, breakdownResults) => {
        if (err2) {
          console.error("Database error for breakdown invoices:", err2);
          return res.status(500).json({
            success: false,
            message: "Failed to fetch breakdown pending invoices",
            error: err2.message
          });
        }
        
        // Combine both results
        const allResults = [...regularResults, ...breakdownResults];
        
        return res.status(200).json({
          success: true,
          message: allResults.length > 0 ? "Pending invoices retrieved successfully" : "No pending invoices found",
          count: allResults.length,
          data: allResults
        });
      });
    });
    
  } catch (error) {
    console.error("Error fetching all pending invoices:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch pending invoices",
      error: error.message
    });
  }
});


router.delete("/cancel-appointment/:AppointmentID", authenticateToken, authorizeRoles(['Customer']), async (req, res) => {
    try {
      const { AppointmentID } = req.params;
      const customerId = req.user.customerId; // Using customerId from token
      
      console.log(`Attempting to cancel appointment ${AppointmentID} for customer ${customerId}`);
      
      // First, verify that the appointment belongs to the authenticated customer
      const verifyQuery = `
        SELECT a.*, j.JobCardID 
        FROM Appointments a
        LEFT JOIN JobCards j ON a.AppointmentID = j.AppointmentID
        WHERE a.AppointmentID = ? AND a.CustomerID = ?
      `;
      
      db.query(verifyQuery, [AppointmentID, customerId], (err, results) => {
        if (err) {
          console.error("Database error during verification:", err);
          return res.status(500).json({
            success: false,
            message: "Failed to verify appointment ownership",
            error: err.message
          });
        }
        
        console.log(`Verification results: ${JSON.stringify(results)}`);
        
        if (results.length === 0) {
          console.log(`No appointment found with ID ${AppointmentID} for customer ${customerId}`);
          return res.status(404).json({
            success: false,
            message: "Appointment not found or does not belong to you"
          });
        }
        
        // Check if the appointment has an associated job card
        if (results[0].JobCardID) {
          console.log(`Cannot cancel appointment ${AppointmentID} - JobCard ${results[0].JobCardID} already exists`);
          return res.status(400).json({
            success: false,
            message: "Cannot cancel appointment that has already started processing"
          });
        }
        
        // Check appointment date to ensure it's not in the past
        const appointmentDate = new Date(results[0].AppointmentDate);
        const currentDate = new Date();
        
        console.log(`Appointment date: ${appointmentDate}, Current date: ${currentDate}`);
        
        if (appointmentDate < currentDate) {
          console.log(`Cannot cancel past appointment ${AppointmentID}`);
          return res.status(400).json({
            success: false,
            message: "Cannot cancel appointments that have already passed"
          });
        }
        
        // If all checks pass, proceed with cancellation
        const cancelQuery = `
          UPDATE Appointments 
          SET Status = 'Cancelled'
          WHERE AppointmentID = ?
        `;
        
        console.log(`Executing cancellation query for appointment ${AppointmentID}`);
        
        db.query(cancelQuery, [AppointmentID], (err, result) => {
          if (err) {
            console.error("Database error during cancellation:", err);
            return res.status(500).json({
              success: false,
              message: "Failed to cancel appointment",
              error: err.message
            });
          }
          
          console.log(`Cancellation result: ${JSON.stringify(result)}`);
          
          if (result.affectedRows === 0) {
            console.log(`No rows affected when cancelling appointment ${AppointmentID}`);
            return res.status(404).json({
              success: false,
              message: "Appointment not found or already cancelled"
            });
          }
          
          console.log(`Successfully cancelled appointment ${AppointmentID}`);
          return res.status(200).json({
            success: true,
            message: "Appointment cancelled successfully",
            appointmentId: AppointmentID
          });
        });
      });
      
    } catch (error) {
      console.error("Unexpected error in cancel-appointment:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to cancel appointment",
        error: error.message
      });
    }
});

router.post("/breakdown/request", authenticateToken, authorizeRoles(['Customer']), async (req, res) => {
    try {
      const { latitude, longitude, description, contactName, contactPhone } = req.body;
      const customerId = req.user.customerId;
      
      // Validate required fields
      if (!latitude || !longitude || !contactName || !contactPhone) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields. Please provide latitude, longitude, contactName, and contactPhone"
        });
      }
      
      // Generate a unique request ID
      const date = new Date();
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
      const countQuery = "SELECT COUNT(*) as count FROM BreakdownRequests WHERE DATE(RequestTime) = CURDATE()";
      
      db.query(countQuery, [], (err, countResult) => {
        if (err) {
          console.error("Error counting breakdown requests:", err);
          return res.status(500).json({ 
            success: false, 
            message: "Database error", 
            error: err.message 
          });
        }
        
        const count = countResult[0].count + 1;
        const requestId = `BDR-${dateStr}-${count.toString().padStart(2, '0')}`;
        
        // Insert the breakdown request
        const insertQuery = `
          INSERT INTO BreakdownRequests (
            RequestID, CustomerID, Latitude, Longitude, Description, 
            ContactName, ContactPhone, Status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')
        `;
        
        db.query(
          insertQuery, 
          [requestId, customerId, latitude, longitude, description, contactName, contactPhone],
          (err, result) => {
            if (err) {
              console.error("Error creating breakdown request:", err);
              return res.status(500).json({ 
                success: false, 
                message: "Failed to create breakdown request", 
                error: err.message 
              });
            }
            
            res.status(201).json({
              success: true,
              message: "Breakdown request created successfully",
              requestId: requestId
            });
          }
        );
      });
    } catch (error) {
      console.error("Error in breakdown request API:", error);
      res.status(500).json({ 
        success: false, 
        message: "Server error", 
        error: error.message 
      });
    }
  });
  

router.put("/breakdown/cancel/:requestId", authenticateToken, authorizeRoles(['Customer', 'Admin']), async (req, res) => {
    try {
      const { requestId } = req.params;
      const customerId = req.user.customerId;
      
      // Check if request exists and belongs to the customer
      const checkQuery = "SELECT Status, CustomerID FROM BreakdownRequests WHERE RequestID = ?";
      
      db.query(checkQuery, [requestId], (err, results) => {
        if (err) {
          console.error("Error checking breakdown request:", err);
          return res.status(500).json({ 
            success: false, 
            message: "Database error", 
            error: err.message 
          });
        }
        
        if (results.length === 0) {
          return res.status(404).json({
            success: false,
            message: "Breakdown request not found"
          });
        }
        
        // If user is not admin, verify ownership
        if (req.user.role !== 'Admin' && results[0].CustomerID !== customerId) {
          return res.status(403).json({
            success: false,
            message: "You are not authorized to cancel this request"
          });
        }
        
        if (results[0].Status === 'Completed' || results[0].Status === 'Cancelled') {
          return res.status(400).json({
            success: false,
            message: `Request is already ${results[0].Status} and cannot be cancelled`
          });
        }
        
        // Update the request status to cancelled
        const updateQuery = `
          UPDATE BreakdownRequests 
          SET Status = 'Cancelled'
          WHERE RequestID = ?
        `;
        
        db.query(updateQuery, [requestId], (err, result) => {
          if (err) {
            console.error("Error cancelling breakdown request:", err);
            return res.status(500).json({ 
              success: false, 
              message: "Failed to cancel breakdown request", 
              error: err.message 
            });
          }
          
          res.status(200).json({
            success: true,
            message: "Breakdown request cancelled successfully",
            requestId: requestId
          });
        });
      });
    } catch (error) {
      console.error("Error in cancel breakdown request API:", error);
      res.status(500).json({ 
        success: false, 
        message: "Server error", 
        error: error.message 
      });
    }
  });

router.post("/update-mechanic-rating", authenticateToken, authorizeRoles(["Customer"]), async (req, res) => {
    try {
        const { jobCardId, mechanicId, rating } = req.body;
        const customerId = req.user.customerId;

        // Validate input
        if (!jobCardId || !mechanicId || !rating || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: "Invalid input. Please provide jobCardId, mechanicId, and rating (1-5)"
            });
        }

        // Verify the job card belongs to the customer
        const verifyJobCardQuery = `
            SELECT j.JobCardID 
            FROM JobCards j
            JOIN Appointments a ON j.AppointmentID = a.AppointmentID
            WHERE j.JobCardID = ? AND a.CustomerID = ? AND j.Status = 'Finished'
        `;

        const jobCardResult = await new Promise((resolve, reject) => {
            db.query(verifyJobCardQuery, [jobCardId, customerId], (err, result) => {
                if (err) reject(err);
                resolve(result);
            });
        });

        if (jobCardResult.length === 0) {
            return res.status(403).json({
                success: false,
                message: "You can only rate mechanics assigned to your completed job cards"
            });
        }

        // Verify the mechanic was assigned to this job card
        const verifyMechanicQuery = `
            SELECT * FROM Mechanics_Assigned 
            WHERE JobCardID = ? AND EmployeeID = ?
        `;

        const mechanicResult = await new Promise((resolve, reject) => {
            db.query(verifyMechanicQuery, [jobCardId, mechanicId], (err, result) => {
                if (err) reject(err);
                resolve(result);
            });
        });

        if (mechanicResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: "This mechanic was not assigned to the specified job card"
            });
        }

        // Get current rating for the mechanic
        const getCurrentRatingQuery = `
            SELECT Rating FROM Employees WHERE EmployeeID = ?
        `;

        const currentRatingResult = await new Promise((resolve, reject) => {
            db.query(getCurrentRatingQuery, [mechanicId], (err, result) => {
                if (err) reject(err);
                resolve(result);
            });
        });

        if (currentRatingResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Mechanic not found"
            });
        }

        // Calculate new rating (simple average for now)
        // In a production system, you might want to store individual ratings and calculate the average
        const currentRating = currentRatingResult[0].Rating || 0;
        const newRating = currentRating === 0 ? rating : (currentRating + rating) / 2;

        // Update the mechanic's rating
        const updateRatingQuery = `
            UPDATE Employees 
            SET Rating = ? 
            WHERE EmployeeID = ?
        `;

        await new Promise((resolve, reject) => {
            db.query(updateRatingQuery, [newRating, mechanicId], (err, result) => {
                if (err) reject(err);
                resolve(result);
            });
        });

        // Create a notification for the mechanic
        const notificationTitle = "New Rating Received";
        const notificationBody = `You received a ${rating}/5 rating for job card ${jobCardId}`;

        // Return success response
        return res.status(200).json({
            success: true,
            message: "Mechanic rating updated successfully",
            newRating: newRating
        });

    } catch (error) {
        console.error("Error updating mechanic rating:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
});


  
  // Helper function to generate PayHere hash
// Updated PayHere hash generation function
function generatePayHereHash(merchantId, orderId, amount, currency, merchantSecret) {
  const crypto = require('crypto');
  
  try {
    // Ensure all values are properly formatted and converted to strings
    merchantId = String(merchantId).trim();
    orderId = String(orderId).trim();
    amount = String(amount).trim();
    currency = String(currency).trim();
    merchantSecret = String(merchantSecret).trim();
    
    // First, hash the merchant secret and convert to uppercase
    const hashedSecret = crypto
      .createHash('md5')
      .update(merchantSecret)
      .digest('hex')
      .toUpperCase();
    
    // Create the data string with the hashed secret
    const dataString = `${merchantId}${orderId}${amount}${currency}${hashedSecret}`;
    
    // Generate the final MD5 hash and convert to uppercase
    const finalHash = crypto
      .createHash('md5')
      .update(dataString)
      .digest('hex')
      .toUpperCase();
      
    return finalHash;
  } catch (error) {
    console.error("Error in hash generation:", error);
    throw new Error(`Hash generation failed: ${error.message}`);
  }
}

// API endpoint for initiating PayHere payment
router.post("/initiate-payhere-payment/:InvoiceID", authenticateToken, authorizeRoles(['Customer']), async (req, res) => {
  try {
    const { InvoiceID } = req.params;
    const customerId = req.user.customerId;
    
    // Fetch invoice details with proper joins
    const invoiceQuery = `
      SELECT i.*, c.FirstName, c.SecondName, c.Email, c.Telephone
      FROM Invoice i
      JOIN JobCards j ON i.JobCard_ID = j.JobCardID
      JOIN Appointments a ON j.AppointmentID = a.AppointmentID
      JOIN Customers c ON a.CustomerID = c.CustomerID
      WHERE i.Invoice_ID = ? AND c.CustomerID = ?
    `;
    
    db.query(invoiceQuery, [InvoiceID, customerId], (err, results) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Failed to fetch invoice details",
          error: err.message
        });
      }
      
      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Invoice not found or does not belong to this customer"
        });
      }
      
      const invoice = results[0];
      
      // Get merchant details from environment variables
      const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;
      const merchantId = process.env.PAYHERE_MERCHANT_ID;
      
      // Format amount to avoid decimal precision issues (ensure 2 decimal places)
      const formattedAmount = parseFloat(invoice.Total).toFixed(2);
      
      // Create return URLs with protocol that can be intercepted by app
      const returnUrl = "app://payment/success";
      const cancelUrl = "app://payment/cancel";
      const notifyUrl = `${process.env.BACKEND_URL}/api/customers/payhere-notify`;
      
      // Generate PayHere hash
      const hashedData = generatePayHereHash(merchantId, InvoiceID, formattedAmount, 'LKR', merchantSecret);
      
      // Create payment data object
      const paymentData = {
        merchant_id: merchantId,
        return_url: returnUrl,
        cancel_url: cancelUrl,
        notify_url: notifyUrl,
        order_id: InvoiceID,
        items: `Invoice Payment - ${InvoiceID}`,
        currency: 'LKR',
        amount: formattedAmount,
        first_name: invoice.FirstName || "Customer",
        last_name: invoice.SecondName || "",
        email: invoice.Email || "customer@example.com",
        phone: invoice.Telephone || "0000000000",
        address: "N/A", // Default value
        city: "Colombo", // Default value
        country: "Sri Lanka", // Default value
        hash: hashedData
      };
      
      // Return payment initialization data
      return res.status(200).json({
        success: true,
        paymentData
      });
    });
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to initiate payment",
      error: error.message
    });
  }
});

// Add this new route to your backend
router.put("/update-payment-status/:InvoiceID", authenticateToken, authorizeRoles(['Customer']), async (req, res) => {
  try {
    const { InvoiceID } = req.params;
    const { paymentId, paymentMethod, status } = req.body;
    const customerId = req.user.customerId;
    
    // Verify that the invoice belongs to this customer
    const verifyQuery = `
      SELECT i.Invoice_ID
      FROM Invoice i
      JOIN JobCards j ON i.JobCard_ID = j.JobCardID
      JOIN Appointments a ON j.AppointmentID = a.AppointmentID
      JOIN Customers c ON a.CustomerID = c.CustomerID
      WHERE i.Invoice_ID = ? AND c.CustomerID = ?
    `;
    
    db.query(verifyQuery, [InvoiceID, customerId], (err, results) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Failed to verify invoice ownership",
          error: err.message
        });
      }
      
      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Invoice not found or does not belong to this customer"
        });
      }
      
      // Update the invoice in the database
      const updateQuery = `
        UPDATE Invoice 
        SET 
          PaidStatus = ?,
          PaymentMethod = ?,
          PaymentDate = NOW(),
          Notes = CONCAT(IFNULL(Notes, ''), ' PayHere Payment ID: ${paymentId}')
        WHERE 
          Invoice_ID = ?
      `;
      
      db.query(updateQuery, [status, paymentMethod, InvoiceID], (updateErr, updateResult) => {
        if (updateErr) {
          return res.status(500).json({
            success: false,
            message: "Failed to update payment status",
            error: updateErr.message
          });
        }
        
        if (updateResult.affectedRows === 0) {
          return res.status(404).json({
            success: false,
            message: "No invoice found with the provided ID"
          });
        }
        
        // Also update the JobCard status
        const updateJobCardQuery = `
          UPDATE JobCards 
          SET Status = 'Paid' 
          WHERE JobCardID = (
            SELECT JobCard_ID FROM Invoice WHERE Invoice_ID = ?
          )
        `;
        
        db.query(updateJobCardQuery, [InvoiceID], (jobCardErr) => {
          if (jobCardErr) {
            console.error("Failed to update job card:", jobCardErr);
          }
          
          return res.status(200).json({
            success: true,
            message: "Payment status updated successfully"
          });
        });
      });
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update payment status",
      error: error.message
    });
  }
});

// PayHere notification endpoint
router.post("/payhere-notify", async (req, res) => {
  try {
    console.log("PayHere Notification Received:", JSON.stringify(req.body, null, 2));
    
    // Extract payment details from the request body
    const {
      merchant_id,
      order_id,
      payment_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig
    } = req.body;

    if (!merchant_id || !order_id || !payhere_amount || !payhere_currency || !status_code || !md5sig) {
      console.error("Missing required fields in PayHere notification");
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    // Get merchant secret from environment
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;
    
    // Verify the MD5 signature
    const formattedAmount = parseFloat(payhere_amount).toFixed(2);
    
    // Generate local MD5 signature for verification
    const local_md5sig = generatePayHereHash(
      merchant_id,
      order_id,
      formattedAmount,
      payhere_currency,
      status_code,
      merchantSecret
    );
    
    // Verify signature
    if (md5sig !== local_md5sig) {
      console.error("Invalid MD5 signature");
      return res.status(400).json({ error: "Invalid signature" });
    }
    
    // Check if payment is successful (status_code 2 means success)
    if (status_code == 2) {
      // Update the invoice in the database
      const updateQuery = `
        UPDATE Invoice 
        SET 
          PaidStatus = 'Paid',
          PaymentMethod = 'PayHere',
          PaymentDate = NOW(),
          Notes = CONCAT(IFNULL(Notes, ''), ' PayHere Payment ID: ${payment_id}')
        WHERE 
          Invoice_ID = ?
      `;
      
      db.query(updateQuery, [order_id], (err, result) => {
        if (err) {
          console.error("Failed to update invoice:", err);
          return res.status(500).json({ error: "Database update failed" });
        }
        
        if (result.affectedRows === 0) {
          console.error("No invoice found with ID:", order_id);
          return res.status(404).json({ error: "Invoice not found" });
        }
        
        console.log(`Successfully updated invoice ${order_id} as paid`);
        
        // Also update the JobCard status if needed
        const updateJobCardQuery = `
          UPDATE JobCards 
          SET Status = 'Finished' 
          WHERE JobCardID = (
            SELECT JobCard_ID FROM Invoice WHERE Invoice_ID = ?
          )
        `;
        
        db.query(updateJobCardQuery, [order_id], (jobCardErr) => {
          if (jobCardErr) {
            console.error("Failed to update job card:", jobCardErr);
          }
          
          // Return success response to PayHere
          return res.status(200).json({ status: "success" });
        });
      });
    } else {
      // Payment failed or is pending
      console.log(`Payment not successful. Status code: ${status_code}`);
      return res.status(200).json({ status: "noted" });
    }
  } catch (error) {
    console.error("Error processing PayHere notification:", error);
    return res.status(500).json({ error: "Server error" });
  }
});




router.get("/paid-invoices", authenticateToken, async (req, res) => {
    try {
      const customerId = req.user.customerId; // Assuming the customer ID is stored in the token
      
      // Simplified query to get just pending invoices info
      const query = `
        SELECT i.Invoice_ID, i.Total, i.Parts_Cost, i.Labour_Cost, i.GeneratedDate, 
               i.PaidStatus, j.JobCardID, a.AppointmentID, v.VehicleNo, v.Model
        FROM Invoice i
        INNER JOIN JobCards j ON i.JobCard_ID = j.JobCardID
        INNER JOIN Appointments a ON j.AppointmentID = a.AppointmentID
        INNER JOIN Vehicles v ON a.VehicleID = v.VehicleNo
        WHERE a.CustomerID = ? AND i.PaidStatus = 'Paid'
        ORDER BY i.GeneratedDate DESC
      `;
      
      db.query(query, [customerId], (err, results) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({
            success: false,
            message: "Failed to fetch pending invoices",
            error: err.message
          });
        }
        
        return res.status(200).json({
          success: true,
          message: results.length > 0 ? "Pending invoices retrieved successfully" : "No pending invoices found",
          count: results.length,
          data: results
        });
      });
      
    } catch (error) {
      console.error("Error fetching pending invoices:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch pending invoices",
        error: error.message
      });
    }
});

async function sendEmail(to, subject, html) {
  try {
    const mailOptions = {
      from: '"Your App Name" <your-email@gmail.com>',
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}
// Updated forgot-password endpoint
router.post('/forgot-password', async (req, res) => {
  try {
    sendEmail('your-email@gmail.com', 'Test Email', '<p>This is a test</p>');
    const { email } = req.body;
    console.log(`Received password reset request for email: ${email}`);

    if (!email) {
      console.log('Email is missing in request body');
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    // Check if email exists in the database
    const query = `
      SELECT CustomerID, FirstName, Email FROM Customers 
      WHERE Email = ?
      UNION
      SELECT EmployeeID, Name as FirstName, Email FROM Employees
      WHERE Email = ?
    `;

    console.log(`Executing query to find user with email: ${email}`);
    db.query(query, [email, email], async (err, results) => {
      if (err) {
        console.error('Database error when searching for email:', err);
        return res.status(500).json({
          success: false,
          message: 'Database error occurred',
          error: err.message
        });
      }

      if (results.length === 0) {
        console.log(`No user found with email: ${email}`);
        return res.status(404).json({
          success: false,
          message: 'No account found with this email address',
        });
      }

      const user = results[0];
      console.log(`User found: ${JSON.stringify(user)}`);
      
      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = new Date();
      otpExpiry.setMinutes(otpExpiry.getMinutes() + 10); // OTP valid for 10 minutes
      
      console.log(`Generated OTP: ${otp} (expires: ${otpExpiry})`);

      // Store the OTP in the database
      const resetId = uuidv4();
      const insertOtpQuery = `
        INSERT INTO PasswordResetTokens (
          ResetID, UserID, Token, ExpiryDate, IsUsed
        ) VALUES (?, ?, ?, ?, 0)
        ON DUPLICATE KEY UPDATE
          Token = VALUES(Token),
          ExpiryDate = VALUES(ExpiryDate),
          IsUsed = 0
      `;

      console.log(`Storing OTP in database for user ID: ${user.CustomerID || user.EmployeeID}`);
      db.query(
        insertOtpQuery,
        [resetId, user.CustomerID || user.EmployeeID, otp, otpExpiry],
        async (otpErr) => {
          if (otpErr) {
            console.error('Error storing OTP in database:', otpErr);
            return res.status(500).json({
              success: false,
              message: 'Failed to generate OTP',
              error: otpErr.message
            });
          }

          // Send OTP via email
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
              <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #944EF8;">Password Reset Request</h2>
              </div>
              <p>Hello ${user.FirstName},</p>
              <p>We received a request to reset your password. Please use the following OTP (One-Time Password) to verify your identity:</p>
              <div style="margin: 30px 0; text-align: center;">
                <div style="font-size: 24px; font-weight: bold; letter-spacing: 8px; background-color: #f5f5f5; padding: 15px; border-radius: 5px;">${otp}</div>
                <p style="font-size: 12px; color: #666; margin-top: 10px;">This OTP will expire in 10 minutes.</p>
              </div>
              <p>If you didn't request a password reset, please ignore this email or contact our support team if you have any concerns.</p>
              <p>Thank you,<br>Your App Name Team</p>
            </div>
          `;

          const emailSent = await sendEmail(
            email,
            "Password Reset OTP",
            emailHtml
          );

          
          // For development purposes, still include the OTP in response
          return res.status(200).json({
            success: true,
            message: 'OTP generated successfully' + (emailSent ? ' and sent to your email' : ''),
            otp: otp, // Only include this in development!
            email: email,
            emailSent: emailSent
          });
        }
      );
    });
  } catch (error) {
    console.error('Error in forgot password:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Verify OTP endpoint
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required',
      });
    }

    // Check if OTP is valid
    const otpQuery = `
      SELECT pt.*, 
             COALESCE(c.Email, e.Email) as Email
      FROM PasswordResetTokens pt
      LEFT JOIN Customers c ON pt.UserID = c.CustomerID
      LEFT JOIN Employees e ON pt.UserID = e.EmployeeID
      WHERE pt.Token = ? 
        AND pt.ExpiryDate > NOW() 
        AND pt.IsUsed = 0
        AND (c.Email = ? OR e.Email = ?)
    `;

    db.query(otpQuery, [otp, email, email], async (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          message: 'Database error occurred',
          error: err.message
        });
      }

      if (results.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired OTP',
        });
      }

      // Mark OTP as used
      const markOtpQuery = `UPDATE PasswordResetTokens SET IsUsed = 1 WHERE Token = ?`;
      db.query(markOtpQuery, [otp], async (markErr) => {
        if (markErr) {
          console.error('Error marking OTP as used:', markErr);
        }

        // Generate a password reset token (for the next step)
        const resetToken = crypto.randomBytes(32).toString('hex');
        return res.status(200).json({
          success: true,
          message: 'OTP verified successfully',
          resetToken: resetToken,
          email: email
        });
      });
    });
  } catch (error) {
    console.error('Error in OTP verification:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Reset password endpoint (updated)
router.post('/reset-password', async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;

    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, reset token and new password are required',
      });
    }

    // In a real app, you would validate the resetToken here
    // For simplicity, we'll proceed directly to password reset

    // Check if email exists
    const userQuery = `
      SELECT 'customer' as userType, CustomerID as userId FROM Customers WHERE Email = ?
      UNION
      SELECT 'employee' as userType, EmployeeID as userId FROM Employees WHERE Email = ?
    `;

    db.query(userQuery, [email, email], async (err, results) => {
      if (err || results.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email address',
        });
      }

      const user = results[0];
      
      // Hash the new password
      
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      const table = user.userType === 'customer' ? 'Customers' : 'Employees';
      const idField = user.userType === 'customer' ? 'CustomerID' : 'EmployeeID';
      const updateQuery = `UPDATE ${table} SET Password = ? WHERE ${idField} = ?`;

      db.query(updateQuery, [hashedPassword, user.userId], async (updateErr) => {
        if (updateErr) {
          console.error('Error updating password:', updateErr);
          return res.status(500).json({
            success: false,
            message: 'Failed to update password',
            error: updateErr.message
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Password has been reset successfully',
        });
      });
    });
  } catch (error) {
    console.error('Error in reset password:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});
  
  
router.get("/customer-invoice/:id", authenticateToken, authorizeRoles(['Customer']), async (req, res) => {
  try {
    const invoiceId = req.params.id;
    const customerId = req.user.customerId;

    console.log(`Fetching invoice ${invoiceId} for customer ${customerId}`);

    // Query to get invoice details for regular service invoices
    const regularInvoiceQuery = `
      SELECT i.Invoice_ID, i.Total, i.Parts_Cost, i.Labour_Cost, i.GeneratedDate, i.PaidStatus, i.PaymentMethod, i.PaymentDate, i.Notes,
             jc.JobCardID, jc.ServiceDetails, jc.Status as JobCardStatus, jc.ServiceMilleage,
             a.AppointmentID, a.Date as AppointmentDate, a.Time as AppointmentTime, a.Status as AppointmentStatus,
             v.VehicleNo, v.Model, v.Type as VehicleType, v.CurrentMilleage, v.NextServiceMilleage,
             c.CustomerID, c.FirstName, c.SecondName, c.Telephone, c.Email,
             e.Name as GeneratedByName, e.Role as GeneratedByRole
      FROM Invoice i
      INNER JOIN JobCards jc ON i.JobCard_ID = jc.JobCardID
      INNER JOIN Appointments a ON jc.AppointmentID = a.AppointmentID
      INNER JOIN Vehicles v ON a.VehicleID = v.VehicleNo
      INNER JOIN Customers c ON a.CustomerID = c.CustomerID
      LEFT JOIN Employees e ON i.GeneratedBy = e.EmployeeID
      WHERE i.Invoice_ID = ? AND c.CustomerID = ?
    `;

    // Query to get invoice details for breakdown service invoices
    const breakdownInvoiceQuery = `
      SELECT i.Invoice_ID, i.Total, i.Parts_Cost, i.Labour_Cost, i.GeneratedDate, i.PaidStatus, i.PaymentMethod, i.PaymentDate, i.Notes,
             br.RequestID, br.Description as BreakdownDescription, br.ContactName, br.ContactPhone, br.Status as BreakdownStatus, 
             br.RequestTime, br.CompletedTime, br.Latitude, br.Longitude,
             c.CustomerID, c.FirstName, c.SecondName, c.Telephone, c.Email,
             e.Name as GeneratedByName, e.Role as GeneratedByRole,
             d.Name as DriverName, d.Phone as DriverPhone
      FROM Invoice i
      INNER JOIN BreakdownRequests br ON br.InvoiceID = i.Invoice_ID
      INNER JOIN Customers c ON br.CustomerID = c.CustomerID
      LEFT JOIN Employees e ON i.GeneratedBy = e.EmployeeID
      LEFT JOIN Employees d ON br.DriverID = d.EmployeeID
      WHERE i.Invoice_ID = ? AND c.CustomerID = ?
    `;

    // First try to get regular invoice
    db.query(regularInvoiceQuery, [invoiceId, customerId], (err, regularResults) => {
      if (err) {
        console.error("Database error fetching regular invoice:", err);
        return res.status(500).json({
          success: false,
          message: "Database error",
          error: err.message
        });
      }

      if (regularResults.length > 0) {
        // Found regular invoice - get service records and parts used
        const serviceRecordsQuery = `
          SELECT sr.ServiceRecord_ID, sr.Description, sr.ServiceType, sr.Status,
                 s.ServiceName, s.Price
          FROM ServiceRecords sr
          LEFT JOIN Services s ON sr.ServiceType = s.ServiceID
          WHERE sr.JobCardID = ?
        `;

        const partsUsedQuery = `
          SELECT pu.PartID, pu.Quantity, pu.UnitPrice, pu.TotalPrice,
                 p.Name as PartName, p.Description as PartDescription
          FROM Parts_Used pu
          JOIN Parts p ON pu.PartID = p.PartID
          WHERE pu.InvoiceID = ?
        `;

        const mechanicsQuery = `
          SELECT e.EmployeeID, e.Name, e.Role
          FROM Mechanics_Assigned ma
          JOIN Employees e ON ma.EmployeeID = e.EmployeeID
          WHERE ma.JobCardID = ?
        `;

        // Get service records
        db.query(serviceRecordsQuery, [regularResults[0].JobCardID], (srErr, serviceRecords) => {
          if (srErr) {
            console.error("Error fetching service records:", srErr);
          }

          // Get parts used
          db.query(partsUsedQuery, [invoiceId], (puErr, partsUsed) => {
            if (puErr) {
              console.error("Error fetching parts used:", puErr);
            }

            // Get mechanics assigned
            db.query(mechanicsQuery, [regularResults[0].JobCardID], (mechErr, mechanics) => {
              if (mechErr) {
                console.error("Error fetching mechanics:", mechErr);
              }

              // Return all data
              return res.status(200).json({
                success: true,
                invoiceType: 'service',
                data: {
                  invoice: regularResults[0],
                  serviceRecords: serviceRecords || [],
                  partsUsed: partsUsed || [],
                  mechanics: mechanics || []
                }
              });
            });
          });
        });
      } else {
        // Try to get breakdown invoice
        db.query(breakdownInvoiceQuery, [invoiceId, customerId], (err2, breakdownResults) => {
          if (err2) {
            console.error("Database error fetching breakdown invoice:", err2);
            return res.status(500).json({
              success: false,
              message: "Database error",
              error: err2.message
            });
          }

          if (breakdownResults.length > 0) {
            // Found breakdown invoice
            return res.status(200).json({
              success: true,
              invoiceType: 'breakdown',
              data: breakdownResults[0]
            });
          } else {
            // Invoice not found
            return res.status(404).json({
              success: false,
              message: "Invoice not found for this customer"
            });
          }
        });
      }
    });

  } catch (error) {
    console.error("Error in customer invoice API:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});



router.get("/vehicle-cost", authenticateToken, authorizeRoles(['Customer']), async (req, res) => {
  try {
    const customerId = req.user.customerId;
    
    console.log(`Fetching vehicle cost details for customer: ${customerId}`);
    
    // Query to get total cost spent on each vehicle (including image URLs)
    const query = `
      SELECT 
        v.VehicleNo,
        v.Model,
        v.Type,
        
        v.VehiclePicUrl,
        COUNT(DISTINCT i.Invoice_ID) as ServiceCount,
        SUM(i.Total) as TotalCost,
        SUM(i.Parts_Cost) as PartsCost,
        SUM(i.Labour_Cost) as LabourCost,
        MAX(i.GeneratedDate) as LastServiceDate
      FROM Vehicles v
      LEFT JOIN Appointments a ON v.VehicleNo = a.VehicleID
      LEFT JOIN JobCards j ON a.AppointmentID = j.AppointmentID
      LEFT JOIN Invoice i ON j.JobCardID = i.JobCard_ID
      WHERE v.CustomerID = ? AND i.PaidStatus = 'Paid'
      GROUP BY v.VehicleNo, v.Model, v.Type,v.VehiclePicUrl
      ORDER BY TotalCost DESC
    `;
    
    // Execute query
    db.query(query, [customerId], (err, vehicleResults) => {
      if (err) {
        console.error("Database error fetching vehicle costs:", err);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch vehicle costs",
          error: err.message
        });
      }
      
      // Calculate overall totals
      let totalServiceCount = 0;
      let overallTotalCost = 0;
      let overallPartsCost = 0;
      let overallLabourCost = 0;
      
      // Process vehicle results
      const vehicles = vehicleResults.map(vehicle => {
        const totalCost = parseFloat(vehicle.TotalCost || 0);
        const partsCost = parseFloat(vehicle.PartsCost || 0);
        const labourCost = parseFloat(vehicle.LabourCost || 0);
        const serviceCount = parseInt(vehicle.ServiceCount || 0);
        
        totalServiceCount += serviceCount;
        overallTotalCost += totalCost;
        overallPartsCost += partsCost;
        overallLabourCost += labourCost;
        
        // Add default image URL if none exists
        const imageURL = vehicle.VehiclePicUrl || getDefaultVehicleImage(vehicle.Model, vehicle.Type);
        
        return {
          vehicleNo: vehicle.VehicleNo,
          model: vehicle.Model,
          type: vehicle.Type,

          imageURL: imageURL,
          serviceCount: serviceCount,
          totalCost: totalCost,
          partsCost: partsCost,
          labourCost: labourCost,
          lastServiceDate: vehicle.LastServiceDate
        };
      });
      
      // Get recent services
      const recentServicesQuery = `
        SELECT 
          i.Invoice_ID, 
          i.Total, 
          i.GeneratedDate, 
          v.VehicleNo, 
          v.Model,
          v.VehiclePicUrl
        FROM Invoice i
        JOIN JobCards j ON i.JobCard_ID = j.JobCardID
        JOIN Appointments a ON j.AppointmentID = a.AppointmentID
        JOIN Vehicles v ON a.VehicleID = v.VehicleNo
        WHERE v.CustomerID = ? AND i.PaidStatus = 'Paid'
        ORDER BY i.GeneratedDate DESC
        LIMIT 5
      `;
      
      db.query(recentServicesQuery, [customerId], (recentErr, recentServices) => {
        if (recentErr) {
          console.error("Database error fetching recent services:", recentErr);
          // Continue anyway, just without recent services
          return res.status(200).json({
            success: true,
            summary: {
              totalVehicles: vehicles.length,
              totalServiceCount: totalServiceCount,
              overallTotalCost: overallTotalCost,
              overallPartsCost: overallPartsCost,
              overallLabourCost: overallLabourCost
            },
            vehicles: vehicles,
            recentServices: []
          });
        }
        
        // Format recent services
        const formattedRecentServices = recentServices.map(service => ({
          invoiceId: service.Invoice_ID,
          total: parseFloat(service.Total || 0),
          date: service.GeneratedDate,
          vehicleNo: service.VehicleNo,
          model: service.Model,
          imageURL: service.VehiclePicUrl || getDefaultVehicleImage(service.Model, service.Type)
        }));
        
        // Return all data
        return res.status(200).json({
          success: true,
          summary: {
            totalVehicles: vehicles.length,
            totalServiceCount: totalServiceCount,
            overallTotalCost: overallTotalCost,
            overallPartsCost: overallPartsCost,
            overallLabourCost: overallLabourCost
          },
          vehicles: vehicles,
          recentServices: formattedRecentServices
        });
      });
    });
  } catch (error) {
    console.error("Error fetching vehicle costs:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

// Helper function to get default vehicle image based on model and type
function getDefaultVehicleImage(model, type) {
  // Default image URL based on vehicle type
  const defaultImages = {
    'Sedan': 'https://your-domain.com/images/default-sedan.png',
    'SUV': 'https://your-domain.com/images/default-suv.png',
    'Truck': 'https://your-domain.com/images/default-truck.png',
    'Van': 'https://your-domain.com/images/default-van.png',
    'Coupe': 'https://your-domain.com/images/default-coupe.png',
    'Hatchback': 'https://your-domain.com/images/default-hatchback.png'
  };
  
  // Return type-specific default image or generic default
  return defaultImages[type] || 'https://your-domain.com/images/default-car.png';
}


// Backend option: Modify the backend to allow cascade deletion
router.delete("/vehicle/:id", authenticateToken, authorizeRoles(['Customer']), async (req, res) => {
    try {
        const { id: vehicleNo } = req.params;
        const { customerId } = req.user;

        // 1. First check if the vehicle exists and belongs to the customer
        const checkOwnershipQuery = `
            SELECT VehicleNo FROM Vehicles 
            WHERE VehicleNo = ? AND CustomerID = ?
        `;

        db.query(checkOwnershipQuery, [vehicleNo, customerId], async (err, results) => {
            if (err) {
                console.error("Database error checking vehicle ownership:", err);
                return res.status(500).json({ error: "Internal server error" });
            }

            if (results.length === 0) {
                return res.status(404).json({ 
                    error: "Vehicle not found or you don't have permission to delete it" 
                });
            }

            // Start transaction for all the operations
            db.beginTransaction(async (err) => {
                if (err) {
                    console.error("Error starting transaction:", err);
                    return res.status(500).json({ error: "Internal server error" });
                }

                try {
                    // 2. First update all active appointments to 'Cancelled'
                    await new Promise((resolve, reject) => {
                        const updateAppointmentsQuery = `
                            UPDATE Appointments 
                            SET Status = 'Cancelled'
                            WHERE VehicleID = ? AND Status NOT IN ('Completed', 'Cancelled')
                        `;
                        
                        db.query(updateAppointmentsQuery, [vehicleNo], (err, updateResult) => {
                            if (err) return reject(err);
                            resolve(updateResult);
                        });
                    });
                    
                    // Log how many appointments were cancelled
                    const cancelledAppointments = await new Promise((resolve, reject) => {
                        db.query(`
                            SELECT COUNT(*) as count FROM Appointments 
                            WHERE VehicleID = ? AND Status = 'Cancelled'
                        `, [vehicleNo], (err, countResult) => {
                            if (err) return reject(err);
                            resolve(countResult[0].count);
                        });
                    });

                    // 3. Delete from dependent tables
                    // Delete service records for this vehicle
                    await new Promise((resolve, reject) => {
                        db.query(`
                            DELETE sr FROM ServiceRecords sr
                            JOIN JobCards jc ON sr.JobCardID = jc.JobCardID
                            JOIN Appointments a ON jc.AppointmentID = a.AppointmentID
                            WHERE a.VehicleID = ?
                        `, [vehicleNo], (err) => {
                            if (err) return reject(err);
                            resolve();
                        });
                    });

                    // 4. Delete the vehicle
                    await new Promise((resolve, reject) => {
                        db.query(`
                            DELETE FROM Vehicles 
                            WHERE VehicleNo = ?
                        `, [vehicleNo], (err, result) => {
                            if (err) return reject(err);
                            if (result.affectedRows === 0) {
                                return reject(new Error("Vehicle not found"));
                            }
                            resolve();
                        });
                    });

                    // 5. Commit the transaction
                    db.commit((err) => {
                        if (err) {
                            console.error("Error committing transaction:", err);
                            return db.rollback(() => {
                                res.status(500).json({ error: "Internal server error" });
                            });
                        }

                        res.status(200).json({ 
                            success: true,
                            message: "Vehicle deleted successfully",
                            cancelledAppointments: cancelledAppointments
                        });
                    });

                } catch (error) {
                    // Rollback on any error
                    db.rollback(() => {
                        console.error("Error during forced vehicle deletion:", error);
                        res.status(500).json({ error: "Internal server error" });
                    });
                }
            });
        });

    } catch (error) {
        console.error("Error in /vehicle/:id/force DELETE endpoint:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
  



module.exports = router;

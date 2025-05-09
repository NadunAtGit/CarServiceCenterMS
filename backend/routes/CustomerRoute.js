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
            WHERE a.CustomerID = ? AND jc.Status != 'Finished'
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
          console.error("Database error:", err);
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
        
        // Create return URLs that are optimized for webview detection
        // Using URL scheme that can be intercepted in the WebView
        const returnUrl = "app://payment/success";
        const cancelUrl = "app://payment/cancel";
        
        const hashedData = generatePayHereHash(merchantId, InvoiceID, invoice.Total, 'LKR', merchantSecret);
        
        // Return payment initialization data with default values for missing fields
        return res.status(200).json({
          success: true,
          paymentData: {
            merchant_id: merchantId,
            return_url: returnUrl,
            cancel_url: cancelUrl,
            notify_url: `${process.env.BACKEND_URL}/api/customers/payhere-notify`,
            order_id: InvoiceID,
            items: `Invoice Payment - ${InvoiceID}`,
            currency: 'LKR',
            amount: invoice.Total,
            first_name: invoice.FirstName,
            last_name: invoice.SecondName,
            email: invoice.Email,
            phone: invoice.Telephone,
            address: "N/A", // Default value
            city: "Colombo", // Default value
            country: "Sri Lanka", // Default value
            hash: hashedData
          }
        });
      });
      
    } catch (error) {
      console.error("Error initiating PayHere payment:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to initiate payment",
        error: error.message
      });
    }
});
  
  // Helper function to generate PayHere hash
  function generatePayHereHash(merchantId, orderId, amount, currency, merchantSecret) {
    const crypto = require('crypto');
    // Ensure proper string formatting and no extra spaces
    const dataString = `${merchantId}${orderId}${amount}${currency}${merchantSecret}`;
    return crypto.createHash('md5').update(dataString).digest('hex').toUpperCase();
  }
  

  
  router.post("/payhere-notify", async (req, res) => {
    try {
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
  
      console.log("PayHere Notification Received:", req.body);
      
      // Verify the MD5 signature
      const merchantSecret = "MTUwMTI0MDQ5OTEwNTg3NDIyMzMDIyNzUzMD"; // Your merchant secret
      const expectedSig = generatePayHereHash(merchant_id, order_id, payhere_amount, payhere_currency, merchantSecret);
      
      if (md5sig !== expectedSig) {
        console.error("Invalid MD5 signature");
        return res.status(400).json({ error: "Invalid signature" });
      }
      
      // Check payment status
      if (status_code === "2") { // 2 means payment success
        // Update invoice status
        const updateQuery = `
          UPDATE Invoice 
          SET PaymentMethod = 'PayHere',
              PaymentDate = CURRENT_TIMESTAMP,
              PaymentReference = ?
          WHERE Invoice_ID = ?
        `;
        
        db.query(updateQuery, [payment_id, order_id], (err, result) => {
          if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: "Database error" });
          }
          
          if (result.affectedRows === 0) {
            console.error("Invoice not found:", order_id);
            return res.status(404).json({ error: "Invoice not found" });
          }
          
          // Return success response
          return res.status(200).json({ status: "Success" });
        });
      } else {
        console.log("Payment not successful. Status code:", status_code);
        return res.status(200).json({ status: "Noted" });
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
  
  

  
  
  










  




module.exports = router;

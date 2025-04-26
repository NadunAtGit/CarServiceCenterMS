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
  
  
  










  




module.exports = router;

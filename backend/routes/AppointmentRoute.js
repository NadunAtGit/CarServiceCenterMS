const express = require("express");
const db = require("../db");
const {generateAppointmentId,generateNotificationId} = require("../GenerateId");
const { validateEmail, validatePhoneNumber } = require("../validations");
const{authenticateToken,authorizeRoles}=require("../utilities");
const { messaging, bucket } = require("../firebaseConfig"); 
const moment = require("moment"); // Import moment for date formatting

const router = express.Router();

router.use((req, res, next) => {
    console.log("Appointment Route Hit:", req.method, req.url);
    next();
});



// router.post("/make-appointment", authenticateToken, async (req, res) => {
//     const { customerId } = req.user; // Get the customerId from the token
//     const { Date, Time, VehicleNo } = req.body; // Get the data from the request body

//     // Check if all required fields are provided
//     if (!Date || !Time || !VehicleNo) {
//         return res.status(400).json({ error: "Missing required fields" });
//     }

//     try {
//         // Step 1: Check if the vehicle number belongs to the logged-in user
//         const vehicleQuery = "SELECT * FROM Vehicles WHERE VehicleNo = ? AND CustomerID = ?";
//         const vehicleResult = await new Promise((resolve, reject) => {
//             db.query(vehicleQuery, [VehicleNo, customerId], (err, result) => {
//                 if (err) {
//                     console.error("Error checking vehicle:", err);
//                     return reject(err);
//                 }
//                 resolve(result);
//             });
//         });

//         // If the vehicle does not belong to the logged-in user
//         if (vehicleResult.length === 0) {
//             return res.status(400).json({ error: "Vehicle does not belong to the logged-in user" });
//         }

//         // Step 2: Generate a new appointment ID
//         const AppointmentID = await generateAppointmentId();

//         // Step 3: Insert the new appointment into the Appointments table
//         const appointmentQuery =
//             "INSERT INTO Appointments (AppointmentID, CustomerID, VehicleID, Date, Time, Status, AppointmentMadeDate) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)";
//         const appointmentValues = [AppointmentID, customerId, VehicleNo, Date, Time, "Not Confirmed"];

//         await new Promise((resolve, reject) => {
//             db.query(appointmentQuery, appointmentValues, (err, result) => {
//                 if (err) {
//                     console.error("Error inserting appointment:", err);
//                     return reject(err);
//                 }
//                 resolve(result);
//             });
//         });

//         res.status(201).json({
//             success: true,
//             message: "Appointment created successfully!",
//             AppointmentID,
//         });
//     } catch (error) {
//         console.error("Error during /make-appointment:", error);
//         res.status(500).json({ error: "Internal server error" });
//     }
// });

function getSlotStartTime(timeStr) {
    const slots = ["08:00:00", "09:30:00", "11:00:00", "12:30:00", "14:00:00", "15:30:00"];
    return slots.find(slot => timeStr === slot);
}


router.post("/make-appointment", authenticateToken, async (req, res) => {
    const { customerId } = req.user;  // Get the customerId from the token
    const { Date: appointmentDate, Time, VehicleNo } = req.body;  // Get the data from the request body

    // Check if all required fields are provided
    if (!appointmentDate || !Time || !VehicleNo) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate date is at least one day after today
    const selectedDate = new Date(appointmentDate);
    const now = new Date();
    // if (selectedDate <= new Date(now.setDate(now.getDate() + 0))) {
    //     return res.status(400).json({ error: "Appointments must be booked at least one day in advance." });
    // }

    const slotStart = getSlotStartTime(Time);  // Assuming you have a function to convert time
    if (!slotStart) {
        return res.status(400).json({ error: "Invalid time slot selected." });
    }

    try {
        // Step 1: Check if the vehicle number belongs to the logged-in user
        const vehicleQuery = "SELECT * FROM Vehicles WHERE VehicleNo = ? AND CustomerID = ?";
        const vehicleResult = await new Promise((resolve, reject) => {
            db.query(vehicleQuery, [VehicleNo, customerId], (err, result) => {
                if (err) {
                    console.error("Error checking vehicle:", err);
                    return reject(err);
                }
                resolve(result);
            });
        });

        // If the vehicle does not belong to the logged-in user
        if (vehicleResult.length === 0) {
            return res.status(400).json({ error: "Vehicle does not belong to the logged-in user" });
        }
        console.log("Vehicle Result:", vehicleResult);  // Debugging log
        const vehicleId = vehicleResult[0].VehicleNo;  // Extract the vehicle ID

        // Step 2: Count appointments in the selected slot
        const checkSlotQuery = "SELECT COUNT(*) as count FROM Appointments WHERE Date = ? AND Time = ?";
        const slotResult = await new Promise((resolve, reject) => {
            db.query(checkSlotQuery, [appointmentDate, slotStart], (err, result) => {
                if (err) {
                    console.error("Error checking slot availability:", err);
                    return reject(err);
                }
                resolve(result);
            });
        });

        if (slotResult[0].count >= 7) {
            return res.status(400).json({ error: "Slot is already fully booked. Please select a different slot." });
        }

        // Step 3: Generate a new appointment ID
        const AppointmentID = await generateAppointmentId();

        // Step 4: Insert the new appointment into the Appointments table
        const insertQuery = `
            INSERT INTO Appointments 
            (AppointmentID, CustomerID, VehicleID, Date, Time, Status, AppointmentMadeDate) 
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;
        const values = [AppointmentID, customerId, vehicleId, appointmentDate, slotStart, "Not Confirmed"];

        await new Promise((resolve, reject) => {
            db.query(insertQuery, values, (err, result) => {
                if (err) {
                    console.error("Error inserting appointment:", err);
                    return reject(err);
                }
                resolve(result);
            });
        });

        res.status(201).json({
            success: true,
            message: "Appointment created successfully!",
            AppointmentID,
        });
    } catch (error) {
        console.error("Error during /make-appointment:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


//not tsted
router.get("/get-not-confirmed", authenticateToken, authorizeRoles(['Admin','Customer']), async (req, res) => {
    try {
        const query = `
            SELECT * 
            FROM appointments 
            WHERE Status IN (?, ?) 
            ORDER BY AppointmentMadeDate DESC
        `;
        
        const appointments = await new Promise((resolve, reject) => {
            db.query(query, ["Not Confirmed", "Rescheduled"], (err, result) => {
                if (err) {
                    console.error("Error fetching appointments:", err);
                    return reject(err);
                }
                resolve(result);
            });
        });

        res.status(200).json({
            success: true,
            appointments,
        });
    } catch (error) {
        console.error("Error fetching not confirmed or rescheduled appointments:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get("/get-rescheduled", authenticateToken, authorizeRoles(['Admin','Customer']), async (req, res) => {
    try {
        const query = `
            SELECT * 
            FROM appointments 
            WHERE Status IN (?) 
            ORDER BY AppointmentMadeDate DESC
        `;
        
        const appointments = await new Promise((resolve, reject) => {
            db.query(query, ["Rescheduled"], (err, result) => {
                if (err) {
                    console.error("Error fetching appointments:", err);
                    return reject(err);
                }
                resolve(result);
            });
        });

        res.status(200).json({
            success: true,
            appointments,
        });
    } catch (error) {
        console.error("Error fetching not confirmed or rescheduled appointments:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


router.get("/get-confirmed-user", authenticateToken, authorizeRoles(['Customer']), async (req, res) => {
    try {
        // Get the customer ID from the authenticated user object
        const customerId = req.user.customerId;
        
        if (!customerId) {
            return res.status(400).json({
                success: false,
                message: "Customer ID not found in authentication token"
            });
        }

        const query = `
            SELECT a.*, v.Model as VehicleModel 
            FROM appointments a
            LEFT JOIN Vehicles v ON a.VehicleID = v.VehicleNo
            WHERE a.CustomerID = ? AND a.Status = 'Confirmed' 
            ORDER BY a.Date ASC
        `;
        
        const appointments = await new Promise((resolve, reject) => {
            db.query(query, [customerId], (err, result) => {
                if (err) {
                    console.error("Error fetching confirmed appointments:", err);
                    return reject(err);
                }
                resolve(result);
            });
        });

        // Format dates for consistent JSON serialization
        const formattedAppointments = appointments.map(appointment => {
            // Convert date objects to ISO strings
            if (appointment.AppointmentDate instanceof Date) {
                appointment.AppointmentDate = appointment.AppointmentDate.toISOString();
            }
            if (appointment.AppointmentMadeDate instanceof Date) {
                appointment.AppointmentMadeDate = appointment.AppointmentMadeDate.toISOString();
            }
            return appointment;
        });

        res.status(200).json({
            success: true,
            message: "Confirmed appointments retrieved successfully",
            appointments: formattedAppointments,
            count: formattedAppointments.length
        });
    } catch (error) {
        console.error("Error fetching confirmed appointments:", error);
        res.status(500).json({ 
            success: false, 
            message: "Error fetching confirmed appointments", 
            error: error.message 
        });
    }
});



router.get("/get-all", authenticateToken,authorizeRoles(['Admin','Service Advisor']), async (req, res) => {
    try {
        const query = "SELECT * FROM appointments ORDER BY AppointmentMadeDate DESC";

        
        const appointments = await new Promise((resolve, reject) => {
            db.query(query, ["Not Confirmed"], (err, result) => {
                if (err) {
                    console.error("Error fetching appointments:", err);
                    return reject(err);
                }
                resolve(result);
            });
        });

        res.status(200).json({
            success: true,
            appointments,
        });
    } catch (error) {
        console.error("Error fetching not confirmed appointments:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.put("/confirm-appointment/:id", authenticateToken, authorizeRoles(['Admin']), async (req, res) => {
    const { id } = req.params; // AppointmentID

    try {
        // 1. First get appointment and customer details
        const checkAppointmentQuery = `
            SELECT a.*, c.CustomerID, c.FirebaseToken, c.FirstName as CustomerName 
            FROM Appointments a
            JOIN Customers c ON a.CustomerID = c.CustomerID
            WHERE a.AppointmentID = ?`;
        
        db.query(checkAppointmentQuery, [id], async (err, appointmentResult) => {
            if (err) {
                console.error("Error fetching appointment:", err);
                return res.status(500).json({ error: true, message: "Database error" });
            }

            if (appointmentResult.length === 0) {
                return res.status(404).json({ error: true, message: "Appointment not found" });
            }

            const { CustomerID, FirebaseToken, CustomerName, Date: appointmentDate, Time } = appointmentResult[0];
            
            // 2. Safely format the date
            let formattedDate;
            try {
                // Ensure the date is valid before formatting
                const dateObj = new Date(appointmentDate);
                if (isNaN(dateObj.getTime())) {
                    throw new Error("Invalid date");
                }
                formattedDate = dateObj.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            } catch (dateError) {
                console.error("Error formatting date:", dateError);
                // Fallback to raw date if formatting fails
                formattedDate = appointmentDate;
            }

            // 3. Update appointment status
            const updateQuery = "UPDATE Appointments SET Status = 'Confirmed' WHERE AppointmentID = ?";
            db.query(updateQuery, [id], async (updateErr, updateResult) => {
                if (updateErr) {
                    console.error("Error updating appointment:", updateErr);
                    return res.status(500).json({ error: true, message: "Database error" });
                }

                if (updateResult.affectedRows === 0) {
                    return res.status(400).json({ error: true, message: "Appointment already confirmed" });
                }

                // 4. Prepare notification
                const notificationTitle = 'Appointment Confirmed';
                const notificationBody = `Dear ${CustomerName}, your appointment on ${formattedDate} at ${Time} has been confirmed.`;
                let notificationSent = false;

                // 5. Send FCM notification if token exists
                if (FirebaseToken) {
                    const notificationMessage = {
                        notification: {
                            title: notificationTitle,
                            body: notificationBody,
                        },
                        data: {
                            appointmentID: id,
                            type: 'appointment_confirmation',
                            date: formattedDate,
                            time: Time
                        },
                        token: FirebaseToken,
                    };

                    try {
                        await messaging.send(notificationMessage);
                        console.log("FCM notification sent successfully!");
                        notificationSent = true;
                    } catch (notificationError) {
                        console.error("Error sending FCM notification:", notificationError);
                    }
                }

                // 6. Store notification in database
                try {
                    const notificationID = await generateNotificationId();
                    const insertNotificationQuery = `
                        INSERT INTO notifications 
                        (notification_id, CustomerID, title, message, notification_type, icon_type, color_code, is_read, created_at,navigate_id)
                        VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, CURRENT_TIMESTAMP,?)`;

                    await new Promise((resolve, reject) => {
                        db.query(
                            insertNotificationQuery,
                            [
                                notificationID,
                                CustomerID,
                                notificationTitle,
                                notificationBody,
                                'Appointment Confirmed',
                                'event_available',
                                '#4CAF50',
                                id // navigate_id (AppointmentID)
                            ],
                            (err, result) => {
                                if (err) {
                                    console.error("Error storing notification in DB:", err);
                                    return reject(err);
                                }
                                resolve(result);
                            }
                        );
                    });

                    return res.status(200).json({
                        success: true,
                        message: "Appointment confirmed, notification sent and saved.",
                        notificationSent,
                        notificationID,
                        appointment: {
                            id,
                            date: formattedDate,
                            time: Time,
                            status: 'Confirmed'
                        }
                    });

                } catch (dbNotificationErr) {
                    console.error("Failed to store notification in DB:", dbNotificationErr);
                    return res.status(200).json({
                        success: true,
                        message: "Appointment confirmed but failed to store notification.",
                        notificationSent,
                        appointment: {
                            id,
                            date: formattedDate,
                            time: Time,
                            status: 'Confirmed'
                        }
                    });
                }
            });
        });
    } catch (error) {
        console.error("Error during appointment confirmation:", error);
        return res.status(500).json({ error: true, message: "Server error" });
    }
});


router.put("/not-confirm-appointment/:id", authenticateToken,authorizeRoles(['Admin']), async (req, res) => {
    const { id } = req.params; // Get AppointmentID from URL

    try {
        const query = "UPDATE appointments SET Status = 'Not Confirmed' WHERE AppointmentID = ?";
        
        const result = await new Promise((resolve, reject) => {
            db.query(query, [id], (err, result) => {
                if (err) {
                    console.error("Error updating appointment status:", err);
                    return reject(err);
                }
                resolve(result);
            });
        });

        // Check if any row was affected (valid appointment ID)
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Appointment not found or already confirmed" });
        }

        res.status(200).json({
            success: true,
            message: "Appointment confirmed successfully!",
        });
    } catch (error) {
        console.error("Error confirming appointment:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});




router.put("/reschedule-appointment/:id", authenticateToken, async (req, res) => {
    const { id } = req.params; // Get AppointmentID from URL
    const { Date: appointmentDate, Time, VehicleNo } = req.body; // Renamed Date to appointmentDate
    
    // Check if required fields are provided
    if (!appointmentDate || !Time || !VehicleNo) {
        return res.status(400).json({ error: "Missing required fields" });
    }
    
    try {
        // Step 1: Verify if the appointment exists
        const checkQuery = "SELECT a.*, c.CustomerID, c.FirebaseToken FROM Appointments a JOIN Customers c ON a.CustomerID = c.CustomerID WHERE a.AppointmentID = ?";
        const existingAppointment = await new Promise((resolve, reject) => {
            db.query(checkQuery, [id], (err, result) => {
                if (err) {
                    console.error("Error checking appointment:", err);
                    return reject(err);
                }
                resolve(result);
            });
        });
        
        if (existingAppointment.length === 0) {
            return res.status(404).json({ error: "Appointment not found" });
        }
        
        const customerData = existingAppointment[0];
        const customerID = customerData.CustomerID;
        const fcmToken = customerData.FirebaseToken;
        
        if (!fcmToken) {
            console.warn(`No Firebase token found for customer ID: ${customerID}`);
            // Continue with update but note that notification can't be sent
        }
        
        // Step 2: Update the appointment details
        const updateQuery = `
            UPDATE Appointments 
            SET Date = ?, Time = ?, VehicleID = ?, Status = 'Rescheduled', AppointmentMadeDate = CURRENT_TIMESTAMP 
            WHERE AppointmentID = ?`;
        
        const result = await new Promise((resolve, reject) => {
            db.query(updateQuery, [appointmentDate, Time, VehicleNo, id], (err, result) => {
                if (err) {
                    console.error("Error updating appointment:", err);
                    return reject(err);
                }
                resolve(result);
            });
        });
        
        if (result.affectedRows === 0) {
            return res.status(400).json({ error: "Failed to update appointment" });
        }
        
        // Define notification content
        const notificationTitle = 'Appointment Rescheduled';
        const notificationBody = `Your appointment has been rescheduled to ${appointmentDate} at ${Time}.`;
        let notificationSent = false;
        
        // Step 3: Send notification if FCM token exists
        if (fcmToken) {
            try {
                // Create notification message object
                const notificationMessage = {
                    notification: {
                        title: notificationTitle,
                        body: notificationBody,
                    },
                    data: {
                        appointmentId: id,
                        type: 'appointment',
                        date: appointmentDate,
                        time: Time
                    },
                    token: fcmToken,
                };
                
                // Send the notification via Firebase
                await messaging.send(notificationMessage);
                console.log("Reschedule notification sent successfully!");
                notificationSent = true;
            } catch (notificationError) {
                console.error("Error sending notification:", notificationError);
                // Continue even if FCM notification fails
            }
        }
        
        // Step 4: Store notification in database regardless of FCM success
        // Step 4: Store notification in database regardless of FCM success
try {
    // Generate unique notification ID
    const notificationID = await generateNotificationId();

    // Insert notification into database (including navigate_id)
    const insertNotificationQuery = `
        INSERT INTO notifications 
        (notification_id, CustomerID, title, message, notification_type, icon_type, color_code, is_read, created_at, navigate_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, CURRENT_TIMESTAMP, ?)`;

    await new Promise((resolve, reject) => {
        db.query(
            insertNotificationQuery,
            [
                notificationID,
                customerID,
                notificationTitle,
                notificationBody,
                'Reschedule Appointment',    // Type of notification
                'calendar_today',            // Icon type for UI
                '#b7e1cd',                   // Color code for UI
                id                           // navigate_id (AppointmentID)
            ],
            (err, result) => {
                if (err) {
                    console.error("Error storing notification in database:", err);
                    return reject(err);
                }
                resolve(result);
            }
        );
    });

    console.log("Notification stored in database with ID:", notificationID);

    // Return success response with notification details
    return res.status(200).json({
        success: true,
        message: "Appointment rescheduled successfully!",
        notificationSent: notificationSent,
        notificationID: notificationID,
        appointmentId: id
    });

} catch (dbError) {
    console.error("Error storing notification in database:", dbError);
    // Still return success for the appointment update
    return res.status(200).json({
        success: true,
        message: "Appointment rescheduled successfully, but failed to store notification!",
        notificationSent: notificationSent
    });
}

        
    } catch (error) {
        console.error("Error updating appointment:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});


router.get("/search-appointment", async (req, res) => {
    let { query } = req.query; // Use let instead of const to allow reassignment
  
    if (!query) {
      return res.status(400).json({ error: true, message: "Search query is required" });
    }
  
    query = query.trim(); // Trim the query
    const searchQuery = `%${query}%`; // Create search query
  
    console.log("Search Query:", searchQuery); // Log the search query being passed
  
    try {
      // Define the SQL query with placeholders for parameters
      const sqlQuery = `SELECT * FROM appointments WHERE Date LIKE ? OR VehicleID LIKE ? OR Customer LIKE ?`;
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
      console.error("Unexpected error in /search-appointments:", error);
      return res.status(500).json({ error: true, message: "Something went wrong" });
    }
});

router.delete("/delete-appointment/:id", authenticateToken, authorizeRoles(["Admin"]), async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: true, message: "Appointment ID is required" });
        }

        const deleteQuery = "DELETE FROM appointment WHERE AppointmentID = ?";

        db.query(deleteQuery, [id], (err, result) => {
            if (err) {
                console.error("Database query error:", err);
                return res.status(500).json({ error: true, message: "Internal server error" });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: true, message: "Appointment not found" });
            }

            return res.status(200).json({
                success: true,
                message: "Appointment deleted successfully",
            });
        });

    } catch (error) {
        console.error("Unexpected error in /delete-employee:", error);
        return res.status(500).json({ error: true, message: "Something went wrong" });
    }
});

router.get("/today", authenticateToken, authorizeRoles(["Service Advisor", "Admin"]), (req, res) => {
    try {
        // Get today's date in local time zone as YYYY-MM-DD
        const today = new Date().toLocaleDateString("en-CA"); // "en-CA" ensures YYYY-MM-DD format

        console.log("Server Local Date:", today); // Debugging log

        // SQL query to get appointments for today that are confirmed and don't have a job card yet
        const query = `
            SELECT a.* 
            FROM Appointments a
            LEFT JOIN JobCards j ON a.AppointmentID = j.AppointmentID
            WHERE a.Date = ? 
            AND a.Status = 'Confirmed' 
            AND j.AppointmentID IS NULL;
        `;

        db.query(query, [today], (err, results) => {
            if (err) {
                console.error("Database error while fetching today's appointments:", err);
                return res.status(500).json({ error: true, message: "Internal server error. Please try again later." });
            }

            if (!results || results.length === 0) {
                return res.status(404).json({ success: false, message: "No appointments found for today without a job card." });
            }

            return res.status(200).json({ success: true, appointments: results });
        });

    } catch (error) {
        console.error("Unexpected error in fetching today's appointments:", error);
        return res.status(500).json({ error: true, message: "Unexpected server error. Please try again later." });
    }
});

router.get("/appointment/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;  // Get the appointment ID from the URL parameters
    const { customerId } = req.user;  // Get the customerId from the token

    try {
        // Step 1: Check if the appointment exists for the logged-in user
        const appointmentQuery = `
            SELECT * FROM Appointments
            WHERE AppointmentID = ? AND CustomerID = ?
        `;
        
        const appointmentResult = await new Promise((resolve, reject) => {
            db.query(appointmentQuery, [id, customerId], (err, result) => {
                if (err) {
                    console.error("Error fetching appointment:", err);
                    return reject(err);
                }
                resolve(result);
            });
        });

        if (appointmentResult.length === 0) {
            return res.status(404).json({ error: "Appointment not found or doesn't belong to the logged-in user." });
        }

        // Step 2: Return the appointment details
        const appointment = appointmentResult[0];  // Assuming only one result will be returned
        res.status(200).json({
            success: true,
            appointment,
        });
    } catch (error) {
        console.error("Error during /appointment/:id:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


router.put("/reschedule-appointment-customer/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { Date: appointmentDate, Time } = req.body; // Only extract Date and Time
    
    if (!appointmentDate || !Time) {
        return res.status(400).json({ error: "Missing required fields (Date or Time)" });
    }
    
    try {
        // 1. Check if the appointment exists
        const checkQuery = "SELECT * FROM Appointments WHERE AppointmentID = ?";
        const [existingAppointment] = await new Promise((resolve, reject) => {
            db.query(checkQuery, [id], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });
        
        if (!existingAppointment) {
            return res.status(404).json({ error: "Appointment not found" });
        }
        
        // 2. Update only Date, Time, and Status (keep VehicleID unchanged)
        const updateQuery = `
            UPDATE Appointments 
            SET Date = ?, Time = ?, Status = 'Rescheduled', AppointmentMadeDate = CURRENT_TIMESTAMP 
            WHERE AppointmentID = ?`;
        
        const result = await new Promise((resolve, reject) => {
            db.query(updateQuery, [appointmentDate, Time, id], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });
        
        if (result.affectedRows === 0) {
            return res.status(400).json({ error: "Failed to update appointment" });
        }
        
        // 3. Send success response
        return res.status(200).json({ message: "Appointment rescheduled successfully" });
    } catch (error) {
        console.error("Error updating appointment:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});






module.exports = router;
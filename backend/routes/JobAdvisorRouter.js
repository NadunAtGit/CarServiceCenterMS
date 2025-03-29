const express = require("express");
const bcrypt = require("bcryptjs"); // ✅ Import bcrypt
const db = require("../db");
const {generateJobCardId} = require("../GenerateId");
const { validateEmail, validatePhoneNumber } = require("../validations");
const jwt = require("jsonwebtoken");
const{authenticateToken,authorizeRoles}=require("../utilities");
const { messaging, bucket } = require("../firebaseConfig"); 

const router = express.Router();

router.use((req, res, next) => {
    console.log("Service Advisor Route Hit:", req.method, req.url);
    next();
});

router.post("/create-jobcard/:appointmentId", authenticateToken, authorizeRoles(["Service Advisor"]), async (req, res) => {
    const { ServiceDetails, Type } = req.body;
    const { appointmentId } = req.params; // Get appointment ID from params

    // Validate input fields
    if (!ServiceDetails || !Type || !appointmentId) {
        return res.status(400).json({ error: true, message: "All parameters required" });
    }

    try {
        // Check if the appointment exists in the Appointments table
        const checkAppointmentQuery = "SELECT * FROM Appointments WHERE AppointmentID = ?";
        db.query(checkAppointmentQuery, [appointmentId], async (err, result) => {
            if (err) {
                console.error("Error checking appointment:", err);
                return res.status(500).json({ error: true, message: "Database error" });
            }

            // If no matching appointment is found
            if (result.length === 0) {
                return res.status(404).json({ error: true, message: "Appointment not found" });
            }

            // Retrieve the customer's FirebaseToken (FCM token) from the Customers table
            const customerFCMTokenQuery = "SELECT FirebaseToken FROM Customers WHERE CustomerID = ?";
            db.query(customerFCMTokenQuery, [result[0].CustomerID], async (tokenErr, tokenResult) => {
                if (tokenErr) {
                    console.error("Error fetching FirebaseToken:", tokenErr);
                    return res.status(500).json({ error: true, message: "Error retrieving Firebase token" });
                }

                if (tokenResult.length === 0 || !tokenResult[0].FirebaseToken) {
                    return res.status(404).json({ error: true, message: "Customer's FirebaseToken not found" });
                }

                const fcmToken = tokenResult[0].FirebaseToken;

                // Check if a JobCard already exists for this appointment
                const checkJobCardQuery = "SELECT * FROM JobCards WHERE AppointmentID = ?";
                db.query(checkJobCardQuery, [appointmentId], async (jobCardErr, jobCardResult) => {
                    if (jobCardErr) {
                        console.error("Error checking JobCard:", jobCardErr);
                        return res.status(500).json({ error: true, message: "Database error while checking job card" });
                    }

                    // If a JobCard already exists for this appointment
                    if (jobCardResult.length > 0) {
                        return res.status(400).json({ error: true, message: "Job Card already created for this appointment" });
                    }

                    // Generate JobCardID (e.g., JC-0001, JC-0002, etc.)
                    const jobCardID = await generateJobCardId(); // You would need a function like generateJobCardId

                    // Insert into JobCards table
                    const insertQuery = `INSERT INTO JobCards (JobCardID, ServiceDetails, Type, AppointmentID)
                                         VALUES (?, ?, ?, ?)`;

                    db.query(insertQuery, [jobCardID, ServiceDetails, Type, appointmentId], async (insertErr, insertResult) => {
                        if (insertErr) {
                            console.error("Error inserting JobCard:", insertErr);
                            return res.status(500).json({ error: true, message: "Internal server error" });
                        }

                        // Successfully created job card
                        console.log("Job Card created successfully");

                        // Send push notification to the customer

                        const notificationMessage = {
                            notification: {
                                title: 'Job Card Created',
                                body: `Your job card (ID: ${jobCardID}) has been created.`,
                            },
                            token: fcmToken, // Customer's FCM token
                        };
                        
                        try {
                            // Send notification to the customer device
                            await messaging.send(notificationMessage);  // Use messaging to send push notification
                            console.log("Notification sent successfully!");
                        } catch (notificationErr) {
                            console.error("Error sending notification:", notificationErr);
                        }
                        // Respond back to the client
                        return res.status(200).json({
                            success: true,
                            message: "Job Card created successfully and notification sent.",
                            jobCardID,
                        });
                    });
                });
            });
        });
    } catch (error) {
        console.error("Error during job card creation:", error);
        return res.status(500).json({ error: true, message: "Server error" });
    }
});


module.exports = router;
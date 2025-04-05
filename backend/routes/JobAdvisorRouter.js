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
    const { ServiceDetails, Type, ServiceRecords } = req.body; 
    const { appointmentId } = req.params;

    if (!ServiceDetails || !Type || !appointmentId || !Array.isArray(ServiceRecords) || ServiceRecords.length === 0) {
        return res.status(400).json({ error: true, message: "All parameters including service records are required" });
    }

    try {
        // Fetch appointment details including VehicleID
        const checkAppointmentQuery = "SELECT * FROM Appointments WHERE AppointmentID = ?";
        db.query(checkAppointmentQuery, [appointmentId], async (err, result) => {
            if (err) {
                console.error("Error checking appointment:", err);
                return res.status(500).json({ error: true, message: "Database error" });
            }

            if (result.length === 0) {
                return res.status(404).json({ error: true, message: "Appointment not found" });
            }

            const { CustomerID, VehicleID } = result[0]; // Get VehicleID from the appointment

            // Fetch FirebaseToken of the customer
            const customerFCMTokenQuery = "SELECT FirebaseToken FROM Customers WHERE CustomerID = ?";
            db.query(customerFCMTokenQuery, [CustomerID], async (tokenErr, tokenResult) => {
                if (tokenErr) {
                    console.error("Error fetching FirebaseToken:", tokenErr);
                    return res.status(500).json({ error: true, message: "Error retrieving Firebase token" });
                }

                if (tokenResult.length === 0 || !tokenResult[0].FirebaseToken) {
                    return res.status(404).json({ error: true, message: "Customer's FirebaseToken not found" });
                }

                const fcmToken = tokenResult[0].FirebaseToken;

                // Check if a JobCard already exists
                const checkJobCardQuery = "SELECT * FROM JobCards WHERE AppointmentID = ?";
                db.query(checkJobCardQuery, [appointmentId], async (jobCardErr, jobCardResult) => {
                    if (jobCardErr) {
                        console.error("Error checking JobCard:", jobCardErr);
                        return res.status(500).json({ error: true, message: "Database error while checking job card" });
                    }

                    if (jobCardResult.length > 0) {
                        return res.status(400).json({ error: true, message: "Job Card already created for this appointment" });
                    }

                    const jobCardID = await generateJobCardId();

                    // Insert Job Card
                    const insertJobCardQuery = `INSERT INTO JobCards (JobCardID, ServiceDetails, Type, AppointmentID)
                                                VALUES (?, ?, ?, ?)`;

                    db.query(insertJobCardQuery, [jobCardID, ServiceDetails, Type, appointmentId], async (insertErr) => {
                        if (insertErr) {
                            console.error("Error inserting JobCard:", insertErr);
                            return res.status(500).json({ error: true, message: "Internal server error" });
                        }

                        console.log("Job Card created successfully");

                        // Insert Service Records
                        const insertServiceRecordQuery = `INSERT INTO ServiceRecords (ServiceRecord_ID, Description, JobCardID, VehicleID, PartID, ServiceType, Status)
                                                           VALUES (?, ?, ?, ?, ?, ?, ?)`;

                        const serviceRecordPromises = ServiceRecords.map(async (record, index) => {
                            const serviceRecordID = `SR-${jobCardID}-${index + 1}`; // Unique ID
                            return new Promise((resolve, reject) => {
                                db.query(
                                    insertServiceRecordQuery,
                                    [serviceRecordID, record.Description, jobCardID, VehicleID, record.PartID, record.ServiceType, "Not Started"],
                                    (err) => {
                                        if (err) reject(err);
                                        else resolve();
                                    }
                                );
                            });
                        });

                        try {
                            await Promise.all(serviceRecordPromises);
                            console.log("Service Records inserted successfully");

                            // Send push notification
                            const notificationMessage = {
                                notification: {
                                    title: 'Job Card Created',
                                    body: `Your job card (ID: ${jobCardID}) has been created with ${ServiceRecords.length} service records.`,
                                },
                                token: fcmToken,
                            };

                            await messaging.send(notificationMessage);
                            console.log("Notification sent successfully!");

                            return res.status(200).json({
                                success: true,
                                message: "Job Card and Service Records created successfully, notification sent.",
                                jobCardID,
                            });
                        } catch (serviceInsertErr) {
                            console.error("Error inserting Service Records:", serviceInsertErr);
                            return res.status(500).json({ error: true, message: "Error inserting service records" });
                        }
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
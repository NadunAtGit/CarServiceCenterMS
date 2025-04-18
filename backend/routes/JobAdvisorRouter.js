const express = require("express");
const bcrypt = require("bcryptjs"); // ✅ Import bcrypt
const db = require("../db");
const {generateJobCardId,generateNotificationId} = require("../GenerateId");
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
        // Fetch appointment details including VehicleID and CustomerID
        const checkAppointmentQuery = "SELECT * FROM Appointments WHERE AppointmentID = ?";
        db.query(checkAppointmentQuery, [appointmentId], async (err, result) => {
            if (err) {
                console.error("Error checking appointment:", err);
                return res.status(500).json({ error: true, message: "Database error" });
            }

            if (result.length === 0) {
                return res.status(404).json({ error: true, message: "Appointment not found" });
            }

            const { CustomerID, VehicleID } = result[0];

            // Fetch FirebaseToken of the customer
            const customerFCMTokenQuery = "SELECT FirebaseToken FROM Customers WHERE CustomerID = ?";
            db.query(customerFCMTokenQuery, [CustomerID], async (tokenErr, tokenResult) => {
                if (tokenErr) {
                    console.error("Error fetching FirebaseToken:", tokenErr);
                    return res.status(500).json({ error: true, message: "Error retrieving Firebase token" });
                }

                const fcmToken = tokenResult[0]?.FirebaseToken;

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

                        // Insert Service Records
                        const insertServiceRecordQuery = `INSERT INTO ServiceRecords (ServiceRecord_ID, Description, JobCardID, VehicleID, ServiceType, Status)
                                                           VALUES (?, ?, ?, ?, ?, ?)`;

                        const serviceRecordPromises = ServiceRecords.map(async (record, index) => {
                            const serviceRecordID = `SR-${jobCardID}-${index + 1}`;
                            return new Promise((resolve, reject) => {
                                db.query(
                                    insertServiceRecordQuery,
                                    [serviceRecordID, record.Description, jobCardID, VehicleID, record.ServiceType, "Not Started"],
                                    (err) => {
                                        if (err) reject(err);
                                        else resolve();
                                    }
                                );
                            });
                        });

                        try {
                            await Promise.all(serviceRecordPromises);

                            // Define notification
                            const notificationTitle = 'Job Card Created';
                            const notificationBody = `Your job card (ID: ${jobCardID}) has been created with ${ServiceRecords.length} service records.`;
                            let notificationSent = false;

                            // Send FCM notification
                            if (fcmToken) {
                                const notificationMessage = {
                                    notification: {
                                        title: notificationTitle,
                                        body: notificationBody,
                                    },
                                    data: {
                                        jobCardID,
                                        type: 'jobcard'
                                    },
                                    token: fcmToken,
                                };

                                try {
                                    await messaging.send(notificationMessage);
                                    console.log("FCM notification sent successfully!");
                                    notificationSent = true;
                                } catch (notificationError) {
                                    console.error("Error sending FCM notification:", notificationError);
                                }
                            }

                            // Store in DB
                            try {
                                const notificationID = await generateNotificationId();
                                const insertNotificationQuery = `
                                    INSERT INTO notifications 
                                    (notification_id, CustomerID, title, message, notification_type, icon_type, color_code, is_read, created_at)
                                    VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, CURRENT_TIMESTAMP)`;

                                await new Promise((resolve, reject) => {
                                    db.query(
                                        insertNotificationQuery,
                                        [
                                            notificationID,
                                            CustomerID,
                                            notificationTitle,
                                            notificationBody,
                                            'Job Card',          // Notification type
                                            'build',             // Icon type
                                            '#f4cccc',           // Color code (light red/pink)
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

                                console.log("Notification stored in DB with ID:", notificationID);

                                return res.status(200).json({
                                    success: true,
                                    message: "Job Card and Service Records created, notification sent and saved.",
                                    notificationSent,
                                    notificationID,
                                    jobCardID
                                });

                            } catch (dbNotificationErr) {
                                console.error("Failed to store notification in DB:", dbNotificationErr);

                                return res.status(200).json({
                                    success: true,
                                    message: "Job Card and Service Records created, but failed to store notification.",
                                    notificationSent,
                                    jobCardID
                                });
                            }

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
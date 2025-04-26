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

            // Get the vehicle's current mileage
            const getVehicleMileageQuery = "SELECT CurrentMilleage FROM Vehicles WHERE VehicleNo = ?";
            db.query(getVehicleMileageQuery, [VehicleID], async (mileageErr, mileageResult) => {
                if (mileageErr) {
                    console.error("Error fetching vehicle mileage:", mileageErr);
                    return res.status(500).json({ error: true, message: "Error retrieving vehicle mileage" });
                }

                const currentMileage = mileageResult[0]?.CurrentMilleage || 0;

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

                        // Insert Job Card with ServiceMileage
                        const insertJobCardQuery = `INSERT INTO JobCards (JobCardID, ServiceDetails, Type, AppointmentID, ServiceMilleage)
                                                   VALUES (?, ?, ?, ?, ?)`;

                        db.query(insertJobCardQuery, [jobCardID, ServiceDetails, Type, appointmentId, currentMileage], async (insertErr) => {
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
                                        (notification_id, CustomerID, title, message, notification_type, icon_type, color_code, is_read, created_at, navigate_id)
                                        VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, CURRENT_TIMESTAMP, ?)`;

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
                                                jobCardID            // Navigate ID
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
                                        jobCardID,
                                        serviceMileage: currentMileage
                                    });

                                } catch (dbNotificationErr) {
                                    console.error("Failed to store notification in DB:", dbNotificationErr);

                                    return res.status(200).json({
                                        success: true,
                                        message: "Job Card and Service Records created, but failed to store notification.",
                                        notificationSent,
                                        jobCardID,
                                        serviceMileage: currentMileage
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
        });
    } catch (error) {
        console.error("Error during job card creation:", error);
        return res.status(500).json({ error: true, message: "Server error" });
    }
});


router.get("/jobcards", authenticateToken, authorizeRoles(["Service Advisor", "Cashier", "Mechanic", "Admin"]), async (req, res) => {
    const query = "SELECT * FROM JobCards";

    db.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching job cards:", err);
            return res.status(500).json({ error: true, message: "Database error" });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: true, message: "No job cards found" });
        }

        return res.status(200).json({ success: true, jobCards: results });
    });
});

router.get("/finished-jobcards", authenticateToken, authorizeRoles(["Service Advisor", "Cashier", "Mechanic", "Admin"]), async (req, res) => {
    try {
        // 1. Get all finished job cards
        const jobCards = await new Promise((resolve, reject) => {
            db.query(
                "SELECT * FROM JobCards WHERE Status = ?",
                ["Finished"],
                (err, results) => err ? reject(err) : resolve(results)
            );
        });

        if (!jobCards.length) {
            return res.status(404).json({ error: true, message: "No finished job cards found" });
        }

        // 2. For all job card IDs, fetch all service records and parts in one go
        const jobCardIds = jobCards.map(jc => jc.JobCardID);
        // Service records with price
        const serviceRecords = await new Promise((resolve, reject) => {
            db.query(
                `SELECT sr.*, s.Price as ServicePrice
                 FROM ServiceRecords sr
                 LEFT JOIN Services s ON sr.Description = s.ServiceName OR sr.Description = s.Description
                 WHERE sr.JobCardID IN (?)`,
                [jobCardIds],
                (err, results) => err ? reject(err) : resolve(results)
            );
        });

        // Issued parts for each job card from PartInventoryLogs
        const partsUsed = await new Promise((resolve, reject) => {
            db.query(
                `SELECT pl.JobCardID, pl.PartID, pl.BatchNumber, pl.Quantity, pl.UnitPrice, (pl.Quantity * pl.UnitPrice) as TotalPrice, p.Name as PartName
                 FROM PartInventoryLogs pl
                 JOIN Parts p ON pl.PartID = p.PartID
                 WHERE pl.JobCardID IN (?) AND pl.TransactionType = 'Issue'`,
                [jobCardIds],
                (err, results) => err ? reject(err) : resolve(results)
            );
        });

        // 3. Assemble the data for each job card
        const jobCardsWithDetails = jobCards.map(jc => {
            // Service records for this job card
            const services = serviceRecords
                .filter(sr => sr.JobCardID === jc.JobCardID)
                .map(sr => ({
                    serviceRecordId: sr.ServiceRecord_ID,
                    description: sr.Description,
                    serviceType: sr.ServiceType,
                    status: sr.Status,
                    cost: Number(sr.ServicePrice) || 0
                }));

            // Parts used for this job card
            const parts = partsUsed
                .filter(pu => pu.JobCardID === jc.JobCardID)
                .map(pu => ({
                    partId: pu.PartID,
                    partName: pu.PartName,
                    batchNumber: pu.BatchNumber,
                    quantity: pu.Quantity,
                    unitPrice: Number(pu.UnitPrice),
                    totalPrice: Number(pu.TotalPrice)
                }));

            // Calculate total costs
            const totalServiceCost = services.reduce((sum, s) => sum + s.cost, 0);
            const totalPartsCost = parts.reduce((sum, p) => sum + p.totalPrice, 0);

            return {
                ...jc,
                Services: services,
                PartsUsed: parts,
                totalServiceCost,
                totalPartsCost,
                totalCost: totalServiceCost + totalPartsCost
            };
        });

        return res.status(200).json({
            success: true,
            jobCards: jobCardsWithDetails,
            count: jobCardsWithDetails.length
        });

    } catch (error) {
        console.error("Error fetching finished job cards with details:", error);
        return res.status(500).json({
            error: true,
            message: "Internal server error",
            details: error.message
        });
    }
});




  







module.exports = router;
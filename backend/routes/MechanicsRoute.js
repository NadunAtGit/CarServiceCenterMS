const express = require("express");
const db = require("../db");
const jwt = require("jsonwebtoken");
const{authenticateToken,authorizeRoles}=require("../utilities");
const{generateOrderId,generateNotificationId}=require("../GenerateId");
const moment = require("moment");
const { messaging, bucket } = require("../firebaseConfig"); 

const router = express.Router();

router.use((req, res, next) => {
    console.log("Mechanic Route Hit:", req.method, req.url);
    next();
});


router.put("/update-status/:jobCardId", authenticateToken, authorizeRoles(["Mechanic"]), async (req, res) => {
    const { jobCardId } = req.params; // Extract JobCardID from URL params
    const { status } = req.body; // Extract new status from request body
    const { EmployeeID } = req.user; // Mechanic's ID from authenticated user

    // Validate status input
    const allowedStatuses = ["Created", "Assigned", "Ongoing", "Finished"];
    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
            error: true,
            message: "Invalid status. Allowed values are 'Created', 'Assigned', 'Ongoing', 'Finished'."
        });
    }

    try {
        // Check if the mechanic is assigned to this job card
        const assignmentCheckQuery = "SELECT * FROM Mechanics_Assigned WHERE JobCardID = ? AND EmployeeID = ?";
        const assignedMechanic = await new Promise((resolve, reject) => {
            db.query(assignmentCheckQuery, [jobCardId, EmployeeID], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        if (assignedMechanic.length === 0) {
            return res.status(403).json({
                error: true,
                message: "You are not assigned to this job card and cannot update its status."
            });
        }

        // Update job card status
        const updateQuery = "UPDATE JobCards SET Status = ? WHERE JobCardID = ?";
        await new Promise((resolve, reject) => {
            db.query(updateQuery, [status, jobCardId], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        return res.status(200).json({
            success: true,
            message: `Job card status updated to '${status}' successfully.`,
            jobCardId,
            updatedBy: EmployeeID
        });

    } catch (error) {
        console.error("Error updating job card status:", error);
        return res.status(500).json({
            error: true,
            message: "Failed to update job card status. Please try again later."
        });
    }
});



router.get("/assigned-jobcards", authenticateToken, authorizeRoles(["Mechanic"]), async (req, res) => {
    const { EmployeeID } = req.user; // Get mechanic's ID from authenticated user

    try {
        const query = `
            SELECT 
                JC.JobCardID, JC.ServiceDetails, JC.Type, JC.Status,
                A.CustomerID, A.VehicleID, 
                SR.ServiceRecord_ID, SR.Description AS ServiceDescription, SR.ServiceType, SR.Status AS ServiceStatus
            FROM JobCards JC
            JOIN Mechanics_Assigned MA ON JC.JobCardID = MA.JobCardID
            JOIN Appointments A ON JC.AppointmentID = A.AppointmentID
            LEFT JOIN ServiceRecords SR ON JC.JobCardID = SR.JobCardID
            WHERE MA.EmployeeID = ? AND JC.Status = 'Assigned';
        `;

        const jobCards = await new Promise((resolve, reject) => {
            db.query(query, [EmployeeID], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        if (jobCards.length === 0) {
            return res.status(404).json({
                error: true,
                message: "No assigned job cards found.",
            });
        }

        // ✅ Restructure the response to group services under each job card
        const formattedJobCards = jobCards.reduce((acc, row) => {
            const jobCardID = row.JobCardID;
            if (!acc[jobCardID]) {
                acc[jobCardID] = {
                    JobCardID: jobCardID,
                    ServiceDetails: row.ServiceDetails,
                    Type: row.Type,
                    Status: row.Status,
                    CreatedAt: row.CreatedAt,
                    CustomerID: row.CustomerID,
                    VehicleID: row.VehicleID,
                    Services: []
                };
            }
            if (row.ServiceRecord_ID) { // Only add if there is a service record
                acc[jobCardID].Services.push({
                    ServiceRecord_ID: row.ServiceRecord_ID,
                    ServiceDescription: row.ServiceDescription,
                    ServiceType: row.ServiceType,
                    ServiceStatus: row.ServiceStatus
                });
            }
            return acc;
        }, {});

        return res.status(200).json({
            success: true,
            assignedJobCards: Object.values(formattedJobCards),
        });

    } catch (error) {
        console.error("Error fetching assigned job cards:", error.message, error.stack);
        return res.status(500).json({
            error: true,
            message: `Failed to fetch assigned job cards: ${error.message}`,
        });
    }
});

router.put("/update-service-record-status/:serviceRecordId", authenticateToken, authorizeRoles(["Mechanic"]), async (req, res) => {
    const { serviceRecordId } = req.params; // Extract ServiceRecordID from URL params
    const { status } = req.body; // Extract new status from request body
    const { EmployeeID } = req.user; // Mechanic's ID from authenticated user

    try {
        // 1. Retrieve the JobCardID and related customer info associated with the ServiceRecord_ID
        const getJobCardQuery = `
            SELECT sr.JobCardID, j.Status as jobCardStatus, 
                   c.CustomerID, c.FirebaseToken, e.Name as mechanicName
            FROM ServiceRecords sr
            JOIN JobCards j ON sr.JobCardID = j.JobCardID
            JOIN Appointments a ON j.AppointmentID = a.AppointmentID
            JOIN Customers c ON a.CustomerID = c.CustomerID
            JOIN Employees e ON e.EmployeeID = ?
            WHERE sr.ServiceRecord_ID = ?
        `;
        
        const jobCardResult = await new Promise((resolve, reject) => {
            db.query(getJobCardQuery, [EmployeeID, serviceRecordId], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        if (jobCardResult.length === 0) {
            return res.status(404).json({
                error: true,
                message: "Service record not found."
            });
        }

        const jobCardID = jobCardResult[0].JobCardID;
        const customerId = jobCardResult[0].CustomerID;
        const fcmToken = jobCardResult[0].FirebaseToken;
        const mechanicName = jobCardResult[0].mechanicName;
        const jobCardStatus = jobCardResult[0].jobCardStatus;

        // 2. Check if the mechanic is assigned to the job card in the Mechanics_Assigned table
        const assignmentCheckQuery = `
            SELECT 1 
            FROM Mechanics_Assigned 
            WHERE JobCardID = ? AND EmployeeID = ?
        `;

        const assignedMechanic = await new Promise((resolve, reject) => {
            db.query(assignmentCheckQuery, [jobCardID, EmployeeID], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        if (assignedMechanic.length === 0) {
            return res.status(403).json({
                error: true,
                message: "You are not assigned to this service record and cannot update its status."
            });
        }

        // 3. Update the service record status
        const updateQuery = "UPDATE ServiceRecords SET Status = ? WHERE ServiceRecord_ID = ?";
        await new Promise((resolve, reject) => {
            db.query(updateQuery, [status, serviceRecordId], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        // 4. Prepare and send notification to customer
        const notificationTitle = 'Service Status Updated';
        const notificationBody = `Mechanic ${mechanicName} updated status of service in job card #${jobCardID} to: ${status}`;
        
        let notificationSent = false;
        
        if (fcmToken) {
            const notificationMessage = {
                notification: {
                    title: notificationTitle,
                    body: notificationBody,
                },
                data: {
                    jobCardID: jobCardID,
                    serviceRecordId: serviceRecordId,
                    type: 'service_status_update',
                    status: status,
                    updatedBy: EmployeeID
                },
                token: fcmToken,
            };

            try {
                await messaging.send(notificationMessage);
                notificationSent = true;
            } catch (error) {
                console.error("Error sending FCM notification:", error);
            }
        }

        // 5. Store notification in database
        const notificationID = await generateNotificationId();
        await db.promise().query(
            `INSERT INTO notifications 
            (notification_id, CustomerID, title, message, notification_type, icon_type, color_code, is_read, created_at, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, CURRENT_TIMESTAMP, ?)`,
            [
                notificationID,
                customerId,
                notificationTitle,
                notificationBody,
                'Service Status Update',
                'build',
                '#2196F3', // Blue color
                JSON.stringify({ 
                    jobCardID: jobCardID, 
                    serviceRecordId: serviceRecordId,
                    status: status,
                    updatedBy: EmployeeID,
                    mechanicName: mechanicName
                })
            ]
        );

        return res.status(200).json({
            success: true,
            message: `Service record status updated to '${status}' successfully.`,
            serviceRecordId,
            updatedBy: EmployeeID,
            notification: {
                sent: notificationSent,
                id: notificationID
            }
        });

    } catch (error) {
        console.error("Error updating service record status:", error);
        return res.status(500).json({
            error: true,
            message: "Failed to update service record status. Please try again later."
        });
    }
});





// router.post("/order-parts/:jobCardId", authenticateToken, authorizeRoles(["Mechanic"]), async (req, res) => {
//     const { jobCardId } = req.params;
//     const { parts } = req.body; // Expecting an array of { ServiceRecord_ID, PartID, Quantity }

//     if (!parts || !Array.isArray(parts) || parts.length === 0) {
//         return res.status(400).json({ message: "Please provide parts and their quantities." });
//     }

//     try {
//         const jobCardQuery = "SELECT * FROM JobCards WHERE JobCardID = ?";
//         db.query(jobCardQuery, [jobCardId], (err, result) => {
//             if (err) {
//                 return res.status(500).json({ message: "Error checking job card", error: err });
//             }

//             if (result.length === 0) {
//                 return res.status(404).json({ message: "Job card not found." });
//             }

//             const serviceRecordsQuery = "SELECT * FROM ServiceRecords WHERE JobCardID = ? AND Status IN ('Not Started', 'Ongoing', 'Started','Finished')";

//             db.query(serviceRecordsQuery, [jobCardId], (err, serviceRecords) => {
//                 if (err) {
//                     return res.status(500).json({ message: "Error fetching service records", error: err });
//                 }

//                 const validServiceRecords = serviceRecords.map(record => record.ServiceRecord_ID);
//                 const invalidParts = parts.filter(part => !validServiceRecords.includes(part.ServiceRecord_ID));

//                 if (invalidParts.length > 0) {
//                     return res.status(400).json({ message: "Some service records are invalid for this job card.", invalidParts });
//                 }

//                 generateOrderId().then(orderId => {
//                     const insertOrderQuery = `
//                         INSERT INTO PartOrders (OrderID, JobCardID, RequestedBy, RequestedAt, OrderStatus)
//                         VALUES (?, ?, ?, NOW(), 'Sent')`;

//                     db.query(insertOrderQuery, [orderId, jobCardId, req.user.EmployeeID], (err, result) => {
//                         if (err) {
//                             return res.status(500).json({ message: "Error creating order", error: err });
//                         }

//                         const orderPartsValues = parts.map(part => [
//                             orderId, part.ServiceRecord_ID, part.PartID, part.Quantity
//                         ]);

//                         const insertOrderPartsQuery = `
//                             INSERT INTO Order_Parts (OrderID, ServiceRecordID, PartID, Quantity)
//                             VALUES ?`;

//                         db.query(insertOrderPartsQuery, [orderPartsValues], (err, result) => {
//                             if (err) {
//                                 return res.status(500).json({ message: "Error inserting order parts", error: err });
//                             }

//                             res.status(201).json({ message: "Order created successfully", orderId });
//                         });
//                     });
//                 }).catch(error => {
//                     return res.status(500).json({ message: "Error generating OrderID", error });
//                 });
//             });
//         });
//     } catch (error) {
//         console.error("Error in order-parts route:", error);
//         res.status(500).json({ message: "Internal server error", error });
//     }
// });

router.post("/order-parts/:jobCardId", authenticateToken, authorizeRoles(["Mechanic"]), async (req, res) => {
    const { jobCardId } = req.params;
    const { parts } = req.body; // Expecting an array of { ServiceRecord_ID, PartID, Quantity }

    if (!parts || !Array.isArray(parts) || parts.length === 0) {
        return res.status(400).json({ message: "Please provide parts and their quantities." });
    }

    try {
        // Check job card exists
        const jobCardQuery = "SELECT * FROM JobCards WHERE JobCardID = ?";
        db.query(jobCardQuery, [jobCardId], (err, result) => {
            if (err) {
                return res.status(500).json({ message: "Error checking job card", error: err });
            }

            if (result.length === 0) {
                return res.status(404).json({ message: "Job card not found." });
            }

            // Check service records are valid
            const serviceRecordsQuery = "SELECT * FROM ServiceRecords WHERE JobCardID = ? AND Status IN ('Not Started', 'Ongoing', 'Started','Finished')";

            db.query(serviceRecordsQuery, [jobCardId], (err, serviceRecords) => {
                if (err) {
                    return res.status(500).json({ message: "Error fetching service records", error: err });
                }

                const validServiceRecords = serviceRecords.map(record => record.ServiceRecord_ID);
                const invalidParts = parts.filter(part => !validServiceRecords.includes(part.ServiceRecord_ID));

                if (invalidParts.length > 0) {
                    return res.status(400).json({ message: "Some service records are invalid for this job card.", invalidParts });
                }

                // Check parts availability using batch tracking
                const partAvailabilityChecks = [];
                
                // For each requested part, check availability across all batches
                parts.forEach(part => {
                    const availabilityQuery = `
                        SELECT 
                            p.PartID, 
                            p.Name,
                            SUM(sb.RemainingQuantity) AS AvailableQuantity
                        FROM 
                            Parts p
                        LEFT JOIN 
                            StockBatches sb ON p.PartID = sb.PartID AND sb.RemainingQuantity > 0
                        WHERE 
                            p.PartID = ?
                        GROUP BY 
                            p.PartID, p.Name`;
                    
                    partAvailabilityChecks.push(
                        new Promise((resolve, reject) => {
                            db.query(availabilityQuery, [part.PartID], (err, result) => {
                                if (err) {
                                    reject(err);
                                    return;
                                }
                                
                                const available = result[0]?.AvailableQuantity || 0;
                                resolve({
                                    ...part,
                                    requested: part.Quantity,
                                    available: available,
                                    isAvailable: available >= part.Quantity,
                                    partName: result[0]?.Name || 'Unknown Part'
                                });
                            });
                        })
                    );
                });

                // Process all availability checks
                Promise.all(partAvailabilityChecks)
                    .then(availabilityResults => {
                        // Check if any parts are unavailable
                        const unavailableParts = availabilityResults.filter(part => !part.isAvailable);
                        
                        // Include availability information with the order
                        const availabilityInfo = availabilityResults.map(part => ({
                            PartID: part.PartID,
                            ServiceRecord_ID: part.ServiceRecord_ID,
                            requested: part.requested,
                            available: part.available,
                            partName: part.partName
                        }));

                        // Generate order ID and create the order
                        generateOrderId().then(orderId => {
                            const insertOrderQuery = `
                                INSERT INTO PartOrders (
                                    OrderID, 
                                    JobCardID, 
                                    RequestedBy, 
                                    RequestedAt, 
                                    OrderStatus,
                                    FulfillmentStatus,
                                    Notes
                                )
                                VALUES (?, ?, ?, NOW(), 'Sent', 'Pending', ?)`;

                            // Add a note about unavailable parts if any
                            let orderNotes = '';
                            if (unavailableParts.length > 0) {
                                orderNotes = `Warning: Some parts have insufficient stock. ${unavailableParts.map(p => 
                                    `${p.partName}: requested ${p.requested}, available ${p.available}`).join('; ')}`;
                            }

                            db.query(insertOrderQuery, [
                                orderId, 
                                jobCardId, 
                                req.user.EmployeeID, 
                                orderNotes
                            ], (err, result) => {
                                if (err) {
                                    return res.status(500).json({ message: "Error creating order", error: err });
                                }

                                const orderPartsValues = parts.map(part => [
                                    orderId, part.ServiceRecord_ID, part.PartID, part.Quantity
                                ]);

                                const insertOrderPartsQuery = `
                                    INSERT INTO Order_Parts (OrderID, ServiceRecordID, PartID, Quantity)
                                    VALUES ?`;

                                db.query(insertOrderPartsQuery, [orderPartsValues], (err, result) => {
                                    if (err) {
                                        return res.status(500).json({ message: "Error inserting order parts", error: err });
                                    }

                                    res.status(201).json({ 
                                        message: "Order created successfully", 
                                        orderId,
                                        availability: availabilityInfo,
                                        hasUnavailableParts: unavailableParts.length > 0
                                    });
                                });
                            });
                        }).catch(error => {
                            return res.status(500).json({ message: "Error generating OrderID", error });
                        });
                    })
                    .catch(error => {
                        return res.status(500).json({ message: "Error checking parts availability", error });
                    });
            });
        });
    } catch (error) {
        console.error("Error in order-parts route:", error);
        res.status(500).json({ message: "Internal server error", error });
    }
});


router.get("/check-part-availability/:partId", authenticateToken, authorizeRoles(["Admin", "Cashier", "Mechanic"]), async (req, res) => {
    const { partId } = req.params;
    const query = `
        SELECT 
            p.PartID, 
            p.Name,
            p.Stock,
            SUM(sb.RemainingQuantity) AS TotalAvailable,
            COUNT(DISTINCT sb.BatchID) AS BatchCount
        FROM 
            Parts p
        LEFT JOIN 
            StockBatches sb ON p.PartID = sb.PartID AND sb.RemainingQuantity > 0
        WHERE 
            p.PartID = ?
        GROUP BY 
            p.PartID, p.Name, p.Stock`;

    db.query(query, [partId], (err, results) => {
        if (err) return res.status(500).json({ message: "Error checking part availability", error: err });

        if (results.length === 0) {
            return res.status(404).json({ message: "Part not found" });
        }

        // Get batch details for FIFO information
        const batchQuery = `
            SELECT 
                BatchID,
                BatchNumber,
                RemainingQuantity,
                ReceiptDate,
                ExpiryDate
            FROM 
                StockBatches 
            WHERE 
                PartID = ? AND RemainingQuantity > 0
            ORDER BY 
                ReceiptDate ASC`;  // FIFO order - oldest first

        db.query(batchQuery, [partId], (err, batchResults) => {
            if (err) return res.status(500).json({ message: "Error fetching batch details", error: err });

            res.status(200).json({ 
                part: results[0],
                batches: batchResults,
                isAvailable: (results[0].TotalAvailable > 0)
            });
        });
    });
});


router.put("/finish-job/:JobCardID", authenticateToken, authorizeRoles(["Mechanic"]), async (req, res) => {
    const { JobCardID } = req.params;
    const mechanicId = req.user.EmployeeID;
    const { nextServiceMileage } = req.body; // Get the next service mileage from request body
    
    console.log(`Starting finish-job for JobCardID: ${JobCardID}, mechanic: ${mechanicId}`);
    console.log(`Next service mileage provided: ${nextServiceMileage}`);

    try {
        // Step 1: Check if the job card exists
        const jobCardQuery = "SELECT * FROM JobCards WHERE JobCardID = ?";
        
        db.query(jobCardQuery, [JobCardID], (err, jobCardResult) => {
            if (err) {
                console.error("Error checking job card:", err);
                return res.status(500).json({ 
                    success: false, 
                    message: "Error checking job card", 
                    error: err 
                });
            }

            if (jobCardResult.length === 0) {
                console.error(`Job card ${JobCardID} not found`);
                return res.status(404).json({ 
                    success: false, 
                    message: "Job card not found" 
                });
            }

            const jobCard = jobCardResult[0];
            console.log(`Found job card: ${JSON.stringify(jobCard)}`);

            // Step 2: Check if the job card is already finished
            if (jobCard.Status === 'Finished') {
                console.error(`Job card ${JobCardID} is already finished`);
                return res.status(400).json({ 
                    success: false, 
                    message: "Job card is already marked as finished" 
                });
            }

            // Step 3: Check if all service records for this job card are completed
            const serviceRecordsQuery = `
                SELECT * FROM ServiceRecords 
                WHERE JobCardID = ? AND Status != 'Finished'`;
            
            db.query(serviceRecordsQuery, [JobCardID], (err, incompleteServices) => {
                if (err) {
                    console.error("Error checking service records:", err);
                    return res.status(500).json({ 
                        success: false, 
                        message: "Error checking service records", 
                        error: err 
                    });
                }

                // If there are any incomplete services, don't allow finishing the job card
                if (incompleteServices.length > 0) {
                    console.error(`Job card ${JobCardID} has ${incompleteServices.length} incomplete services`);
                    return res.status(400).json({ 
                        success: false, 
                        message: "Cannot finish job card. There are still unfinished services.", 
                        incompleteServices: incompleteServices.map(service => service.ServiceRecord_ID) 
                    });
                }

                // Step 4: Get the AppointmentID from JobCard to fetch VehicleID
                console.log(`Getting AppointmentID from JobCard ${JobCardID}`);
                const appointmentID = jobCard.AppointmentID;
                
                if (!appointmentID) {
                    console.error(`No AppointmentID found for JobCard ${JobCardID}`);
                    return res.status(400).json({
                        success: false,
                        message: "Job card has no associated appointment"
                    });
                }
                
                console.log(`Found AppointmentID: ${appointmentID}, fetching VehicleID`);
                
                // Step 5: Get VehicleID, CustomerID, and mechanic name from Appointments table
                const getInfoQuery = `
                    SELECT a.VehicleID, a.CustomerID, c.FirebaseToken, e.Name as mechanicName 
                    FROM Appointments a
                    JOIN Customers c ON a.CustomerID = c.CustomerID
                    JOIN Employees e ON e.EmployeeID = ?
                    WHERE a.AppointmentID = ?`;
                
                db.query(getInfoQuery, [mechanicId, appointmentID], (err, infoResult) => {
                    if (err) {
                        console.error(`Error fetching appointment data: ${err.message}`);
                        return res.status(500).json({
                            success: false,
                            message: "Error fetching vehicle information",
                            error: err
                        });
                    }
                    
                    if (infoResult.length === 0) {
                        console.error(`No appointment found with ID ${appointmentID}`);
                        return res.status(404).json({
                            success: false,
                            message: "Associated appointment not found"
                        });
                    }
                    
                    const vehicleID = infoResult[0].VehicleID;
                    const customerID = infoResult[0].CustomerID;
                    const fcmToken = infoResult[0].FirebaseToken;
                    const mechanicName = infoResult[0].mechanicName;
                    
                    console.log(`Found VehicleID: ${vehicleID} for CustomerID: ${customerID}`);
                    
                    // Step 6: Get all mechanics assigned to this job card
                    const getMechanicsQuery = `
                        SELECT EmployeeID FROM mechanics_assigned 
                        WHERE JobCardID = ?`;
                    
                    db.query(getMechanicsQuery, [JobCardID], (err, assignedMechanics) => {
                        if (err) {
                            console.error("Error fetching assigned mechanics:", err);
                            return res.status(500).json({ 
                                success: false, 
                                message: "Error fetching assigned mechanics", 
                                error: err 
                            });
                        }

                        console.log(`Found ${assignedMechanics.length} mechanics assigned to job card`);

                        // Begin transaction to update job card, attendances, and vehicle mileage
                        db.beginTransaction(err => {
                            if (err) {
                                console.error("Error starting transaction:", err);
                                return res.status(500).json({ 
                                    success: false, 
                                    message: "Error starting transaction", 
                                    error: err 
                                });
                            }

                            // Step 7.1: Update job card status to 'Finished'
                            const updateJobCardQuery = `
                                UPDATE JobCards 
                                SET Status = 'Finished'
                                WHERE JobCardID = ?`;
                            
                            db.query(updateJobCardQuery, [JobCardID], (err, updateResult) => {
                                if (err) {
                                    db.rollback(() => {
                                        console.error(`Error updating job card status: ${err.message}`);
                                        return res.status(500).json({ 
                                            success: false, 
                                            message: "Error updating job card status", 
                                            error: err 
                                        });
                                    });
                                    return;
                                }
                                
                                console.log(`Job card status updated to Finished`);
                                
                                // Step 7.2: Get current service mileage from JobCard
                                const serviceMilleage = jobCard.ServiceMilleage || 0;
                                console.log(`Current service mileage: ${serviceMilleage}`);
                                
                                // Validate that nextServiceMileage is greater than current mileage
                                if (nextServiceMileage && nextServiceMileage <= serviceMilleage) {
                                    db.rollback(() => {
                                        console.error(`Invalid next service mileage: ${nextServiceMileage} must be greater than current mileage: ${serviceMilleage}`);
                                        return res.status(400).json({ 
                                            success: false, 
                                            message: `Next service mileage must be greater than current mileage (${serviceMilleage})` 
                                        });
                                    });
                                    return;
                                }
                                
                                // Calculate next service mileage if not provided or use validated input
                                const nextMileage = nextServiceMileage || (serviceMilleage + 5000);
                                console.log(`Next service mileage will be set to: ${nextMileage}`);
                                
                                // Step 7.3: Update vehicle's NextServiceMilleage
                                const updateVehicleQuery = `
                                    UPDATE Vehicles 
                                    SET NextServiceMilleage = ? 
                                    WHERE VehicleNo = ?`;
                                
                                db.query(updateVehicleQuery, [nextMileage, vehicleID], (err, vehicleResult) => {
                                    if (err) {
                                        db.rollback(() => {
                                            console.error(`Error updating vehicle mileage: ${err.message}`);
                                            return res.status(500).json({ 
                                                success: false, 
                                                message: "Error updating vehicle next service mileage", 
                                                error: err 
                                            });
                                        });
                                        return;
                                    }
                                    
                                    console.log(`Updated NextServiceMilleage for vehicle ${vehicleID} to ${nextMileage}`);
                                    console.log(`Affected rows: ${vehicleResult.affectedRows}`);

                                    // Generate notification ID
                                    generateNotificationId().then(notificationID => {
                                        // Prepare notification data
                                        const notificationTitle = 'Job Card Completed';
                                        const notificationBody = `Mechanic ${mechanicName} has completed your job card #${JobCardID}`;
                                        
                                        // Prepare notification metadata
                                        const metadata = JSON.stringify({
                                            jobCardID: JobCardID,
                                            completedBy: mechanicId,
                                            mechanicName: mechanicName,
                                            completedAt: new Date().toISOString(),
                                            vehicleId: vehicleID
                                        });
                                        
                                        // Insert notification into database
                                        const insertNotificationQuery = `
    INSERT INTO notifications 
    (notification_id, CustomerID, title, message, notification_type, icon_type, color_code, is_read, created_at, navigate_id, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, CURRENT_TIMESTAMP, ?, ?)`;
                                        
                                        db.query(insertNotificationQuery, [
                                            notificationID,
                                            customerID,
                                            notificationTitle,
                                            notificationBody,
                                            'Job Card Completed',  // notification_type
                                            'done_all',            // icon_type
                                            '#4CAF50',             // color_code - Green
                                            JobCardID,             // navigate_id
                                            metadata               // metadata
                                        ],  (err, notificationResult) => {
                                            if (err) {
                                                console.error("Error inserting notification:", err);
                                                // Continue with the process even if notification insertion fails
                                            }
                                            
                                            // Try to send FCM notification if token exists
                                            let notificationSent = false;
                                            
                                            const processFCMAndUpdateAttendances = () => {
                                                // If no mechanics are assigned, just commit the transaction
                                                if (assignedMechanics.length === 0) {
                                                    db.commit(err => {
                                                        if (err) {
                                                            db.rollback(() => {
                                                                console.error("Error committing transaction:", err);
                                                                return res.status(500).json({ 
                                                                    success: false, 
                                                                    message: "Error committing transaction", 
                                                                    error: err 
                                                                });
                                                            });
                                                            return;
                                                        }

                                                        console.log(`Transaction committed successfully, no mechanics to release`);
                                                        return res.status(200).json({ 
                                                            success: true, 
                                                            message: "Job card finished successfully. No mechanics were assigned.", 
                                                            jobCardId: JobCardID,
                                                            completedBy: mechanicId,
                                                            completedAt: new Date(),
                                                            currentMileage: serviceMilleage,
                                                            nextServiceMileage: nextMileage,
                                                            vehicleId: vehicleID,
                                                            notification: {
                                                                sent: notificationSent,
                                                                id: notificationID
                                                            }
                                                        });
                                                    });
                                                    return;
                                                }

                                                // Get array of mechanic IDs
                                                const mechanicIds = assignedMechanics.map(mech => mech.EmployeeID);
                                                console.log(`Releasing mechanics: ${mechanicIds.join(', ')}`);
                                                
                                                // Step 7.4: Update attendances table to set isWorking = 0 for all assigned mechanics
                                                const updateAttendancesQuery = `
                                                    UPDATE attendances 
                                                    SET isWorking = 0
                                                    WHERE EmployeeID IN (?)`;
                                                
                                                db.query(updateAttendancesQuery, [mechanicIds], (err, attendancesResult) => {
                                                    if (err) {
                                                        db.rollback(() => {
                                                            console.error("Error updating attendances:", err);
                                                            return res.status(500).json({ 
                                                                success: false, 
                                                                message: "Error updating attendances", 
                                                                error: err 
                                                            });
                                                        });
                                                        return;
                                                    }

                                                    console.log(`Updated attendance status for ${attendancesResult.affectedRows} mechanics`);

                                                    // Commit the transaction
                                                    db.commit(err => {
                                                        if (err) {
                                                            db.rollback(() => {
                                                                console.error("Error committing transaction:", err);
                                                                return res.status(500).json({ 
                                                                    success: false, 
                                                                    message: "Error committing transaction", 
                                                                    error: err 
                                                                });
                                                            });
                                                            return;
                                                        }

                                                        console.log(`Transaction committed successfully with mechanics released`);
                                                        // Success response
                                                        return res.status(200).json({ 
                                                            success: true, 
                                                            message: "Job card finished successfully and mechanics released", 
                                                            jobCardId: JobCardID,
                                                            completedBy: mechanicId,
                                                            completedAt: new Date(),
                                                            releasedMechanics: mechanicIds,
                                                            currentMileage: serviceMilleage,
                                                            nextServiceMileage: nextMileage,
                                                            vehicleId: vehicleID,
                                                            notification: {
                                                                sent: notificationSent,
                                                                id: notificationID
                                                            }
                                                        });
                                                    });
                                                });
                                            };
                                            
                                            // Send FCM notification if token exists
                                            if (fcmToken) {
                                                const notificationMessage = {
                                                    notification: {
                                                        title: notificationTitle,
                                                        body: notificationBody,
                                                    },
                                                    data: {
                                                        jobCardID: JobCardID,
                                                        type: 'job_card_completed',
                                                        completedBy: mechanicId.toString(),
                                                        vehicleId: vehicleID.toString()
                                                    },
                                                    token: fcmToken,
                                                };

                                                messaging.send(notificationMessage)
                                                    .then(() => {
                                                        console.log("FCM notification sent successfully");
                                                        notificationSent = true;
                                                        processFCMAndUpdateAttendances();
                                                    })
                                                    .catch((error) => {
                                                        console.error("Error sending FCM notification:", error);
                                                        // Continue the process even if FCM fails
                                                        processFCMAndUpdateAttendances();
                                                    });
                                            } else {
                                                console.log("No FCM token available for customer, skipping push notification");
                                                processFCMAndUpdateAttendances();
                                            }
                                        });
                                    }).catch(err => {
                                        db.rollback(() => {
                                            console.error("Error generating notification ID:", err);
                                            return res.status(500).json({ 
                                                success: false, 
                                                message: "Error generating notification ID", 
                                                error: err 
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    } catch (error) {
        console.error("Unhandled error in finish-job route:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Internal server error", 
            error: error.message 
        });
    }
});


router.post("/reports/save", authenticateToken, authorizeRoles(["Admin"]), async (req, res) => {
    const { reportType, startDate, endDate, department, reportData } = req.body;
    const employeeId = req.user.EmployeeID;
    
    try {
        // Generate a unique report ID
        const date = new Date();
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
        
        // Get the count of reports generated today
        const countQuery = `
            SELECT COUNT(*) as count 
            FROM Reports 
            WHERE DATE(GeneratedDate) = CURDATE()
        `;
        
        db.query(countQuery, [], (err, countResult) => {
            if (err) {
                console.error("Error counting reports:", err);
                return res.status(500).json({ success: false, message: "Database error" });
            }
            
            const count = countResult[0].count + 1;
            const reportId = `REP-${dateStr}-${count.toString().padStart(2, '0')}`;
            
            // Insert the report
            const insertQuery = `
                INSERT INTO Reports (
                    ReportID, ReportType, StartDate, EndDate, Department,
                    Transactions, Revenue, ServicesCompleted, PartsSold,
                    ServiceRevenue, PartsRevenue, GeneratedBy, ReportData
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const params = [
                reportId,
                reportType,
                startDate,
                endDate,
                department,
                reportData.transactions || 0,
                reportData.revenue || 0,
                reportData.services || 0,
                reportData.parts || 0,
                reportData.serviceRevenue || 0,
                reportData.partsRevenue || 0,
                employeeId,
                JSON.stringify(reportData)
            ];
            
            db.query(insertQuery, params, (err, result) => {
                if (err) {
                    console.error("Error saving report:", err);
                    return res.status(500).json({ success: false, message: "Failed to save report" });
                }
                
                res.status(201).json({
                    success: true,
                    message: "Report saved successfully",
                    reportId: reportId
                });
            });
        });
    } catch (error) {
        console.error("Error in save report:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});







































module.exports = router;
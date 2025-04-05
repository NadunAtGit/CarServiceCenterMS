const express = require("express");
const db = require("../db");
const jwt = require("jsonwebtoken");
const{authenticateToken,authorizeRoles}=require("../utilities");
const{generateOrderId}=require("../GenerateId");
const moment = require("moment");

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
        // 1. Retrieve the JobCardID associated with the ServiceRecord_ID
        const getJobCardQuery = `
            SELECT JobCardID 
            FROM ServiceRecords 
            WHERE ServiceRecord_ID = ?
        `;
        
        const jobCardResult = await new Promise((resolve, reject) => {
            db.query(getJobCardQuery, [serviceRecordId], (err, result) => {
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

        return res.status(200).json({
            success: true,
            message: `Service record status updated to '${status}' successfully.`,
            serviceRecordId,
            updatedBy: EmployeeID
        });

    } catch (error) {
        console.error("Error updating service record status:", error);
        return res.status(500).json({
            error: true,
            message: "Failed to update service record status. Please try again later."
        });
    }
});


router.post("/order-parts/:jobCardId", authenticateToken, authorizeRoles(["Mechanic"]), async (req, res) => {
    const { jobCardId } = req.params;
    const { parts } = req.body; // Expecting an array of { ServiceRecord_ID, PartID, Quantity }

    // Validate that parts are provided
    if (!parts || !Array.isArray(parts) || parts.length === 0) {
        return res.status(400).json({ message: "Please provide parts and their quantities." });
    }

    try {
        // Step 1: Check if the JobCardID exists
        const jobCardQuery = "SELECT * FROM JobCards WHERE JobCardID = ?";
        db.query(jobCardQuery, [jobCardId], (err, result) => {
            if (err) {
                return res.status(500).json({ message: "Error checking job card", error: err });
            }

            if (result.length === 0) {
                return res.status(404).json({ message: "Job card not found." });
            }

            // Step 2: Validate the service records linked to the job card
            const serviceRecordsQuery = "SELECT * FROM ServiceRecords WHERE JobCardID = ? AND Status IN ('Not Started', 'Ongoing', 'Started')";

            db.query(serviceRecordsQuery, [jobCardId], (err, serviceRecords) => {
                if (err) {
                    return res.status(500).json({ message: "Error fetching service records", error: err });
                }

                // Step 3: Check if each service record in the parts array exists in the service records
                const validServiceRecords = serviceRecords.map(record => record.ServiceRecord_ID);
                const invalidParts = parts.filter(part => !validServiceRecords.includes(part.ServiceRecord_ID));

                if (invalidParts.length > 0) {
                    return res.status(400).json({ message: "Some service records are invalid for this job card.", invalidParts });
                }

                // Step 4: Generate OrderID for the Part Order
                generateOrderId().then(orderId => {
                    // Step 5: Insert into PartOrders table with OrderStatus and RequestedBy as req.user.EmployeeID
                    const insertOrderQuery = `
                        INSERT INTO PartOrders (OrderID, JobCardID, RequestedBy, RequestedAt, OrderStatus)
                        VALUES (?, ?, ?, NOW(), 'Sent')`;  // Set 'Sent' as default status (can be changed later)
                    
                    db.query(insertOrderQuery, [orderId, jobCardId, req.user.EmployeeID], (err, result) => {
                        if (err) {
                            return res.status(500).json({ message: "Error creating order", error: err });
                        }

                        // Step 6: Insert each part and quantity into the Order_Parts table
                        // Ensure that each part includes ServiceRecordID as well
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

                            // Step 7: Insert into Order_ServiceRecords table to link parts with service records
                            const orderServiceRecordsValues = parts.map(part => [
                                orderId, part.ServiceRecord_ID
                            ]);

                            const insertOrderServiceRecordsQuery = `
                                INSERT INTO Order_ServiceRecords (OrderID, ServiceRecordID)
                                VALUES ?`;

                            db.query(insertOrderServiceRecordsQuery, [orderServiceRecordsValues], (err, result) => {
                                if (err) {
                                    return res.status(500).json({ message: "Error linking order to service records", error: err });
                                }

                                // Step 8: Respond with success
                                res.status(201).json({ message: "Order created successfully", orderId });
                            });
                        });
                    });
                }).catch(error => {
                    return res.status(500).json({ message: "Error generating OrderID", error });
                });
            });
        });
    } catch (error) {
        console.error("Error in order-parts route:", error);
        res.status(500).json({ message: "Internal server error", error });
    }
});































module.exports = router;
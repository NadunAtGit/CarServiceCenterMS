const express = require("express");
const bcrypt = require("bcryptjs"); // ✅ Import bcrypt
const db = require("../db");
const {generateEmployeeId,generatePartId,generateStockID,generateServiceID,generateBatchID,generateInvoiceID}=require("../GenerateId")
const { validateEmail, validatePhoneNumber } = require("../validations");
const jwt = require("jsonwebtoken");
const{authenticateToken,authorizeRoles}=require("../utilities");
const moment = require("moment");
const { v4: uuidv4 } = require("uuid");
const multer = require("multer");
const path = require("path");
const { messaging, bucket } = require("../firebaseConfig"); 


// Multer Storage Config
const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = express.Router();


router.use((req, res, next) => {
    console.log("Admin Route Hit:", req.method, req.url);
    next();
});


// router.put("/approveorder/:orderid", authenticateToken, authorizeRoles(["Cashier"]), async (req, res) => {
//     const { orderid } = req.params;
//     const cashierId = req.user.EmployeeID;  // Get the authenticated cashier's ID

//     try {
//         // Step 1: Check if the order exists
//         const orderQuery = "SELECT * FROM PartOrders WHERE OrderID = ?";
//         db.query(orderQuery, [orderid], (err, result) => {
//             if (err) {
//                 return res.status(500).json({ message: "Error checking order", error: err });
//             }

//             if (result.length === 0) {
//                 return res.status(404).json({ message: "Order not found." });
//             }

//             const order = result[0];

//             // Step 2: Check if the order is already approved or rejected
//             if (order.OrderStatus === "Approved") {
//                 return res.status(400).json({ message: "Order is already approved." });
//             }
//             if (order.OrderStatus === "Rejected") {
//                 return res.status(400).json({ message: "Order is rejected and cannot be approved." });
//             }

//             // Step 3: Update the order status to 'Approved' and set ApprovedBy and ApprovedAt
//             const approveOrderQuery = `
//                 UPDATE PartOrders
//                 SET OrderStatus = 'Approved', ApprovedBy = ?, ApprovedAt = NOW()
//                 WHERE OrderID = ?`;

//             db.query(approveOrderQuery, [cashierId, orderid], (err, result) => {
//                 if (err) {
//                     return res.status(500).json({ message: "Error approving the order", error: err });
//                 }

//                 // Step 4: Respond with success
//                 res.status(200).json({ message: "Order approved successfully" });
//             });
//         });
//     } catch (error) {
//         console.error("Error in approveorder route:", error);
//         res.status(500).json({ message: "Internal server error", error });
//     }
// });
router.put("/approveorder/:orderid", authenticateToken, authorizeRoles(["Cashier"]), async (req, res) => {
    const { orderid } = req.params;
    const cashierId = req.user.EmployeeID;  // Get the authenticated cashier's ID

    // Function to generate sequential LogIDs
    const generateLogID = () => {
        return new Promise((resolve, reject) => {
            const query = "SELECT LogID FROM PartInventoryLogs ORDER BY LogID DESC LIMIT 1";

            db.query(query, (err, result) => {
                if (err) {
                    reject("Error generating LogID: " + err);
                    return;
                }

                let newLogID;
                if (result.length > 0) {
                    const lastLogID = result[0].LogID;
                    const lastNumber = parseInt(lastLogID.split('-')[1], 10);
                    const newNumber = (lastNumber + 1).toString().padStart(4, '0');
                    newLogID = `LOG-${newNumber}`;
                } else {
                    newLogID = 'LOG-0001';
                }

                resolve(newLogID);
            });
        });
    };

    // Function to generate sequential FulfillmentIDs
    // Track the last used ID within the current transaction
    let lastFulfillmentID = 0;

    const generateFulfillmentID = () => {
        return new Promise((resolve, reject) => {
            const query = "SELECT FulfillmentID FROM FulfilledOrderItems ORDER BY FulfillmentID DESC LIMIT 1";

            db.query(query, (err, result) => {
                if (err) {
                    reject("Error generating FulfillmentID: " + err);
                    return;
                }

                let newFulfillmentID;
                if (result.length > 0) {
                    const lastLogID = result[0].FulfillmentID;
                    const lastNumber = parseInt(lastLogID.split('-')[1], 10);
                    const newNumber = (lastNumber + 1 + lastFulfillmentID).toString().padStart(4, '0');
                    newFulfillmentID = `FUL-${newNumber}`;
                } else {
                    newFulfillmentID = `FUL-${(1 + lastFulfillmentID).toString().padStart(4, '0')}`;
                }
                
                // Increment the counter for the next ID within this transaction
                lastFulfillmentID++;
                
                resolve(newFulfillmentID);
            });
        });
    };

    try {
        // Step 1: Check if the order exists
        const orderQuery = "SELECT * FROM PartOrders WHERE OrderID = ?";
        db.query(orderQuery, [orderid], (err, result) => {
            if (err) {
                return res.status(500).json({ message: "Error checking order", error: err });
            }

            if (result.length === 0) {
                return res.status(404).json({ message: "Order not found." });
            }

            const order = result[0];

            // Step 2: Check if the order is already approved, fulfilled, or rejected
            if (order.OrderStatus === "Approved") {
                return res.status(400).json({ message: "Order is already approved." });
            }
            if (order.OrderStatus === "Rejected") {
                return res.status(400).json({ message: "Order is rejected and cannot be approved." });
            }
            if (order.FulfillmentStatus === "Fulfilled") {
                return res.status(400).json({ message: "Order is already fulfilled." });
            }

            // Step 3: Get all parts in this order
            const orderPartsQuery = `
                SELECT op.*, p.Name as PartName 
                FROM Order_Parts op
                JOIN Parts p ON op.PartID = p.PartID
                WHERE op.OrderID = ?`;

            db.query(orderPartsQuery, [orderid], (err, orderParts) => {
                if (err) {
                    return res.status(500).json({ message: "Error fetching order parts", error: err });
                }

                if (orderParts.length === 0) {
                    return res.status(400).json({ message: "No parts found in this order." });
                }

                // Step 4: Check availability for all parts using FIFO
                // We'll use a transaction to ensure all operations are atomic
                db.beginTransaction(err => {
                    if (err) {
                        return res.status(500).json({ message: "Error starting transaction", error: err });
                    }

                    // Track parts with insufficient stock
                    const insufficientParts = [];
                    // Track fulfilled parts for logging
                    const fulfilledParts = [];
                    // Track generated fulfillment IDs
                    const fulfillmentIDs = [];
                    // Track parts to update main stock
                    const partsToUpdate = {};
                    
                    // Process each part in the order
                    const processNextPart = (index) => {
                        if (index >= orderParts.length) {
                            // All parts processed, check if any had insufficient stock
                            if (insufficientParts.length > 0) {
                                // Some parts have insufficient stock, rollback and return error
                                db.rollback(() => {
                                    return res.status(400).json({ 
                                        message: "Insufficient stock for some parts", 
                                        insufficientParts 
                                    });
                                });
                                return;
                            }

                            // All parts have sufficient stock, update order status
                            const updateOrderQuery = `
                                UPDATE PartOrders
                                SET OrderStatus = 'Approved', 
                                    ApprovedBy = ?, 
                                    ApprovedAt = NOW(),
                                    FulfillmentStatus = 'Fulfilled',
                                    FulfilledBy = ?,
                                    FulfilledAt = NOW(),
                                    Notes = CONCAT(IFNULL(Notes, ''), ' Fulfilled using FIFO method.')
                                WHERE OrderID = ?`;

                            db.query(updateOrderQuery, [cashierId, cashierId, orderid], (err, result) => {
                                if (err) {
                                    db.rollback(() => {
                                        return res.status(500).json({ message: "Error updating order status", error: err });
                                    });
                                    return;
                                }

                                // Generate fulfillment IDs for each fulfilled part
                                const generateAllFulfillmentIDs = async () => {
                                    try {
                                        for (let i = 0; i < fulfilledParts.length; i++) {
                                            const fulfillmentID = await generateFulfillmentID();
                                            fulfillmentIDs.push(fulfillmentID);
                                        }
                                        return true;
                                    } catch (error) {
                                        return false;
                                    }
                                };

                                generateAllFulfillmentIDs().then(success => {
                                    if (!success) {
                                        db.rollback(() => {
                                            return res.status(500).json({ message: "Error generating fulfillment IDs" });
                                        });
                                        return;
                                    }

                                    // Create FulfilledOrderItems entries
                                    const fulfillmentValues = fulfilledParts.map((part, index) => [
                                        fulfillmentIDs[index],
                                        orderid,
                                        part.ServiceRecordID,
                                        part.PartID,
                                        part.BatchID,
                                        part.RequestedQuantity,
                                        part.FulfilledQuantity,
                                        part.UnitPrice,
                                        new Date().toISOString().slice(0, 19).replace('T', ' '), // Current timestamp
                                        cashierId,
                                        `Fulfilled using FIFO from batch ${part.BatchID}`
                                    ]);

                                    const insertFulfillmentQuery = `
                                        INSERT INTO FulfilledOrderItems (
                                            FulfillmentID, OrderID, ServiceRecordID, PartID, BatchID,
                                            RequestedQuantity, FulfilledQuantity, UnitPrice, 
                                            FulfillmentDate, FulfilledBy, Notes
                                        )
                                        VALUES ?`;

                                    db.query(insertFulfillmentQuery, [fulfillmentValues], (err, result) => {
                                        if (err) {
                                            db.rollback(() => {
                                                return res.status(500).json({ message: "Error recording fulfillment", error: err });
                                            });
                                            return;
                                        }

                                        // Update main Parts table stock
                                        const updatePartsPromises = Object.keys(partsToUpdate).map(partId => {
                                            return new Promise((resolve, reject) => {
                                                const updatePartQuery = `
                                                    UPDATE Parts 
                                                    SET Stock = Stock - ? 
                                                    WHERE PartID = ?`;
                                                
                                                db.query(updatePartQuery, [partsToUpdate[partId], partId], (err, result) => {
                                                    if (err) {
                                                        reject(err);
                                                    } else {
                                                        resolve(result);
                                                    }
                                                });
                                            });
                                        });

                                        Promise.all(updatePartsPromises)
                                            .then(() => {
                                                // Commit the transaction
                                                db.commit(err => {
                                                    if (err) {
                                                        db.rollback(() => {
                                                            return res.status(500).json({ message: "Error committing transaction", error: err });
                                                        });
                                                        return;
                                                    }

                                                    // Success response
                                                    res.status(200).json({ 
                                                        message: "Order approved and fulfilled successfully using FIFO method",
                                                        fulfilledParts: fulfilledParts
                                                    });
                                                });
                                            })
                                            .catch(err => {
                                                db.rollback(() => {
                                                    return res.status(500).json({ message: "Error updating Parts stock", error: err });
                                                });
                                            });
                                    });
                                });
                            });
                            return;
                        }

                        const part = orderParts[index];
                        const requiredQuantity = part.Quantity;

                        // Get available batches for this part using FIFO (oldest first)
                        const batchesQuery = `
                            SELECT BatchID, PartID, BatchNumber, RemainingQuantity, CostPrice, RetailPrice, 
                                   ReceiptDate, ManufacturingDate, ExpiryDate
                            FROM StockBatches
                            WHERE PartID = ? AND RemainingQuantity > 0
                            ORDER BY ReceiptDate ASC, BatchID ASC`; // FIFO order - oldest first

                        db.query(batchesQuery, [part.PartID], (err, batches) => {
                            if (err) {
                                db.rollback(() => {
                                    return res.status(500).json({ message: "Error checking part batches", error: err });
                                });
                                return;
                            }

                            // Calculate total available quantity across all batches
                            const totalAvailable = batches.reduce((sum, batch) => sum + batch.RemainingQuantity, 0);

                            if (totalAvailable < requiredQuantity) {
                                // Insufficient stock for this part
                                insufficientParts.push({
                                    PartID: part.PartID,
                                    PartName: part.PartName,
                                    Required: requiredQuantity,
                                    Available: totalAvailable
                                });
                                processNextPart(index + 1);
                                return;
                            }

                            // We have enough stock, allocate from batches using FIFO
                            let remainingToFulfill = requiredQuantity;
                            const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
                            
                            // Process each batch until the required quantity is fulfilled
                            const processBatches = (batchIndex) => {
                                if (batchIndex >= batches.length || remainingToFulfill <= 0) {
                                    // Move to the next part
                                    processNextPart(index + 1);
                                    return;
                                }

                                const batch = batches[batchIndex];
                                const quantityFromBatch = Math.min(batch.RemainingQuantity, remainingToFulfill);
                                
                                // Update the batch's remaining quantity
                                const updateBatchQuery = `
                                    UPDATE StockBatches
                                    SET RemainingQuantity = RemainingQuantity - ?
                                    WHERE BatchID = ?`;

                                db.query(updateBatchQuery, [quantityFromBatch, batch.BatchID], (err, result) => {
                                    if (err) {
                                        db.rollback(() => {
                                            return res.status(500).json({ message: "Error updating batch quantity", error: err });
                                        });
                                        return;
                                    }

                                    // Track parts to update in main Parts table
                                    if (partsToUpdate[part.PartID]) {
                                        partsToUpdate[part.PartID] += quantityFromBatch;
                                    } else {
                                        partsToUpdate[part.PartID] = quantityFromBatch;
                                    }

                                    // Generate LogID using the sequential method
                                    generateLogID().then(logID => {
                                        // Log the inventory movement
                                        const logQuery = `
                                            INSERT INTO PartInventoryLogs (
                                                LogID, PartID, StockItemID, BatchNumber, TransactionType,
                                                Quantity, RemainingQuantity, UnitPrice, TransactionDate,
                                                OrderID, JobCardID, EmployeeID, Notes
                                            )
                                            VALUES (?, ?, ?, ?, 'Issue', ?, ?, ?, ?, ?, ?, ?, ?)`;

                                        db.query(logQuery, [
                                            logID,
                                            part.PartID,
                                            null, // StockItemID not relevant for issue
                                            batch.BatchNumber,
                                            quantityFromBatch,
                                            batch.RemainingQuantity - quantityFromBatch,
                                            batch.RetailPrice,
                                            currentDate,
                                            orderid,
                                            order.JobCardID,
                                            cashierId,
                                            `Issued for order ${orderid} using FIFO method`
                                        ], (err, result) => {
                                            if (err) {
                                                db.rollback(() => {
                                                    return res.status(500).json({ message: "Error logging inventory movement", error: err });
                                                });
                                                return;
                                            }

                                            // Add to fulfilled parts for later recording
                                            fulfilledParts.push({
                                                PartID: part.PartID,
                                                ServiceRecordID: part.ServiceRecordID,
                                                BatchID: batch.BatchID,
                                                BatchNumber: batch.BatchNumber,
                                                RequestedQuantity: requiredQuantity,
                                                FulfilledQuantity: quantityFromBatch,
                                                UnitPrice: batch.RetailPrice,
                                                ReceiptDate: batch.ReceiptDate
                                            });

                                            // Update remaining quantity to fulfill
                                            remainingToFulfill -= quantityFromBatch;
                                            
                                            // Process next batch if needed
                                            processBatches(batchIndex + 1);
                                        });
                                    }).catch(error => {
                                        db.rollback(() => {
                                            return res.status(500).json({ message: "Error generating LogID", error });
                                        });
                                    });
                                });
                            };

                            // Start processing batches
                            processBatches(0);
                        });
                    };

                    // Start processing the first part
                    processNextPart(0);
                });
            });
        });
    } catch (error) {
        console.error("Error in approveorder route:", error);
        res.status(500).json({ message: "Internal server error", error });
    }
});



router.put("/rejectorder/:orderid", authenticateToken, authorizeRoles(["Cashier"]), async (req, res) => {
    const { orderid } = req.params;
    const cashierId = req.user.EmployeeID;  // Get the authenticated cashier's ID

    try {
        // Step 1: Check if the order exists
        const orderQuery = "SELECT * FROM PartOrders WHERE OrderID = ?";
        db.query(orderQuery, [orderid], (err, result) => {
            if (err) {
                return res.status(500).json({ message: "Error checking order", error: err });
            }

            if (result.length === 0) {
                return res.status(404).json({ message: "Order not found." });
            }

            const order = result[0];

            // Step 2: Check if the order is already approved or rejected
            if (order.OrderStatus === "Rejected") {
                return res.status(400).json({ message: "Order is already rejected." });
            }
            if (order.OrderStatus === "Approved") {
                return res.status(400).json({ message: "Approved orders cannot be rejected." });
            }

            // Step 3: Update the order status to 'Rejected' and set RejectedBy and RejectedAt
            const rejectOrderQuery = `
                UPDATE PartOrders
                SET OrderStatus = 'Rejected', ApprovedBy = ?, ApprovedAt = NOW()
                WHERE OrderID = ?`;

            db.query(rejectOrderQuery, [cashierId, orderid], (err, result) => {
                if (err) {
                    return res.status(500).json({ message: "Error rejecting the order", error: err });
                }

                // Step 4: Respond with success
                res.status(200).json({ message: "Order rejected successfully" });
            });
        });
    } catch (error) {
        console.error("Error in rejectorder route:", error);
        res.status(500).json({ message: "Internal server error", error });
    }
});
 

router.get("/getorders-notapproved", authenticateToken, authorizeRoles(["Cashier"]), async (req, res) => {
    try {
        const query = `
            SELECT 
                o.OrderID, o.OrderStatus, o.RequestedBy, o.RequestedAt,
                sr.ServiceRecord_ID, sr.ServiceType,
                p.PartID, p.Quantity,
                pt.Name AS PartName
            FROM PartOrders o
            LEFT JOIN Order_ServiceRecords osr ON o.OrderID = osr.OrderID
            LEFT JOIN ServiceRecords sr ON osr.ServiceRecordID = sr.ServiceRecord_ID
            LEFT JOIN Order_Parts p ON o.OrderID = p.OrderID AND sr.ServiceRecord_ID = p.ServiceRecordID
            LEFT JOIN Parts pt ON p.PartID = pt.PartID
            WHERE o.OrderStatus = 'Sent'
            ORDER BY o.OrderID, sr.ServiceRecord_ID, p.PartID
        `;

        db.query(query, (err, results) => {
            if (err) {
                return res.status(500).json({ message: "Error fetching orders", error: err });
            }

            if (results.length === 0) {
                return res.status(404).json({ message: "No orders found with 'Sent' status." });
            }

            const ordersMap = {};

            results.forEach(row => {
                if (!ordersMap[row.OrderID]) {
                    ordersMap[row.OrderID] = {
                        OrderID: row.OrderID,
                        OrderStatus: row.OrderStatus,
                        RequestedBy: row.RequestedBy,
                        RequestedAt: row.RequestedAt,
                        Services: {}
                    };
                }

                if (row.ServiceRecord_ID && !ordersMap[row.OrderID].Services[row.ServiceRecord_ID]) {
                    ordersMap[row.OrderID].Services[row.ServiceRecord_ID] = {
                        ServiceRecordID: row.ServiceRecord_ID,
                        ServiceType: row.ServiceType,
                        Parts: []
                    };
                }

                if (row.PartID) {
                    ordersMap[row.OrderID].Services[row.ServiceRecord_ID].Parts.push({
                        PartID: row.PartID,
                        PartName: row.PartName, // now correctly coming from "pt.Name AS PartName"
                        Quantity: row.Quantity
                    });
                }
            });

            const nestedOrders = Object.values(ordersMap).map(order => ({
                ...order,
                Services: Object.values(order.Services)
            }));

            res.status(200).json({
                message: "Orders fetched successfully",
                orders: nestedOrders
            });
        });
    } catch (error) {
        console.error("Error in getorders-notapproved route:", error);
        res.status(500).json({ message: "Internal server error", error });
    }
});


router.get("/getorders", authenticateToken, authorizeRoles(["Admin","Cashier"]), async (req, res) => {
    try {
        // Step 1: Log the request to see if it reaches the endpoint
        console.log("Fetching all orders...");

        // Retrieve all orders (no filter on status)
        const getOrdersQuery = "SELECT * FROM PartOrders";

        db.query(getOrdersQuery, (err, result) => {
            // Step 2: If there's a database error, log it and respond with a 500 error
            if (err) {
                console.error("Database query error:", err);
                return res.status(500).json({ message: "Error fetching orders", error: err });
            }

            // Step 3: If no orders found, log it and respond with a 404 error
            if (result.length === 0) {
                console.log("No orders found.");
                return res.status(404).json({ message: "No orders found." });
            }

            // Step 4: If orders are found, log the result and send back the response
            console.log(`Fetched ${result.length} orders successfully.`);
            res.status(200).json({
                message: "Orders fetched successfully",
                orders: result
            });
        });
    } catch (error) {
        // Step 5: Catch any unexpected errors and log them
        console.error("Error in getorders route:", error);
        res.status(500).json({ message: "Internal server error", error });
    }
});


router.get("/notapproved-orders", authenticateToken, authorizeRoles(["Admin", "Cashier"]), async (req, res) => {
    try {
        console.log("Fetching not-approved part orders...");

        const getOrdersQuery = `
            SELECT 
                po.OrderID,
                po.JobCardID,
                po.RequestedBy,
                po.RequestedAt,
                po.OrderStatus,
                op.ServiceRecordID,
                op.PartID,
                p.Name AS PartName,
                op.Quantity
            FROM 
                PartOrders po
            JOIN 
                Order_Parts op ON po.OrderID = op.OrderID
            JOIN 
                Parts p ON op.PartID = p.PartID
            WHERE 
                po.OrderStatus = 'Sent'
            ORDER BY 
                po.OrderID
        `;

        db.query(getOrdersQuery, (err, results) => {
            if (err) {
                console.error("Database query error:", err);
                return res.status(500).json({ message: "Error fetching orders", error: err });
            }

            if (results.length === 0) {
                console.log("No not-approved orders found.");
                return res.status(404).json({ message: "No orders found." });
            }

            // Grouping logic
            const groupedOrders = {};
            results.forEach(row => {
                if (!groupedOrders[row.OrderID]) {
                    groupedOrders[row.OrderID] = {
                        OrderID: row.OrderID,
                        JobCardID: row.JobCardID,
                        RequestedBy: row.RequestedBy,
                        RequestedAt: row.RequestedAt,
                        OrderStatus: row.OrderStatus,
                        Parts: []
                    };
                }

                groupedOrders[row.OrderID].Parts.push({
                    ServiceRecordID: row.ServiceRecordID,
                    PartID: row.PartID,
                    PartName: row.PartName,
                    Quantity: row.Quantity
                });
            });

            res.status(200).json({
                message: "Orders fetched successfully",
                orders: Object.values(groupedOrders)
            });
        });
    } catch (error) {
        console.error("Error in getorders route:", error);
        res.status(500).json({ message: "Internal server error", error });
    }
});



router.post("/addpart", authenticateToken, authorizeRoles(["Admin","Cashier"]), async (req, res) => {
    try {
        const { Name, Description } = req.body;

        if (!Name) {
            return res.status(400).json({ message: "Part name is required" });
        }

        const PartID = await generatePartId();
        const defaultQuantity = 0;

        const query = `INSERT INTO Parts (PartID, Name, Description, Stock) VALUES (?, ?, ?, ?)`;

        db.query(query, [PartID, Name, Description || null, defaultQuantity], (err, result) => {
            if (err) {
                return res.status(500).json({ message: "Error adding part", error: err });
            }

            res.status(201).json({ message: "Part added successfully", PartID });
        });
    } catch (error) {
        console.error("Error in addpart route:", error);
        res.status(500).json({ message: "Internal server error", error });
    }
});



router.get("/getparts", authenticateToken, authorizeRoles(["Admin","Cashier","Mechanic"]), async (req, res) => {
    const query = "SELECT * FROM Parts";

    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ message: "Error retrieving parts", error: err });

        res.status(200).json({ message: "Parts fetched successfully", parts: results });
    });
});

router.get("/getpart/:id", authenticateToken, authorizeRoles(["Admin","Cashier","Mechanic"]), async (req, res) => {
    const partID = req.params.id;
    const query = "SELECT * FROM Parts WHERE PartID = ?";

    db.query(query, [partID], (err, results) => {
        if (err) return res.status(500).json({ message: "Error fetching part", error: err });

        if (results.length === 0) {
            return res.status(404).json({ message: "Part not found" });
        }

        res.status(200).json({ part: results[0] });
    });
});

router.put("/updatepart/:id", authenticateToken, authorizeRoles(["Admin","Cashier"]), async (req, res) => {
    const partID = req.params.id;
    const { Name, Description, Quantity } = req.body;

    const query = `
        UPDATE Parts
        SET Name = ?, Description = ?, Stock = ?
        WHERE PartID = ?
    `;

    db.query(query, [Name, Description, Quantity, partID], (err, result) => {
        if (err) return res.status(500).json({ message: "Error updating part", error: err });

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Part not found" });
        }

        res.status(200).json({ message: "Part updated successfully" });
    });
});

router.delete("/deletepart/:id", authenticateToken, authorizeRoles(["Admin","Cashier"]), async (req, res) => {
    const partID = req.params.id;

    const query = "DELETE FROM Parts WHERE PartID = ?";

    db.query(query, [partID], (err, result) => {
        if (err) return res.status(500).json({ message: "Error deleting part", error: err });

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Part not found" });
        }

        res.status(200).json({ message: "Part deleted successfully" });
    });
});

router.post('/stocks/add', authenticateToken, authorizeRoles(["Admin", "Cashier"]), async (req, res) => {
    try {
        const { SupplierID } = req.body;

        if (!SupplierID) {
            return res.status(400).json({ message: "SupplierID is required" });
        }

        // Generate StockID
        const StockID = await generateStockID();

        // Add Stock Record to Stock Table
        const query = `INSERT INTO Stock (StockID, SupplierID, Date) VALUES (?, ?, ?)`;
        const todayDate = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD

        db.query(query, [StockID, SupplierID, todayDate], (err, result) => {
            if (err) {
                console.error("Error adding stock:", err);
                return res.status(500).json({ message: "Error adding stock", error: err });
            }

            res.status(201).json({ message: "Stock added successfully", StockID });
        });
    } catch (error) {
        console.error("Error in add stock route:", error);
        res.status(500).json({ message: "Internal server error", error });
    }
});


router.get('/stocks', authenticateToken, authorizeRoles(["Admin", "Cashier"]), (req, res) => {
    const query = `
        SELECT s.StockID, s.Date, s.SupplierID, si.PartID, si.StockPrice, si.RetailPrice, si.Quantity
        FROM Stock s
        LEFT JOIN StockItems si ON s.StockID = si.StockID
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching stocks:", err);
            return res.status(500).json({ message: "Error fetching stocks", error: err });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: "No stocks found" });
        }

        // Grouping results by StockID
        const groupedStocks = results.reduce((acc, stock) => {
            const { StockID, Date, SupplierID, PartID, StockPrice, RetailPrice, Quantity } = stock;

            // Check if StockID is already added to the accumulator
            if (!acc[StockID]) {
                acc[StockID] = {
                    StockID,
                    Date,
                    SupplierID,
                    stockItems: []
                };
            }

            // Add stock item to stock items array for that particular StockID
            if (PartID) {
                acc[StockID].stockItems.push({
                    PartID,
                    StockPrice,
                    RetailPrice,
                    Quantity
                });
            }

            return acc;
        }, {});

        // Convert the groupedStocks object back to an array
        const formattedStocks = Object.values(groupedStocks);

        res.status(200).json({ message: "Stocks fetched successfully", stocks: formattedStocks });
    });
});




router.get('/stocks/:stockId', authenticateToken, authorizeRoles(["Admin", "Cashier"]), (req, res) => {
    const { stockId } = req.params;
    
    const query = `
        SELECT s.StockID, s.Date, s.SupplierID, si.PartID, si.StockPrice, si.RetailPrice, si.Quantity
        FROM Stock s
        LEFT JOIN StockItems si ON s.StockID = si.StockID
        WHERE s.StockID = ?
    `;

    db.query(query, [stockId], (err, results) => {
        if (err) {
            console.error("Error fetching stock:", err);
            return res.status(500).json({ message: "Error fetching stock", error: err });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: "Stock not found" });
        }

        // Grouping results for a specific stock
        const stock = {
            StockID: results[0].StockID,
            Date: results[0].Date,
            SupplierID: results[0].SupplierID,
            stockItems: []
        };

        results.forEach(result => {
            if (result.PartID) {
                stock.stockItems.push({
                    PartID: result.PartID,
                    StockPrice: result.StockPrice,
                    RetailPrice: result.RetailPrice,
                    Quantity: result.Quantity
                });
            }
        });

        res.status(200).json({ message: "Stock fetched successfully", stock });
    });
});

// Assuming you're using Express
// router.post('/stocks/:stockId/parts', authenticateToken, authorizeRoles(["Admin", "Cashier"]), async (req, res) => {
//     const { stockId } = req.params;
//     const { partId, StockPrice, RetailPrice, Quantity } = req.body;
    
//     // Input validation
//     if (!stockId || !partId || !StockPrice || !RetailPrice || !Quantity) {
//       return res.status(400).json({ 
//         success: false,
//         message: "Missing required fields", 
//         required: ['stockId', 'partId', 'StockPrice', 'RetailPrice', 'Quantity'] 
//       });
//     }
    
//     // Validate numeric inputs
//     if (isNaN(parseFloat(StockPrice)) || isNaN(parseFloat(RetailPrice)) || isNaN(parseInt(Quantity))) {
//       return res.status(400).json({ 
//         success: false,
//         message: "Price and quantity values must be numeric" 
//       });
//     }
  
//     // Ensure positive values
//     if (parseFloat(StockPrice) < 0 || parseFloat(RetailPrice) < 0 || parseInt(Quantity) <= 0) {
//       return res.status(400).json({ 
//         success: false,
//         message: "Price values cannot be negative and quantity must be positive" 
//       });
//     }
    
//     try {
//       // Use promises for better error handling with database queries
//       const checkStockExists = () => {
//         return new Promise((resolve, reject) => {
//           const stockCheckQuery = "SELECT * FROM Stock WHERE StockID = ?";
//           db.query(stockCheckQuery, [stockId], (err, stockResult) => {
//             if (err) {
//               reject({ status: 500, message: "Error checking StockID", error: err });
//               return;
//             }
            
//             if (stockResult.length === 0) {
//               reject({ status: 404, message: "StockID not found in Stock table" });
//               return;
//             }
            
//             resolve(true);
//           });
//         });
//       };
      
//       const checkPartExists = () => {
//         return new Promise((resolve, reject) => {
//           const partCheckQuery = "SELECT * FROM Parts WHERE PartID = ?";
//           db.query(partCheckQuery, [partId], (err, partResult) => {
//             if (err) {
//               reject({ status: 500, message: "Error checking PartID", error: err });
//               return;
//             }
            
//             if (partResult.length === 0) {
//               reject({ status: 404, message: "PartID not found in Parts table" });
//               return;
//             }
            
//             resolve(true);
//           });
//         });
//       };
      
//       const checkDuplicate = () => {
//         return new Promise((resolve, reject) => {
//           const duplicateCheckQuery = "SELECT * FROM StockItems WHERE StockID = ? AND PartID = ?";
//           db.query(duplicateCheckQuery, [stockId, partId], (err, result) => {
//             if (err) {
//               reject({ status: 500, message: "Error checking for duplicate entry", error: err });
//               return;
//             }
            
//             if (result.length > 0) {
//               reject({ status: 409, message: "This part already exists in this stock. Please update the existing entry instead." });
//               return;
//             }
            
//             resolve(true);
//           });
//         });
//       };
      
//       const insertStockItem = () => {
//         return new Promise((resolve, reject) => {
//           const insertStockItemQuery = `
//             INSERT INTO StockItems (StockID, PartID, StockPrice, RetailPrice, Quantity)
//             VALUES (?, ?, ?, ?, ?)
//           `;
          
//           db.query(insertStockItemQuery, [stockId, partId, StockPrice, RetailPrice, Quantity], (err, result) => {
//             if (err) {
//               reject({ status: 500, message: "Error inserting stock item", error: err });
//               return;
//             }
            
//             resolve(result);
//           });
//         });
//       };
      
//       const updatePartsStock = () => {
//         return new Promise((resolve, reject) => {
//           const updatePartsStockQuery = "UPDATE Parts SET Stock = Stock + ? WHERE PartID = ?";
//           db.query(updatePartsStockQuery, [Quantity, partId], (err, result) => {
//             if (err) {
//               reject({ status: 500, message: "Error updating Parts stock. Stock item was added but Parts stock was not updated.", error: err });
//               return;
//             }
            
//             resolve(result);
//           });
//         });
//       };
      
//       // Transaction-like operation sequence
//       try {
//         await checkStockExists();
//         await checkPartExists();
//         await checkDuplicate();
//         await insertStockItem();
//         await updatePartsStock();
        
//         res.status(201).json({ 
//           success: true,
//           message: "Stock item added successfully and Parts stock updated" 
//         });
//       } catch (dbError) {
//         console.error("Database operation error:", dbError);
//         return res.status(dbError.status || 500).json({ 
//           success: false,
//           message: dbError.message, 
//           ...(dbError.error && { error: dbError.error.message || String(dbError.error) }) 
//         });
//       }
//     } catch (error) {
//       console.error("Unhandled error in stock parts route:", error);
//       return res.status(500).json({ 
//         success: false,
//         message: "An unexpected error occurred", 
//         error: error.message || String(error) 
//       });
//     }
//   });

router.post('/stocks/:stockId/parts', authenticateToken, authorizeRoles(["Admin", "Cashier"]), async (req, res) => {
    const { stockId } = req.params;
    const { 
        partId, 
        StockPrice, 
        RetailPrice, 
        Quantity, 
        BatchNumber, 
        ManufacturingDate, 
        ExpiryDate,
        Notes 
    } = req.body;
    
    // Input validation
    if (!stockId || !partId || !StockPrice || !RetailPrice || !Quantity) {
      return res.status(400).json({ 
        success: false,
        message: "Missing required fields", 
        required: ['stockId', 'partId', 'StockPrice', 'RetailPrice', 'Quantity'] 
      });
    }
    
    // Validate numeric inputs
    if (isNaN(parseFloat(StockPrice)) || isNaN(parseFloat(RetailPrice)) || isNaN(parseInt(Quantity))) {
      return res.status(400).json({ 
        success: false,
        message: "Price and quantity values must be numeric" 
      });
    }
  
    // Ensure positive values
    if (parseFloat(StockPrice) < 0 || parseFloat(RetailPrice) < 0 || parseInt(Quantity) <= 0) {
      return res.status(400).json({ 
        success: false,
        message: "Price values cannot be negative and quantity must be positive" 
      });
    }
    
    try {
      // Use promises for better error handling with database queries
      const checkStockExists = () => {
        return new Promise((resolve, reject) => {
          const stockCheckQuery = "SELECT * FROM Stock WHERE StockID = ?";
          db.query(stockCheckQuery, [stockId], (err, stockResult) => {
            if (err) {
              reject({ status: 500, message: "Error checking StockID", error: err });
              return;
            }
            
            if (stockResult.length === 0) {
              reject({ status: 404, message: "StockID not found in Stock table" });
              return;
            }
            
            resolve(true);
          });
        });
      };
      
      const checkPartExists = () => {
        return new Promise((resolve, reject) => {
          const partCheckQuery = "SELECT * FROM Parts WHERE PartID = ?";
          db.query(partCheckQuery, [partId], (err, partResult) => {
            if (err) {
              reject({ status: 500, message: "Error checking PartID", error: err });
              return;
            }
            
            if (partResult.length === 0) {
              reject({ status: 404, message: "PartID not found in Parts table" });
              return;
            }
            
            resolve(true);
          });
        });
      };
      
      const checkDuplicate = () => {
        return new Promise((resolve, reject) => {
          const duplicateCheckQuery = "SELECT * FROM StockItems WHERE StockID = ? AND PartID = ?";
          db.query(duplicateCheckQuery, [stockId, partId], (err, result) => {
            if (err) {
              reject({ status: 500, message: "Error checking for duplicate entry", error: err });
              return;
            }
            
            if (result.length > 0) {
              reject({ status: 409, message: "This part already exists in this stock. Please update the existing entry instead." });
              return;
            }
            
            resolve(true);
          });
        });
      };
      
      // Generate a unique batch ID using your pattern
      const generateBatchID = () => {
        return new Promise((resolve, reject) => {
            // Query the StockBatches table to get the last BatchID
            const query = "SELECT BatchID FROM StockBatches ORDER BY BatchID DESC LIMIT 1";

            db.query(query, (err, result) => {
                if (err) {
                    reject("Error generating BatchID: " + err);
                    return;
                }

                let newBatchID;
                if (result.length > 0) {
                    // Extract the last BatchID, e.g., 'BAT-0003'
                    const lastBatchID = result[0].BatchID;
                    // Increment the numeric part of the BatchID
                    const lastNumber = parseInt(lastBatchID.split('-')[1], 10);
                    const newNumber = (lastNumber + 1).toString().padStart(4, '0'); // Ensure 4 digits
                    newBatchID = `BAT-${newNumber}`;
                } else {
                    // If no batch exists, start with 'BAT-0001'
                    newBatchID = 'BAT-0001';
                }

                resolve(newBatchID);
            });
        });
      };
      
      // Generate a unique log ID for inventory tracking
      const generateLogID = () => {
        return new Promise((resolve, reject) => {
            const query = "SELECT LogID FROM PartInventoryLogs ORDER BY LogID DESC LIMIT 1";

            db.query(query, (err, result) => {
                if (err) {
                    reject("Error generating LogID: " + err);
                    return;
                }

                let newLogID;
                if (result.length > 0) {
                    const lastLogID = result[0].LogID;
                    const lastNumber = parseInt(lastLogID.split('-')[1], 10);
                    const newNumber = (lastNumber + 1).toString().padStart(4, '0');
                    newLogID = `LOG-${newNumber}`;
                } else {
                    newLogID = 'LOG-0001';
                }

                resolve(newLogID);
            });
        });
      };
      
      // Insert into StockItems table
      const insertStockItem = () => {
        return new Promise((resolve, reject) => {
          const insertStockItemQuery = `
            INSERT INTO StockItems (
              StockID, 
              PartID, 
              StockPrice, 
              RetailPrice, 
              Quantity, 
              BatchNumber, 
              ManufacturingDate, 
              ExpiryDate, 
              RemainingQuantity,
              EntryDate
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
          `;
          
          db.query(insertStockItemQuery, [
            stockId, 
            partId, 
            StockPrice, 
            RetailPrice, 
            Quantity, 
            BatchNumber || null, 
            ManufacturingDate || null, 
            ExpiryDate || null, 
            Quantity
          ], (err, result) => {
            if (err) {
              reject({ status: 500, message: "Error inserting stock item", error: err });
              return;
            }
            
            resolve(result);
          });
        });
      };
      
      // Insert into StockBatches table for FIFO tracking
      const insertStockBatch = (batchId) => {
        return new Promise((resolve, reject) => {
          const insertBatchQuery = `
            INSERT INTO StockBatches (
              BatchID,
              StockID,
              PartID,
              BatchNumber,
              InitialQuantity,
              RemainingQuantity,
              CostPrice,
              RetailPrice,
              ManufacturingDate,
              ExpiryDate,
              ReceiptDate
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
          `;
          
          db.query(insertBatchQuery, [
            batchId,
            stockId,
            partId,
            BatchNumber || null,
            Quantity,
            Quantity,
            StockPrice,
            RetailPrice,
            ManufacturingDate || null,
            ExpiryDate || null
          ], (err, result) => {
            if (err) {
              reject({ status: 500, message: "Error inserting stock batch", error: err });
              return;
            }
            
            resolve(result);
          });
        });
      };
      
      // Log inventory transaction in PartInventoryLogs
      const logInventoryTransaction = (batchId, logId) => {
        return new Promise((resolve, reject) => {
          const logQuery = `
            INSERT INTO PartInventoryLogs (
              LogID,
              PartID,
              StockItemID,
              BatchNumber,
              TransactionType,
              Quantity,
              RemainingQuantity,
              UnitPrice,
              TransactionDate,
              EmployeeID,
              Notes
            )
            VALUES (?, ?, ?, ?, 'Purchase', ?, ?, ?, NOW(), ?, ?)
          `;
          
          db.query(logQuery, [
            logId,
            partId,
            stockId,
            BatchNumber || null,
            Quantity,
            Quantity,
            StockPrice,
            req.user.EmployeeID,
            Notes || `Initial stock entry for batch ${batchId}`
          ], (err, result) => {
            if (err) {
              reject({ status: 500, message: "Error logging inventory transaction", error: err });
              return;
            }
            
            resolve(result);
          });
        });
      };
      
      // Update Parts table stock count
      const updatePartsStock = () => {
        return new Promise((resolve, reject) => {
          const updatePartsStockQuery = "UPDATE Parts SET Stock = Stock + ? WHERE PartID = ?";
          db.query(updatePartsStockQuery, [Quantity, partId], (err, result) => {
            if (err) {
              reject({ status: 500, message: "Error updating Parts stock.", error: err });
              return;
            }
            
            resolve(result);
          });
        });
      };
      
      // Transaction-like operation sequence
      try {
        await checkStockExists();
        await checkPartExists();
        await checkDuplicate();
        
        // Generate IDs for new records
        const batchId = await generateBatchID();
        const logId = await generateLogID();
        
        // Insert into StockItems (original table)
        await insertStockItem();
        
        // Insert into StockBatches (new batch tracking table)
        await insertStockBatch(batchId);
        
        // Log the inventory transaction
        await logInventoryTransaction(batchId, logId);
        
        // Update the Parts table stock count
        await updatePartsStock();
        
        res.status(201).json({ 
          success: true,
          message: "Stock item added successfully with batch tracking",
          data: {
            stockId: stockId,
            partId: partId,
            batchId: batchId,
            quantity: Quantity,
            remainingQuantity: Quantity,
            batchNumber: BatchNumber || null,
            logId: logId
          }
        });
      } catch (dbError) {
        console.error("Database operation error:", dbError);
        return res.status(dbError.status || 500).json({ 
          success: false,
          message: dbError.message, 
          ...(dbError.error && { error: dbError.error.message || String(dbError.error) }) 
        });
      }
    } catch (error) {
      console.error("Unhandled error in stock parts route:", error);
      return res.status(500).json({ 
        success: false,
        message: "An unexpected error occurred", 
        error: error.message || String(error) 
      });
    }
});



//not tested
router.post('/services/add', authenticateToken, authorizeRoles(["Admin", "Cashier"]), async (req, res) => {
    const { ServiceName, Description, Price, TypeService, Duration } = req.body;

    if (!ServiceName || !Price || !TypeService || !Duration) {
        return res.status(400).json({ message: "All fields except Description are required" });
    }

    try {
        // Generate a unique ServiceID
        const serviceId = await generateServiceID();

        // Query to insert the new service
        const query = `INSERT INTO Services (ServiceID, ServiceName, Description, Price, TypeService, Duration) 
                       VALUES (?, ?, ?, ?, ?, ?)`;

        db.query(query, [serviceId, ServiceName, Description, Price, TypeService, Duration], (err, result) => {
            if (err) {
                console.error("Error adding service:", err);
                return res.status(500).json({ message: "Error adding service", error: err });
            }

            res.status(201).json({ message: "Service added successfully", serviceId });
        });
    } catch (error) {
        console.error("Error generating ServiceID:", error);
        return res.status(500).json({ message: "Internal server error", error });
    }
});

router.put('/services/:serviceId', authenticateToken, authorizeRoles(["Admin", "Cashier"]), (req, res) => {
    const { serviceId } = req.params;
    const { ServiceName, Description, Price, TypeService, Duration } = req.body;

    let updateQuery = "UPDATE Services SET ";
    let params = [];
    
    if (ServiceName) {
        updateQuery += "ServiceName = ?, ";
        params.push(ServiceName);
    }

    if (Description) {
        updateQuery += "Description = ?, ";
        params.push(Description);
    }

    if (Price) {
        updateQuery += "Price = ?, ";
        params.push(Price);
    }

    if (TypeService) {
        updateQuery += "TypeService = ?, ";
        params.push(TypeService);
    }

    if (Duration) {
        updateQuery += "Duration = ? ";
        params.push(Duration);
    }

    // Remove the trailing comma and add the WHERE clause
    updateQuery = updateQuery.trim().replace(/,$/, '') + " WHERE ServiceID = ?";
    params.push(serviceId);

    db.query(updateQuery, params, (err, result) => {
        if (err) {
            console.error("Error updating service:", err);
            return res.status(500).json({ message: "Error updating service", error: err });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Service not found" });
        }

        res.status(200).json({ message: "Service updated successfully" });
    });
});


router.get('/services', authenticateToken, authorizeRoles(["Admin", "Cashier","Service Advisor"]), (req, res) => {
    const query = "SELECT * FROM Services";

    db.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching services:", err);
            return res.status(500).json({ message: "Error fetching services", error: err });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: "No services found" });
        }

        res.status(200).json({ message: "Services fetched successfully", services: results });
    });
});

router.get('/services/:serviceId', authenticateToken, authorizeRoles(["Admin", "Cashier"]), (req, res) => {
    const { serviceId } = req.params;

    const query = "SELECT * FROM Services WHERE ServiceID = ?";

    db.query(query, [serviceId], (err, results) => {
        if (err) {
            console.error("Error fetching service:", err);
            return res.status(500).json({ message: "Error fetching service", error: err });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: "Service not found" });
        }

        res.status(200).json({ message: "Service fetched successfully", service: results[0] });
    });
});

router.delete('/services/:serviceId', authenticateToken, authorizeRoles(["Admin","Cashier"]), (req, res) => {
    const { serviceId } = req.params;

    const query = "DELETE FROM Services WHERE ServiceID = ?";

    db.query(query, [serviceId], (err, result) => {
        if (err) {
            console.error("Error deleting service:", err);
            return res.status(500).json({ message: "Error deleting service", error: err });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Service not found" });
        }

        res.status(200).json({ message: "Service deleted successfully" });
    });
}); 

router.put("/confirm-cash-payment/:InvoiceID", authenticateToken, authorizeRoles(['Cashier']), async (req, res) => {
  try {
    const { InvoiceID } = req.params;
    const cashierId = req.user.EmployeeID; // Get the cashier's ID from the token
    
    console.log(`Processing payment confirmation for Invoice: ${InvoiceID} by Cashier: ${cashierId}`);
    
    // First, check if the invoice exists and determine its type
    const checkInvoiceQuery = `
      SELECT Invoice_ID, JobCard_ID FROM Invoice WHERE Invoice_ID = ?
    `;
    
    db.query(checkInvoiceQuery, [InvoiceID], async (checkErr, checkResults) => {
      if (checkErr) {
        console.error("Database error checking invoice:", checkErr);
        return res.status(500).json({
          success: false,
          message: "Failed to check invoice details",
          error: checkErr.message
        });
      }
      
      if (checkResults.length === 0) {
        console.log(`Invoice not found: ${InvoiceID}`);
        return res.status(404).json({
          success: false,
          message: "Invoice not found"
        });
      }
      
      const invoiceRecord = checkResults[0];
      
      // Determine if this is a regular service invoice or breakdown service invoice
      if (invoiceRecord.JobCard_ID) {
        // This is a regular service invoice
        const getServiceInvoiceQuery = `
          SELECT i.*, jc.JobCardID, a.VehicleID, v.CustomerID, c.FirstName as CustomerName, c.FirebaseToken
          FROM Invoice i
          JOIN JobCards jc ON i.JobCard_ID = jc.JobCardID
          JOIN Appointments a ON jc.AppointmentID = a.AppointmentID
          JOIN Vehicles v ON a.VehicleID = v.VehicleNo
          JOIN Customers c ON v.CustomerID = c.CustomerID
          WHERE i.Invoice_ID = ?
        `;
        
        db.query(getServiceInvoiceQuery, [InvoiceID], async (err, invoiceResults) => {
          if (err) {
            console.error("Database error fetching invoice:", err);
            return res.status(500).json({
              success: false,
              message: "Failed to fetch invoice details",
              error: err.message
            });
          }
          
          if (invoiceResults.length === 0) {
            console.log(`Invoice not found: ${InvoiceID}`);
            return res.status(404).json({
              success: false,
              message: "Invoice not found"
            });
          }
          
          const invoiceDetails = invoiceResults[0];
          console.log("Invoice details retrieved:", {
            InvoiceID,
            CustomerID: invoiceDetails.CustomerID,
            CustomerName: invoiceDetails.CustomerName,
            HasFirebaseToken: !!invoiceDetails.FirebaseToken,
            Total: invoiceDetails.Total,
            JobCardID: invoiceDetails.JobCardID
          });
          
          // Check if invoice is already paid
          if (invoiceDetails.PaidStatus === 'Paid') {
            console.log(`Invoice ${InvoiceID} is already paid`);
            return res.status(400).json({
              success: false,
              message: "Invoice is already marked as paid"
            });
          }
          
          // Begin transaction to ensure both invoice and job card updates succeed or fail together
          db.beginTransaction(async (transactionErr) => {
            if (transactionErr) {
              console.error("Error starting transaction:", transactionErr);
              return res.status(500).json({
                success: false,
                message: "Failed to start transaction",
                error: transactionErr.message
              });
            }
            
            // Update the invoice status to "Paid" and set the payment method to "Cash"
            const updateInvoiceQuery = `
              UPDATE Invoice 
              SET PaymentMethod = 'Cash',
                  PaidStatus = 'Paid',
                  PaymentDate = CURRENT_TIMESTAMP,
                  GeneratedBy = ?
              WHERE Invoice_ID = ?
            `;
            
            db.query(updateInvoiceQuery, [cashierId, InvoiceID], (updateInvoiceErr, updateInvoiceResult) => {
              if (updateInvoiceErr) {
                return db.rollback(() => {
                  console.error("Database error updating invoice:", updateInvoiceErr);
                  res.status(500).json({
                    success: false,
                    message: "Failed to update invoice payment status",
                    error: updateInvoiceErr.message
                  });
                });
              }
              
              if (updateInvoiceResult.affectedRows === 0) {
                return db.rollback(() => {
                  console.log(`No rows affected when updating invoice ${InvoiceID}`);
                  res.status(404).json({
                    success: false,
                    message: "Invoice not found or already paid"
                  });
                });
              }
              
              console.log(`Successfully marked invoice ${InvoiceID} as paid`);
              
              // Update the job card status to "Paid"
              const updateJobCardQuery = `
                UPDATE JobCards 
                SET Status = 'Paid' 
                WHERE JobCardID = ?
              `;
              
              db.query(updateJobCardQuery, [invoiceDetails.JobCardID], (jobCardErr, jobCardResult) => {
                if (jobCardErr) {
                  return db.rollback(() => {
                    console.error("Failed to update job card:", jobCardErr);
                    res.status(500).json({
                      success: false,
                      message: "Failed to update job card status",
                      error: jobCardErr.message
                    });
                  });
                }
                
                console.log(`Successfully updated job card ${invoiceDetails.JobCardID} status to Paid`);
                
                // Prepare notification data
                const { CustomerID, CustomerName, FirebaseToken, Total, JobCardID, VehicleID } = invoiceDetails;
                
                // Ensure Total is treated as a number
                const totalAmount = typeof Total === 'number' ? Total : Number(Total || 0);
                
                const notificationTitle = 'Payment Confirmed';
                const notificationBody = `Dear ${CustomerName}, your payment of LKR ${totalAmount.toFixed(2)} for invoice #${InvoiceID} has been received. Thank you!`;
                
                console.log("Preparing notification with message:", notificationBody);
                let notificationSent = false;
                
                // Commit the transaction first to ensure payment is recorded
                db.commit(async (commitErr) => {
                  if (commitErr) {
                    return db.rollback(() => {
                      console.error("Error committing transaction:", commitErr);
                      res.status(500).json({
                        success: false,
                        message: "Failed to commit transaction",
                        error: commitErr.message
                      });
                    });
                  }
                  
                  // Send FCM notification if token exists
                  if (FirebaseToken) {
                    console.log(`Attempting to send FCM notification to token: ${FirebaseToken.substring(0, 10)}...`);
                    
                    const notificationMessage = {
                      notification: {
                        title: notificationTitle,
                        body: notificationBody,
                      },
                      data: {
                        invoiceID: InvoiceID,
                        type: 'payment_confirmation',
                        amount: totalAmount.toString(),
                        jobCardID: JobCardID || '',
                        vehicleID: VehicleID || ''
                      },
                      token: FirebaseToken,
                    };

                    try {
                      await messaging.send(notificationMessage);
                      console.log("FCM notification sent successfully for payment confirmation!");
                      notificationSent = true;
                    } catch (notificationError) {
                      console.error("Error sending FCM notification:", notificationError);
                      console.error("Error details:", notificationError.errorInfo || notificationError.message);
                    }
                  } else {
                    console.log("No Firebase token available for customer. Skipping FCM notification.");
                  }
                  
                  // Store notification in database regardless of FCM success
                  try {
                    console.log("Generating notification ID for database storage");
                    const notificationID = await generateNotificationId();
                    
                    const insertNotificationQuery = `
                      INSERT INTO notifications 
                      (notification_id, CustomerID, title, message, notification_type, icon_type, color_code, is_read, created_at, navigate_id)
                      VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, CURRENT_TIMESTAMP, ?)`;

                    console.log("Storing notification in database with ID:", notificationID);
                    
                    await new Promise((resolve, reject) => {
                      db.query(
                        insertNotificationQuery,
                        [
                          notificationID,
                          CustomerID,
                          notificationTitle,
                          notificationBody,
                          'Payment Confirmed',
                          'payment',
                          '#4CAF50', // Green color for success
                          InvoiceID // navigate_id (InvoiceID)
                        ],
                        (err, result) => {
                          if (err) {
                            console.error("Error storing payment notification in DB:", err);
                            return reject(err);
                          }
                          console.log("Notification stored successfully in database");
                          resolve(result);
                        }
                      );
                    });
                    
                    // Return success response with notification details
                    console.log("Sending success response to client");
                    return res.status(200).json({
                      success: true,
                      message: "Invoice and job card marked as paid successfully and notification sent",
                      invoiceId: InvoiceID,
                      jobCardId: JobCardID,
                      notificationSent,
                      notificationID
                    });
                    
                  } catch (dbNotificationErr) {
                    console.error("Failed to store payment notification in DB:", dbNotificationErr);
                    
                    // Still return success for the payment, even if notification storage failed
                    return res.status(200).json({
                      success: true,
                      message: "Invoice and job card marked as paid successfully but failed to store notification",
                      invoiceId: InvoiceID,
                      jobCardId: JobCardID,
                      notificationSent
                    });
                  }
                });
              });
            });
          });
        });
      } else {
        // This is a breakdown service invoice
        const getBreakdownInvoiceQuery = `
          SELECT i.*, br.RequestID, br.CustomerID, c.FirstName as CustomerName, c.FirebaseToken
          FROM Invoice i
          LEFT JOIN BreakdownRequests br ON i.Invoice_ID = br.InvoiceID
          LEFT JOIN Customers c ON br.CustomerID = c.CustomerID
          WHERE i.Invoice_ID = ?
        `;
        
        db.query(getBreakdownInvoiceQuery, [InvoiceID], async (err, invoiceResults) => {
          if (err) {
            console.error("Database error fetching breakdown invoice:", err);
            return res.status(500).json({
              success: false,
              message: "Failed to fetch breakdown invoice details",
              error: err.message
            });
          }
          
          if (invoiceResults.length === 0) {
            console.log(`Breakdown invoice not found: ${InvoiceID}`);
            return res.status(404).json({
              success: false,
              message: "Breakdown invoice not found"
            });
          }
          
          const invoiceDetails = invoiceResults[0];
          console.log("Breakdown invoice details retrieved:", {
            InvoiceID,
            CustomerID: invoiceDetails.CustomerID,
            CustomerName: invoiceDetails.CustomerName,
            HasFirebaseToken: !!invoiceDetails.FirebaseToken,
            Total: invoiceDetails.Total,
            RequestID: invoiceDetails.RequestID
          });
          
          // Check if invoice is already paid
          if (invoiceDetails.PaidStatus === 'Paid') {
            console.log(`Invoice ${InvoiceID} is already paid`);
            return res.status(400).json({
              success: false,
              message: "Invoice is already marked as paid"
            });
          }
          
          // Begin transaction
          db.beginTransaction(async (transactionErr) => {
            if (transactionErr) {
              console.error("Error starting transaction:", transactionErr);
              return res.status(500).json({
                success: false,
                message: "Failed to start transaction",
                error: transactionErr.message
              });
            }
            
            // Update the invoice status to "Paid" and set the payment method to "Cash"
            const updateInvoiceQuery = `
              UPDATE Invoice 
              SET PaymentMethod = 'Cash',
                  PaidStatus = 'Paid',
                  PaymentDate = CURRENT_TIMESTAMP,
                  GeneratedBy = ?
              WHERE Invoice_ID = ?
            `;
            
            db.query(updateInvoiceQuery, [cashierId, InvoiceID], (updateInvoiceErr, updateInvoiceResult) => {
              if (updateInvoiceErr) {
                return db.rollback(() => {
                  console.error("Database error updating invoice:", updateInvoiceErr);
                  res.status(500).json({
                    success: false,
                    message: "Failed to update invoice payment status",
                    error: updateInvoiceErr.message
                  });
                });
              }
              
              if (updateInvoiceResult.affectedRows === 0) {
                return db.rollback(() => {
                  console.log(`No rows affected when updating invoice ${InvoiceID}`);
                  res.status(404).json({
                    success: false,
                    message: "Invoice not found or already paid"
                  });
                });
              }
              
              console.log(`Successfully marked breakdown invoice ${InvoiceID} as paid`);
              
              // Update the breakdown request status if RequestID exists
              if (invoiceDetails.RequestID) {
                const updateBreakdownQuery = `
                  UPDATE BreakdownRequests 
                  SET Status = 'Paid' 
                  WHERE RequestID = ? AND InvoiceID = ?
                `;
                
                db.query(updateBreakdownQuery, [invoiceDetails.RequestID, InvoiceID], (breakdownErr, breakdownResult) => {
                  if (breakdownErr) {
                    return db.rollback(() => {
                      console.error("Failed to update breakdown request:", breakdownErr);
                      res.status(500).json({
                        success: false,
                        message: "Failed to update breakdown request status",
                        error: breakdownErr.message
                      });
                    });
                  }
                  
                  console.log(`Successfully updated breakdown request ${invoiceDetails.RequestID} status to Paid`);
                  
                  // Prepare notification data
                  const { CustomerID, CustomerName, FirebaseToken, Total, RequestID } = invoiceDetails;
                  
                  // Ensure Total is treated as a number
                  const totalAmount = typeof Total === 'number' ? Total : Number(Total || 0);
                  
                  const notificationTitle = 'Payment Confirmed';
                  const notificationBody = `Dear ${CustomerName}, your payment of LKR ${totalAmount.toFixed(2)} for breakdown service invoice #${InvoiceID} has been received. Thank you!`;
                  
                  console.log("Preparing notification with message:", notificationBody);
                  let notificationSent = false;
                  
                  // Commit the transaction
                  db.commit(async (commitErr) => {
                    if (commitErr) {
                      return db.rollback(() => {
                        console.error("Error committing transaction:", commitErr);
                        res.status(500).json({
                          success: false,
                          message: "Failed to commit transaction",
                          error: commitErr.message
                        });
                      });
                    }
                    
                    // Send FCM notification if token exists
                    if (FirebaseToken) {
                      console.log(`Attempting to send FCM notification to token: ${FirebaseToken.substring(0, 10)}...`);
                      
                      const notificationMessage = {
                        notification: {
                          title: notificationTitle,
                          body: notificationBody,
                        },
                        data: {
                          invoiceID: InvoiceID,
                          type: 'payment_confirmation',
                          amount: totalAmount.toString(),
                          requestID: RequestID || ''
                        },
                        token: FirebaseToken,
                      };

                      try {
                        await messaging.send(notificationMessage);
                        console.log("FCM notification sent successfully for payment confirmation!");
                        notificationSent = true;
                      } catch (notificationError) {
                        console.error("Error sending FCM notification:", notificationError);
                        console.error("Error details:", notificationError.errorInfo || notificationError.message);
                      }
                    } else {
                      console.log("No Firebase token available for customer. Skipping FCM notification.");
                    }
                    
                    // Store notification in database regardless of FCM success
                    try {
                      console.log("Generating notification ID for database storage");
                      const notificationID = await generateNotificationId();
                      
                      const insertNotificationQuery = `
                        INSERT INTO notifications 
                        (notification_id, CustomerID, title, message, notification_type, icon_type, color_code, is_read, created_at, navigate_id)
                        VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, CURRENT_TIMESTAMP, ?)`;

                      console.log("Storing notification in database with ID:", notificationID);
                      
                      await new Promise((resolve, reject) => {
                        db.query(
                          insertNotificationQuery,
                          [
                            notificationID,
                            CustomerID,
                            notificationTitle,
                            notificationBody,
                            'Payment Confirmed',
                            'payment',
                            '#4CAF50', // Green color for success
                            InvoiceID // navigate_id (InvoiceID)
                          ],
                          (err, result) => {
                            if (err) {
                              console.error("Error storing payment notification in DB:", err);
                              return reject(err);
                            }
                            console.log("Notification stored successfully in database");
                            resolve(result);
                          }
                        );
                      });
                      
                      // Return success response with notification details
                      console.log("Sending success response to client");
                      return res.status(200).json({
                        success: true,
                        message: "Breakdown invoice marked as paid successfully and notification sent",
                        invoiceId: InvoiceID,
                        requestId: RequestID,
                        notificationSent,
                        notificationID
                      });
                      
                    } catch (dbNotificationErr) {
                      console.error("Failed to store payment notification in DB:", dbNotificationErr);
                      
                      // Still return success for the payment, even if notification storage failed
                      return res.status(200).json({
                        success: true,
                        message: "Breakdown invoice marked as paid successfully but failed to store notification",
                        invoiceId: InvoiceID,
                        requestId: RequestID,
                        notificationSent
                      });
                    }
                  });
                });
              } else {
                // No RequestID associated with this invoice
                // Commit the transaction and return success
                db.commit(async (commitErr) => {
                  if (commitErr) {
                    return db.rollback(() => {
                      console.error("Error committing transaction:", commitErr);
                      res.status(500).json({
                        success: false,
                        message: "Failed to commit transaction",
                        error: commitErr.message
                      });
                    });
                  }
                  
                  console.log("Sending success response to client (no breakdown request to update)");
                  return res.status(200).json({
                    success: true,
                    message: "Invoice marked as paid successfully",
                    invoiceId: InvoiceID
                  });
                });
              }
            });
          });
        });
      }
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








router.post("/create-invoice/:JobCardID", authenticateToken, authorizeRoles(["Admin", "Cashier"]), async (req, res) => {
    try {
        const { JobCardID } = req.params;
        if (!JobCardID) {
            return res.status(400).json({ success: false, message: "JobCardID is required" });
        }

        // 1. Verify job card exists
        const jobCardQuery = "SELECT * FROM JobCards WHERE JobCardID = ?";
        const jobCardResult = await new Promise((resolve, reject) => {
            db.query(jobCardQuery, [JobCardID], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        if (jobCardResult.length === 0) {
            return res.status(404).json({ success: false, message: "Job card not found" });
        }

        // 2. Check if invoice already exists for this job card
        const existingInvoiceQuery = "SELECT * FROM Invoice WHERE JobCard_ID = ?";
        const existingInvoice = await new Promise((resolve, reject) => {
            db.query(existingInvoiceQuery, [JobCardID], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        if (existingInvoice.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: "Invoice already exists for this job card",
                invoiceId: existingInvoice[0].Invoice_ID
            });
        }

        // 3. Get all service records for this job card
        const serviceRecordsQuery = `
            SELECT sr.ServiceRecord_ID, sr.Description, sr.ServiceType, sr.Status
            FROM ServiceRecords sr WHERE sr.JobCardID = ?`;
        
        const serviceRecords = await new Promise((resolve, reject) => {
            db.query(serviceRecordsQuery, [JobCardID], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        // 4. For each service record, look up the price in the Services table
        let totalServiceCost = 0;
        const serviceLineItems = [];
        
        for (const record of serviceRecords) {
            const servicePriceQuery = `
                SELECT Price FROM Services WHERE ServiceName = ? OR Description = ? LIMIT 1`;
            
            const servicePriceResult = await new Promise((resolve, reject) => {
                db.query(servicePriceQuery, [record.Description, record.Description], (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                });
            });
            
            const price = servicePriceResult.length > 0 ? parseFloat(servicePriceResult[0].Price) : 0;
            totalServiceCost += price;
            
            serviceLineItems.push({
                serviceRecordId: record.ServiceRecord_ID,
                description: record.Description,
                serviceType: record.ServiceType,
                status: record.Status,
                price
            });
        }

        // 5. Get all issued parts for this job card from PartInventoryLogs
        const issuedPartsQuery = `
            SELECT p.PartID, p.Name as PartName, pl.BatchNumber, SUM(pl.Quantity) as TotalQuantity, pl.UnitPrice
            FROM PartInventoryLogs pl
            JOIN Parts p ON pl.PartID = p.PartID
            WHERE pl.JobCardID = ? AND pl.TransactionType = 'Issue'
            GROUP BY p.PartID, p.Name, pl.BatchNumber, pl.UnitPrice`;
        
        const issuedParts = await new Promise((resolve, reject) => {
            db.query(issuedPartsQuery, [JobCardID], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        // 6. Calculate parts cost
        let totalPartsCost = 0;
        const partLineItems = [];
        
        for (const part of issuedParts) {
            const partTotal = parseFloat(part.UnitPrice) * parseInt(part.TotalQuantity, 10);
            totalPartsCost += partTotal;
            
            partLineItems.push({
                partId: part.PartID,
                partName: part.PartName,
                batchNumber: part.BatchNumber,
                quantity: part.TotalQuantity,
                unitPrice: parseFloat(part.UnitPrice),
                total: partTotal
            });
        }

        // 7. Generate a unique invoice ID
        const invoiceID = await generateInvoiceID();

        // 8. Calculate total cost
        const subtotal = totalServiceCost + totalPartsCost;
        const taxRate = 0.15;
        // const taxAmount = subtotal * taxRate;
        const total = subtotal;

        // 9. Insert the invoice into the database
        const insertInvoiceQuery = `
            INSERT INTO Invoice (
                Invoice_ID, Total, Parts_Cost, JobCard_ID, Labour_Cost, 
                GeneratedBy, GeneratedDate, PaidStatus, Notes
            ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 'Pending', ?)`;
        
        await new Promise((resolve, reject) => {
            db.query(insertInvoiceQuery, [
                invoiceID, 
                total, 
                totalPartsCost, 
                JobCardID, 
                totalServiceCost, 
                req.user.employeeId, // Assuming the authenticated user's ID is stored in req.user.employeeId
                `Invoice generated for job card ${JobCardID}. Includes ${serviceRecords.length} services and ${issuedParts.length} parts.`
            ], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        // 10. Update the job card status to "Invoice Generated"
        const updateJobCardQuery = "UPDATE JobCards SET Status = 'Invoice Generated' WHERE JobCardID = ?";
        
        await new Promise((resolve, reject) => {
            db.query(updateJobCardQuery, [JobCardID], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        // 11. Build invoice object for response
        const invoice = {
            invoiceID,
            jobCardID: JobCardID,
            date: new Date().toISOString().split('T')[0],
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            services: serviceLineItems,
            parts: partLineItems,
            totalServiceCost,
            totalPartsCost,
            subtotal,
            total,
            status: "Pending",
            generatedBy: req.user.employeeId
        };

        return res.status(200).json({
            success: true,
            message: "Invoice created successfully and job card status updated",
            invoice
        });

    } catch (error) {
        console.error("Error creating invoice:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
});


router.get("/pending-invoices", authenticateToken, authorizeRoles(['Cashier']), async (req, res) => {
  try {
    // Query for regular service invoices
    const regularInvoicesQuery = `
      SELECT 
        i.Invoice_ID, 
        i.Total, 
        i.Parts_Cost, 
        i.Labour_Cost, 
        i.GeneratedDate,
        i.PaidStatus, 
        j.JobCardID, 
        a.AppointmentID, 
        v.VehicleNo, 
        v.Model,
        c.FirstName, 
        c.SecondName,
        c.CustomerID,
        c.Telephone,
        'service' as invoiceType
      FROM Invoice i
      INNER JOIN JobCards j ON i.JobCard_ID = j.JobCardID
      INNER JOIN Appointments a ON j.AppointmentID = a.AppointmentID
      INNER JOIN Vehicles v ON a.VehicleID = v.VehicleNo
      INNER JOIN Customers c ON a.CustomerID = c.CustomerID
      WHERE i.PaidStatus = 'Pending' AND i.PaymentMethod = 'Cash'
    `;
    
    // Query for breakdown service invoices
    const breakdownInvoicesQuery = `
      SELECT 
        i.Invoice_ID, 
        i.Total, 
        i.Parts_Cost, 
        i.Labour_Cost, 
        i.GeneratedDate,
        i.PaidStatus,
        NULL as JobCardID,
        NULL as AppointmentID,
        NULL as VehicleNo,
        NULL as Model,
        c.FirstName,
        c.SecondName,
        c.CustomerID,
        c.Telephone,
        br.RequestID,
        br.Description,
        'breakdown' as invoiceType
      FROM Invoice i
      INNER JOIN BreakdownRequests br ON br.InvoiceID = i.Invoice_ID
      INNER JOIN Customers c ON br.CustomerID = c.CustomerID
      WHERE i.PaidStatus = 'Pending' AND i.PaymentMethod = 'Cash'
    `;
    
    db.query(regularInvoicesQuery, [], (err1, regularResults) => {
      if (err1) {
        console.error("Database error for regular invoices:", err1);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch regular pending invoices",
          error: err1.message
        });
      }
      
      db.query(breakdownInvoicesQuery, [], (err2, breakdownResults) => {
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
        
        // Sort by generated date (newest first)
        allResults.sort((a, b) => new Date(b.GeneratedDate) - new Date(a.GeneratedDate));
        
        return res.status(200).json({
          success: true,
          message: allResults.length > 0 ? "Pending invoices retrieved successfully" : "No pending invoices found",
          count: allResults.length,
          data: allResults
        });
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
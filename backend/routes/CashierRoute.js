const express = require("express");
const bcrypt = require("bcryptjs"); // ✅ Import bcrypt
const db = require("../db");
const {generateEmployeeId}=require("../GenerateId")
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


router.put("/approveorder/:orderid", authenticateToken, authorizeRoles(["Cashier"]), async (req, res) => {
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
            if (order.OrderStatus === "Approved") {
                return res.status(400).json({ message: "Order is already approved." });
            }
            if (order.OrderStatus === "Rejected") {
                return res.status(400).json({ message: "Order is rejected and cannot be approved." });
            }

            // Step 3: Update the order status to 'Approved' and set ApprovedBy and ApprovedAt
            const approveOrderQuery = `
                UPDATE PartOrders
                SET OrderStatus = 'Approved', ApprovedBy = ?, ApprovedAt = NOW()
                WHERE OrderID = ?`;

            db.query(approveOrderQuery, [cashierId, orderid], (err, result) => {
                if (err) {
                    return res.status(500).json({ message: "Error approving the order", error: err });
                }

                // Step 4: Respond with success
                res.status(200).json({ message: "Order approved successfully" });
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
        // Step 1: Retrieve all orders where OrderStatus is 'Sent'
        const getOrdersQuery = "SELECT * FROM PartOrders WHERE OrderStatus = 'Sent'";

        db.query(getOrdersQuery, (err, result) => {
            if (err) {
                return res.status(500).json({ message: "Error fetching orders", error: err });
            }

            if (result.length === 0) {
                return res.status(404).json({ message: "No orders found with 'Sent' status." });
            }

            // Step 2: Respond with the fetched orders
            res.status(200).json({
                message: "Orders fetched successfully",
                orders: result
            });
        });
    } catch (error) {
        console.error("Error in getorders route:", error);
        res.status(500).json({ message: "Internal server error", error });
    }
});

router.get("/getorders", authenticateToken, authorizeRoles(["Cashier"]), async (req, res) => {
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


module.exports = router;
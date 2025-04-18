const express = require("express");
const bcrypt = require("bcryptjs"); // ✅ Import bcrypt
const db = require("../db");
const {generateEmployeeId,generatePartId,generateStockID,generateServiceID}=require("../GenerateId")
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



router.get("/getparts", authenticateToken, authorizeRoles(["Admin","Cashier"]), async (req, res) => {
    const query = "SELECT * FROM Parts";

    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ message: "Error retrieving parts", error: err });

        res.status(200).json({ message: "Parts fetched successfully", parts: results });
    });
});

router.get("/getpart/:id", authenticateToken, authorizeRoles(["Admin","Cashier"]), async (req, res) => {
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
router.post('/stocks/:stockId/parts', authenticateToken, authorizeRoles(["Admin", "Cashier"]), async (req, res) => {
    const { stockId } = req.params;
    const { partId, StockPrice, RetailPrice, Quantity } = req.body;
    
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
      
      const insertStockItem = () => {
        return new Promise((resolve, reject) => {
          const insertStockItemQuery = `
            INSERT INTO StockItems (StockID, PartID, StockPrice, RetailPrice, Quantity)
            VALUES (?, ?, ?, ?, ?)
          `;
          
          db.query(insertStockItemQuery, [stockId, partId, StockPrice, RetailPrice, Quantity], (err, result) => {
            if (err) {
              reject({ status: 500, message: "Error inserting stock item", error: err });
              return;
            }
            
            resolve(result);
          });
        });
      };
      
      const updatePartsStock = () => {
        return new Promise((resolve, reject) => {
          const updatePartsStockQuery = "UPDATE Parts SET Stock = Stock + ? WHERE PartID = ?";
          db.query(updatePartsStockQuery, [Quantity, partId], (err, result) => {
            if (err) {
              reject({ status: 500, message: "Error updating Parts stock. Stock item was added but Parts stock was not updated.", error: err });
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
        await insertStockItem();
        await updatePartsStock();
        
        res.status(201).json({ 
          success: true,
          message: "Stock item added successfully and Parts stock updated" 
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








module.exports = router;
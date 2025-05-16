const express = require("express");
const router = express.Router();
const {authenticateToken, authorizeRoles} = require("../utilities");
const db = require("../db"); // Reuse your existing DB connection
const {generateNotificationId} = require("../GenerateId");
const { messaging } = require("../firebaseConfig");

// Add connection checking function
function ensureConnection(callback) {
  if (db.state === 'disconnected') {
    console.log('MySQL connection lost. Reconnecting...');
    db.connect((err) => {
      if (err) {
        console.error('Error reconnecting to database:', err);
        return callback(err);
      }
      console.log('Reconnected to MySQL database');
      callback(null);
    });
  } else {
    callback(null);
  }
}

// Wrap db.query in a function that ensures connection
function executeQuery(query, params, callback) {
  ensureConnection((err) => {
    if (err) return callback(err);
    
    try {
      db.query(query, params, callback);
    } catch (error) {
      console.error("Query execution error:", error);
      callback(error);
    }
  });
}

// Get pending breakdown requests
router.get("/breakdown/pending", authenticateToken, authorizeRoles(['Driver']), async (req, res) => {
  try {
    const query = `
      SELECT 
        br.RequestID, 
        br.CustomerID,
        br.Description,
        br.ContactName,
        br.ContactPhone,
        br.Latitude,
        br.Longitude,
        br.Status,
        br.RequestTime,
        c.FirstName, 
        c.SecondName,
        c.Telephone as CustomerPhone
      FROM BreakdownRequests br
      JOIN Customers c ON br.CustomerID = c.CustomerID
      WHERE br.Status = 'Pending'
      ORDER BY br.RequestTime DESC
    `;
    
    executeQuery(query, [], (err, results) => {
      if (err) {
        console.error("Error fetching pending breakdown requests:", err);
        return res.status(500).json({ 
          success: false, 
          message: "Database error", 
          error: err.message 
        });
      }
      
      res.status(200).json({
        success: true,
        count: results.length,
        data: results
      });
    });
  } catch (error) {
    console.error("Error in pending breakdown requests API:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
});

// Get active breakdown requests (InProgress)
router.get("/breakdown/active", authenticateToken, authorizeRoles(['Driver']), async (req, res) => {
  try {
    console.log("Current driver ID:", req.user.employeeId);
    
    // Debug: Check all InProgress requests
    executeQuery("SELECT * FROM BreakdownRequests WHERE Status = 'InProgress'", [], (err, allResults) => {
      if (err) {
        console.error("Error checking all InProgress requests:", err);
      } else {
        console.log("All InProgress requests:", allResults);
      }
    });
    
    const query = `
      SELECT 
        br.RequestID, 
        br.CustomerID,
        br.Description,
        br.ContactName,
        br.ContactPhone,
        br.Latitude,
        br.Longitude,
        br.Status,
        br.RequestTime,
        br.AcceptedTime,
        c.FirstName, 
        c.SecondName,
        c.Telephone as CustomerPhone
      FROM BreakdownRequests br
      JOIN Customers c ON br.CustomerID = c.CustomerID
      WHERE br.Status = 'InProgress'
      ORDER BY br.RequestTime DESC
    `;
    
    const params = [];
    
    console.log("SQL Query:", query);
    console.log("Parameters:", params);
    
    executeQuery(query, params, (err, results) => {
      if (err) {
        console.error("Error fetching active breakdown requests:", err);
        return res.status(500).json({ 
          success: false, 
          message: "Database error", 
          error: err.message 
        });
      }
      
      console.log("Query results:", results);
      
      res.status(200).json({
        success: true,
        count: results.length,
        data: results
      });
    });
  } catch (error) {
    console.error("Error in active breakdown requests API:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
});

// Get completed breakdown requests
router.get("/breakdown/completed", authenticateToken, authorizeRoles(['Driver']), async (req, res) => {
  try {
    const query = `
      SELECT 
        br.RequestID, 
        br.CustomerID,
        br.Description,
        br.ContactName,
        br.ContactPhone,
        br.Latitude,
        br.Longitude,
        br.Status,
        br.RequestTime,
        br.CompletedTime,
        c.FirstName, 
        c.SecondName,
        c.Telephone as CustomerPhone
      FROM BreakdownRequests br
      JOIN Customers c ON br.CustomerID = c.CustomerID
      WHERE br.Status = 'Completed'
      ORDER BY br.CompletedTime DESC
    `;
    
    executeQuery(query, [], (err, results) => {
      if (err) {
        console.error("Error fetching completed breakdown requests:", err);
        return res.status(500).json({ 
          success: false, 
          message: "Database error", 
          error: err.message 
        });
      }
      
      res.status(200).json({
        success: true,
        count: results.length,
        data: results
      });
    });
  } catch (error) {
    console.error("Error in completed breakdown requests API:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
});

// Accept a breakdown request
router.put("/breakdown/accept/:requestId", authenticateToken, authorizeRoles(['Driver']), async (req, res) => {
  try {
    const { requestId } = req.params;
    const driverId = req.user.employeeId; // From auth token
    
    // Check if DriverID column exists
    const checkColumnQuery = `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'BreakdownRequests' 
      AND COLUMN_NAME = 'DriverID'
    `;
    
    executeQuery(checkColumnQuery, [], (columnErr, columnResults) => {
      if (columnErr) {
        console.error("Error checking for DriverID column:", columnErr);
        return res.status(500).json({ 
          success: false, 
          message: "Database error", 
          error: columnErr.message 
        });
      }
      
      // If DriverID column doesn't exist, suggest adding it
      if (columnResults.length === 0) {
        return res.status(500).json({
          success: false,
          message: "Database schema issue: DriverID column doesn't exist in BreakdownRequests table",
          solution: "Run this SQL: ALTER TABLE BreakdownRequests ADD COLUMN DriverID VARCHAR(10), ADD COLUMN AcceptedTime TIMESTAMP;"
        });
      }
      
      // Check if request exists and is in a valid state
      const checkQuery = "SELECT Status, CustomerID FROM BreakdownRequests WHERE RequestID = ?";
      
      executeQuery(checkQuery, [requestId], (err, results) => {
        if (err) {
          console.error("Error checking breakdown request:", err);
          return res.status(500).json({ 
            success: false, 
            message: "Database error", 
            error: err.message 
          });
        }
        
        if (results.length === 0) {
          return res.status(404).json({
            success: false,
            message: "Breakdown request not found"
          });
        }
        
        if (results[0].Status !== 'Pending') {
          return res.status(400).json({
            success: false,
            message: `Request is already ${results[0].Status}`
          });
        }
        
        const customerId = results[0].CustomerID;
        
        // Update the request status to InProgress and assign driver
        const updateQuery = `
          UPDATE BreakdownRequests 
          SET Status = 'InProgress', DriverID = ?, AcceptedTime = CURRENT_TIMESTAMP
          WHERE RequestID = ?
        `;
        
        executeQuery(updateQuery, [driverId, requestId], (err, result) => {
          if (err) {
            console.error("Error accepting breakdown request:", err);
            return res.status(500).json({ 
              success: false, 
              message: "Failed to accept breakdown request", 
              error: err.message 
            });
          }
          
          // Send notification to customer if possible
          try {
            // Get customer's FCM token
            const tokenQuery = "SELECT FirebaseToken FROM Customers WHERE CustomerID = ?";
            executeQuery(tokenQuery, [customerId], async (err, tokenResults) => {
              if (!err && tokenResults.length > 0 && tokenResults[0].FirebaseToken) {
                const token = tokenResults[0].FirebaseToken;
                
                // Create notification in database if notifications table exists
                // Create notification in database if notifications table exists
try {
  const notificationId = await generateNotificationId();
  const notifQuery = `
    INSERT INTO notifications 
    (notification_id, CustomerID, title, message, notification_type, icon_type, color_code, is_read, created_at, navigate_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
  `;
  
  executeQuery(notifQuery, [
    notificationId,
    customerId,
    'Breakdown Service Update',
    'A driver is on the way to your location',
    'BreakdownService',
    'car',
    '#4CAF50',
    0,
    requestId
  ], (notifErr) => {
    if (notifErr) {
      console.error("Error creating notification in database:", notifErr);
    }
  });
} catch (notifDbErr) {
  console.error("Error creating notification in database:", notifDbErr);
}

                
                // Send FCM notification
                try {
                  await messaging.send({
                    token: token,
                    notification: {
                      title: 'Breakdown Service Update',
                      body: 'A driver is on the way to your location'
                    },
                    data: {
                      type: 'breakdown_service',
                      requestId: requestId
                    }
                  });
                } catch (fcmErr) {
                  console.error("Error sending FCM notification:", fcmErr);
                }
              }
            });
          } catch (notifError) {
            console.error("Error in notification process:", notifError);
            // Continue with response even if notification fails
          }
          
          res.status(200).json({
            success: true,
            message: "Breakdown request accepted",
            requestId: requestId,
            acceptedAt: new Date()
          });
        });
      });
    });
  } catch (error) {
    console.error("Error in accept breakdown request API:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
});

// Complete a breakdown request
router.put("/breakdown/complete/:requestId", authenticateToken, authorizeRoles(['Driver']), async (req, res) => {
  try {
    const { requestId } = req.params;
    
    // Check if request exists and is in a valid state
    const checkQuery = "SELECT Status FROM BreakdownRequests WHERE RequestID = ?";
    
    executeQuery(checkQuery, [requestId], (err, results) => {
      if (err) {
        console.error("Error checking breakdown request:", err);
        return res.status(500).json({ 
          success: false, 
          message: "Database error", 
          error: err.message 
        });
      }
      
      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Breakdown request not found"
        });
      }
      
      if (results[0].Status === 'Completed' || results[0].Status === 'Cancelled') {
        return res.status(400).json({
          success: false,
          message: `Request is already ${results[0].Status}`
        });
      }
      
      // Update the request status to completed
      const updateQuery = `
        UPDATE BreakdownRequests 
        SET Status = 'Completed', CompletedTime = CURRENT_TIMESTAMP
        WHERE RequestID = ?
      `;
      
      executeQuery(updateQuery, [requestId], (err, result) => {
        if (err) {
          console.error("Error completing breakdown request:", err);
          return res.status(500).json({ 
            success: false, 
            message: "Failed to complete breakdown request", 
            error: err.message 
          });
        }
        
        res.status(200).json({
          success: true,
          message: "Breakdown request marked as completed",
          requestId: requestId,
          completedAt: new Date()
        });
      });
    });
  } catch (error) {
    console.error("Error in complete breakdown request API:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
});

// Cancel a breakdown request
router.put("/breakdown/cancel/:requestId", authenticateToken, authorizeRoles(['Driver']), async (req, res) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Cancellation reason is required"
      });
    }
    
    // Check if CancellationReason column exists
    const checkColumnQuery = `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'BreakdownRequests' 
      AND COLUMN_NAME = 'CancellationReason'
    `;
    
    executeQuery(checkColumnQuery, [], (columnErr, columnResults) => {
      if (columnErr) {
        console.error("Error checking for CancellationReason column:", columnErr);
        return res.status(500).json({ 
          success: false, 
          message: "Database error", 
          error: columnErr.message 
        });
      }
      
      // If CancellationReason column doesn't exist, suggest adding it
      if (columnResults.length === 0) {
        return res.status(500).json({
          success: false,
          message: "Database schema issue: CancellationReason column doesn't exist in BreakdownRequests table",
          solution: "Run this SQL: ALTER TABLE BreakdownRequests ADD COLUMN CancellationReason TEXT, ADD COLUMN CancelledTime TIMESTAMP;"
        });
      }
      
      // Check if request exists and is in a valid state
      const checkQuery = "SELECT Status, CustomerID FROM BreakdownRequests WHERE RequestID = ?";
      
      executeQuery(checkQuery, [requestId], (err, results) => {
        if (err) {
          console.error("Error checking breakdown request:", err);
          return res.status(500).json({ 
            success: false, 
            message: "Database error", 
            error: err.message 
          });
        }
        
        if (results.length === 0) {
          return res.status(404).json({
            success: false,
            message: "Breakdown request not found"
          });
        }
        
        if (results[0].Status === 'Completed' || results[0].Status === 'Cancelled') {
          return res.status(400).json({
            success: false,
            message: `Request is already ${results[0].Status}`
          });
        }
        
        const customerId = results[0].CustomerID;
        
        // Update the request status to cancelled
        const updateQuery = `
          UPDATE BreakdownRequests 
          SET Status = 'Cancelled', CancellationReason = ?, CancelledTime = CURRENT_TIMESTAMP
          WHERE RequestID = ?
        `;
        
        executeQuery(updateQuery, [reason, requestId], (err, result) => {
          if (err) {
            console.error("Error cancelling breakdown request:", err);
            return res.status(500).json({ 
              success: false, 
              message: "Failed to cancel breakdown request", 
              error: err.message 
            });
          }
          
          // Send notification to customer if possible
          try {
            // Get customer's FCM token
            const tokenQuery = "SELECT FirebaseToken FROM Customers WHERE CustomerID = ?";
            executeQuery(tokenQuery, [customerId], async (err, tokenResults) => {
              if (!err && tokenResults.length > 0 && tokenResults[0].FirebaseToken) {
                const token = tokenResults[0].FirebaseToken;
                
                // Create notification in database if notifications table exists
                try {
                  const notificationId = generateNotificationId();
                  const notifQuery = `
                    INSERT INTO Notifications (NotificationID, UserID, UserType, Title, Message, Type, RelatedID, IsRead)
                    VALUES (?, ?, 'Customer', 'Breakdown Service Cancelled', 'Your breakdown service request has been cancelled', 'BreakdownService', ?, 0)
                  `;
                  
                  executeQuery(notifQuery, [notificationId, customerId, requestId], (notifErr) => {
                    if (notifErr) {
                      console.error("Error creating notification in database:", notifErr);
                    }
                  });
                } catch (notifDbErr) {
                  console.error("Error creating notification in database:", notifDbErr);
                }
                
                // Send FCM notification
                try {
                  await messaging.send({
                    token: token,
                    notification: {
                      title: 'Breakdown Service Cancelled',
                      body: 'Your breakdown service request has been cancelled'
                    },
                    data: {
                      type: 'breakdown_service',
                      requestId: requestId,
                      status: 'cancelled'
                    }
                  });
                } catch (fcmErr) {
                  console.error("Error sending FCM notification:", fcmErr);
                }
              }
            });
          } catch (notifError) {
            console.error("Error in notification process:", notifError);
            // Continue with response even if notification fails
          }
          
          res.status(200).json({
            success: true,
            message: "Breakdown request cancelled successfully",
            requestId: requestId,
            cancelledAt: new Date()
          });
        });
      });
    });
  } catch (error) {
    console.error("Error in cancel breakdown request API:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
});

// Create invoice for a completed breakdown request
router.post("/breakdown/invoice/:requestId", authenticateToken, authorizeRoles(['Driver']), async (req, res) => {
  try {
    const { requestId } = req.params;
    const { distance, additionalCharges, notes } = req.body;
    const driverId = req.user.employeeId;
    
    if (!distance) {
      return res.status(400).json({
        success: false,
        message: "Distance is required for calculating breakdown service charge"
      });
    }
    
    // Check if request exists and is completed
    const checkQuery = `
      SELECT br.Status, br.CustomerID, br.DriverID, c.FirstName, c.SecondName 
      FROM BreakdownRequests br
      JOIN Customers c ON br.CustomerID = c.CustomerID
      WHERE br.RequestID = ?
    `;
    
    db.query(checkQuery, [requestId], async (err, results) => {
      if (err) {
        console.error("Error checking breakdown request:", err);
        return res.status(500).json({ 
          success: false, 
          message: "Database error", 
          error: err.message 
        });
      }
      
      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Breakdown request not found"
        });
      }
      
      if (results[0].Status !== 'Completed') {
        return res.status(400).json({
          success: false,
          message: "Request must be completed before generating invoice"
        });
      }
      
      const customerId = results[0].CustomerID;
      const customerName = `${results[0].FirstName} ${results[0].SecondName}`;
      
      // Get breakdown service price per kilometer from Services table
      const serviceQuery = "SELECT Price FROM Services WHERE ServiceID = 'S-0014'";
      
      db.query(serviceQuery, [], async (serviceErr, serviceResults) => {
        if (serviceErr || serviceResults.length === 0) {
          console.error("Error fetching breakdown service price:", serviceErr);
          return res.status(500).json({ 
            success: false, 
            message: "Could not determine breakdown service price", 
            error: serviceErr ? serviceErr.message : "Service not found" 
          });
        }
        
        const pricePerKm = serviceResults[0].Price;
        const serviceCharge = parseFloat(distance) * parseFloat(pricePerKm);
        const totalAmount = serviceCharge + (parseFloat(additionalCharges) || 0);
        
        // Generate a new Invoice ID
        const invoiceIdQuery = "SELECT MAX(SUBSTRING(Invoice_ID, 3)) as maxId FROM Invoice";
        
        db.query(invoiceIdQuery, [], async (idErr, idResults) => {
          if (idErr) {
            console.error("Error generating invoice ID:", idErr);
            return res.status(500).json({ 
              success: false, 
              message: "Failed to generate invoice ID", 
              error: idErr.message 
            });
          }
          
          let newInvoiceNumber = 1;
          if (idResults[0].maxId) {
            newInvoiceNumber = parseInt(idResults[0].maxId) + 1;
          }
          
          const invoiceId = `I-${newInvoiceNumber.toString().padStart(4, '0')}`;
          
          // Begin transaction to ensure data consistency
          db.beginTransaction(function(transErr) {
            if (transErr) {
              console.error("Error starting transaction:", transErr);
              return res.status(500).json({ 
                success: false, 
                message: "Transaction error", 
                error: transErr.message 
              });
            }
            
            // Insert into Invoice table
            const invoiceQuery = `
              INSERT INTO Invoice (
                Invoice_ID, Total, Parts_Cost, Labour_Cost, 
                GeneratedBy, GeneratedDate, PaidStatus, Notes
              )
              VALUES (?, ?, 0, ?, ?, CURRENT_TIMESTAMP, 'Pending', ?)
            `;
            
            db.query(invoiceQuery, [
              invoiceId, 
              totalAmount, 
              serviceCharge,
              driverId,
              `Breakdown service for ${customerName}. Distance: ${distance}km. ${notes || ''}`
            ], (invoiceErr, invoiceResult) => {
              if (invoiceErr) {
                return db.rollback(() => {
                  console.error("Error generating invoice:", invoiceErr);
                  res.status(500).json({ 
                    success: false, 
                    message: "Failed to generate invoice", 
                    error: invoiceErr.message 
                  });
                });
              }
              
              // Update the breakdown request to link it to the invoice and change status
              const updateRequestQuery = `
                UPDATE BreakdownRequests 
                SET InvoiceID = ?, Status = 'Invoice Generated'
                WHERE RequestID = ?
              `;
              
              db.query(updateRequestQuery, [invoiceId, requestId], (updateErr) => {
                if (updateErr) {
                  return db.rollback(() => {
                    console.error("Error updating breakdown request:", updateErr);
                    res.status(500).json({ 
                      success: false, 
                      message: "Failed to update breakdown request", 
                      error: updateErr.message 
                    });
                  });
                }
                
                // Create notification in database
                try {
                  const notificationId = uuidv4();
                  const notifQuery = `
                    INSERT INTO notifications (
                      notification_id, CustomerID, title, message, 
                      notification_type, icon_type, color_code, navigate_id
                    )
                    VALUES (?, ?, ?, ?, 'invoice', 'invoice', '#FF5722', ?)
                  `;
                  
                  db.query(notifQuery, [
                    notificationId, 
                    customerId, 
                    'Breakdown Service Invoice', 
                    `Your breakdown service invoice of $${totalAmount.toFixed(2)} is ready for payment`,
                    invoiceId
                  ], (notifErr) => {
                    if (notifErr) {
                      console.error("Error creating notification in database:", notifErr);
                      // Continue with commit even if notification fails
                    }
                    
                    // Commit the transaction
                    db.commit(function(commitErr) {
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
                      
                      // Send successful response
                      res.status(201).json({
                        success: true,
                        message: "Invoice generated successfully",
                        invoiceId: invoiceId,
                        serviceCharge: serviceCharge,
                        pricePerKm: pricePerKm,
                        distance: distance,
                        additionalCharges: additionalCharges || 0,
                        totalAmount: totalAmount
                      });
                    });
                  });
                } catch (notifDbErr) {
                  console.error("Error creating notification in database:", notifDbErr);
                  // Continue with commit even if notification fails
                  db.commit(function(commitErr) {
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
                    
                    // Send successful response
                    res.status(201).json({
                      success: true,
                      message: "Invoice generated successfully",
                      invoiceId: invoiceId,
                      serviceCharge: serviceCharge,
                      pricePerKm: pricePerKm,
                      distance: distance,
                      additionalCharges: additionalCharges || 0,
                      totalAmount: totalAmount
                    });
                  });
                }
              });
            });
          });
        });
      });
    });
  } catch (error) {
    console.error("Error in generate breakdown invoice API:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
});



router.get("/breakdown/active-user", authenticateToken, authorizeRoles(['Customer']), async (req, res) => {
  try {
    const customerId = req.user.customerId;
    console.log("Current customer ID:", customerId);
    
    // Debug: Check all InProgress requests for this customer
    executeQuery("SELECT * FROM BreakdownRequests WHERE Status = 'InProgress' AND CustomerID = ?", 
      [customerId], (err, allResults) => {
      if (err) {
        console.error("Error checking customer's InProgress requests:", err);
      } else {
        console.log("Customer's InProgress requests:", allResults);
      }
    });
    
    const query = `
      SELECT 
        br.RequestID, 
        br.CustomerID,
        br.Description,
        br.ContactName,
        br.ContactPhone,
        br.Latitude,
        br.Longitude,
        br.Status,
        br.RequestTime,
        br.AcceptedTime,
        c.FirstName, 
        c.SecondName,
        c.Telephone as CustomerPhone
      FROM BreakdownRequests br
      JOIN Customers c ON br.CustomerID = c.CustomerID
      WHERE br.Status IN ('InProgress', 'Completed') AND br.CustomerID = ?

      ORDER BY br.RequestTime DESC
    `;
    
    const params = [customerId];
    
    console.log("SQL Query:", query);
    console.log("Parameters:", params);
    
    executeQuery(query, params, (err, results) => {
      if (err) {
        console.error("Error fetching active breakdown requests:", err);
        return res.status(500).json({ 
          success: false, 
          message: "Database error", 
          error: err.message 
        });
      }
      
      console.log("Query results:", results);
      
      res.status(200).json({
        success: true,
        count: results.length,
        data: results
      });
    });
  } catch (error) {
    console.error("Error in active breakdown requests API:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
});

// Get details of a specific breakdown request
router.get("/breakdown/request-details/:requestId", authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.customerId || req.user.employeeId;
    const userRole = req.user.role;
    
    // Query to get breakdown request details with driver information
    const query = `
      SELECT 
        br.RequestID, 
        br.CustomerID,
        br.Description,
        br.ContactName,
        br.ContactPhone,
        br.Latitude,
        br.Longitude,
        br.Status,
        br.RequestTime,
        br.AcceptedTime,
        br.CompletedTime,
        br.DriverID,
        c.FirstName, 
        c.SecondName,
        c.Telephone as CustomerPhone,
        e.Name as DriverName,
        e.Phone as DriverPhone
      FROM BreakdownRequests br
      JOIN Customers c ON br.CustomerID = c.CustomerID
      LEFT JOIN Employees e ON br.DriverID = e.EmployeeID
      WHERE br.RequestID = ?
    `;
    
    // Add authorization check based on user role
    const authCheck = userRole === 'Customer' 
      ? ' AND br.CustomerID = ?' 
      : userRole === 'Driver' 
        ? ' AND (br.Status = "Pending" OR br.DriverID = ?)' 
        : '';
    
    const fullQuery = query + authCheck;
    const params = [requestId];
    
    if (authCheck) {
      params.push(userId);
    }
    
    executeQuery(fullQuery, params, (err, results) => {
      if (err) {
        console.error("Error fetching breakdown request details:", err);
        return res.status(500).json({ 
          success: false, 
          message: "Database error", 
          error: err.message 
        });
      }
      
      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Breakdown request not found or you don't have permission to view it"
        });
      }
      
      res.status(200).json({
        success: true,
        data: results[0]
      });
    });
  } catch (error) {
    console.error("Error in breakdown request details API:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
});



module.exports = router;

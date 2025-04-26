const express = require("express");
const bcrypt = require("bcryptjs"); // ✅ Import bcrypt
const db = require("../db");
const {generateJobCardId,generateNotificationId} = require("../GenerateId");
const { validateEmail, validatePhoneNumber } = require("../validations");
const jwt = require("jsonwebtoken");
const{authenticateToken,authorizeRoles}=require("../utilities");
const { messaging, bucket } = require("../firebaseConfig"); 


const router = express.Router();


router.get("/breakdown/active", authenticateToken, authorizeRoles(['Driver', 'Admin']), async (req, res) => {
    try {
      const query = `
        SELECT 
          br.*, 
          c.FirstName, 
          c.SecondName,
          c.Telephone as CustomerPhone
        FROM BreakdownRequests br
        JOIN Customers c ON br.CustomerID = c.CustomerID
        WHERE br.Status IN ('Pending', 'InProgress')
        ORDER BY br.RequestTime DESC
      `;
      
      db.query(query, [], (err, results) => {
        if (err) {
          console.error("Error fetching active breakdown requests:", err);
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
      console.error("Error in active breakdown requests API:", error);
      res.status(500).json({ 
        success: false, 
        message: "Server error", 
        error: error.message 
      });
    }
  });

router.put("/breakdown/complete/:requestId", authenticateToken, authorizeRoles(['Driver', 'Admin']), async (req, res) => {
    try {
      const { requestId } = req.params;
      
      // Check if request exists and is in a valid state
      const checkQuery = "SELECT Status FROM BreakdownRequests WHERE RequestID = ?";
      
      db.query(checkQuery, [requestId], (err, results) => {
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
        
        db.query(updateQuery, [requestId], (err, result) => {
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



  
  












module.exports = router;
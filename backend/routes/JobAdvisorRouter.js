const express = require("express");
const bcrypt = require("bcryptjs"); // ✅ Import bcrypt
const db = require("../db");
const {generateJobCardId} = require("../GenerateId");
const { validateEmail, validatePhoneNumber } = require("../validations");
const jwt = require("jsonwebtoken");
const{authenticateToken,authorizeRoles}=require("../utilities");

const router = express.Router();

router.use((req, res, next) => {
    console.log("Service Advisor Route Hit:", req.method, req.url);
    next();
});

router.post("/create-jobcard/:appointmentId", authenticateToken, authorizeRoles(["Service Advisor"]), async (req, res) => {
    const { ServiceDetails, Type } = req.body;
    const { appointmentId } = req.params; // Get appointment ID from params

    // Validate input fields
    if (!ServiceDetails || !Type || !appointmentId) {
        return res.status(400).json({ error: true, message: "All parameters required" });
    }

    try {
        // Check if the appointment exists in the Appointments table
        const checkAppointmentQuery = "SELECT * FROM Appointments WHERE AppointmentID = ?";
        db.query(checkAppointmentQuery, [appointmentId], async (err, result) => {
            if (err) {
                console.error("Error checking appointment:", err);
                return res.status(500).json({ error: true, message: "Database error" });
            }

            // If no matching appointment is found
            if (result.length === 0) {
                return res.status(404).json({ error: true, message: "Appointment not found" });
            }

            // Generate JobCardID (e.g., JC-0001, JC-0002, etc.)
            const jobCardID = await generateJobCardId(); // You would need a function like generateJobCardId

            // Insert into JobCards table
            const insertQuery = `INSERT INTO JobCards (JobCardID, ServiceDetails, Type, AppointmentID)
                                 VALUES (?, ?, ?, ?)`;

            db.query(insertQuery, [jobCardID, ServiceDetails, Type, appointmentId], (insertErr, insertResult) => {
                if (insertErr) {
                    console.error("Error inserting JobCard:", insertErr);
                    return res.status(500).json({ error: true, message: "Internal server error" });
                }

                // Successfully created job card
                return res.status(200).json({
                    success: true,
                    message: "Job Card created successfully",
                    jobCardID,
                });
            });
        });
    } catch (error) {
        console.error("Error during job card creation:", error);
        return res.status(500).json({ error: true, message: "Server error" });
    }
});

// router.get("/jobcards", authenticateToken, async (req, res) => {
//     try {
//         const query = "SELECT * FROM JobCards";

//         db.query(query, (err, results) => {
//             if (err) {
//                 console.error("Error fetching job cards:", err);
//                 return res.status(500).json({ error: true, message: "Database error" });
//             }

//             return res.status(200).json({
//                 success: true,
//                 jobCards: results,
//             });
//         });
//     } catch (error) {
//         console.error("Error in fetching job cards:", error);
//         return res.status(500).json({ error: true, message: "Server error" });
//     }
// });

// router.get("/jobcards/ongoing", authenticateToken, async (req, res) => {
//     try {
//         const query = "SELECT * FROM JobCards WHERE Status = 'Ongoing'";

//         db.query(query, (err, results) => {
//             if (err) {
//                 console.error("Error fetching ongoing job cards:", err);
//                 return res.status(500).json({ error: true, message: "Database error" });
//             }

//             return res.status(200).json({
//                 success: true,
//                 jobCards: results,
//             });
//         });
//     } catch (error) {
//         console.error("Error in fetching ongoing job cards:", error);
//         return res.status(500).json({ error: true, message: "Server error" });
//     }
// });


module.exports = router;
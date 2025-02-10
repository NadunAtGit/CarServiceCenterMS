const express = require("express");
const db = require("../db");
const jwt = require("jsonwebtoken");
const{authenticateToken,authorizeRoles}=require("../utilities");
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

    // Adjust today's date by adding one day to fix mismatch
    const todayDate = moment().add(1, 'days').format("YYYY-MM-DD"); 

    try {
        const query = `
            SELECT JC.*
            FROM JobCards JC
            JOIN Mechanics_Assigned MA ON JC.JobCardID = MA.JobCardID
            JOIN Appointments A ON JC.AppointmentID = A.AppointmentID
            WHERE MA.EmployeeID = ? AND A.Date = ?;
        `;

        const jobCards = await new Promise((resolve, reject) => {
            db.query(query, [EmployeeID, todayDate], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        if (jobCards.length === 0) {
            return res.status(404).json({
                error: true,
                message: "No assigned job cards found for today.",
            });
        }

        return res.status(200).json({
            success: true,
            assignedJobCards: jobCards,
        });

    } catch (error) {
        console.error("Error fetching assigned job cards:", error);
        return res.status(500).json({
            error: true,
            message: "Failed to fetch assigned job cards. Please try again later.",
        });
    }
});


















module.exports = router;
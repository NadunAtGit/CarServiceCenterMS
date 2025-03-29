const express = require("express");
const bcrypt = require("bcryptjs"); // ✅ Import bcrypt
const db = require("../db");
const {generateJobCardId} = require("../GenerateId");
const { validateEmail, validatePhoneNumber } = require("../validations");
const jwt = require("jsonwebtoken");
const{authenticateToken,authorizeRoles}=require("../utilities");
const moment = require("moment");

const router = express.Router();

router.use((req, res, next) => {
    console.log("Team Leader Route Hit:", req.method, req.url);
    next();
});


router.get("/present-employees", authenticateToken, authorizeRoles(["Team Leader", "Admin"]), async (req, res) => {
    try {
        const todayDate = moment().format("YYYY-MM-DD"); // Get today's date

        const query = `
            SELECT Employees.EmployeeID, Employees.Name, Employees.Email, Employees.Role, Attendances.Date, Attendances.Status, Attendances.ArrivalTime
            FROM Attendances
            JOIN Employees ON Attendances.EmployeeID = Employees.EmployeeID
            WHERE Attendances.Date = ? AND Attendances.Status = 'Present'
        `;

        const presentEmployees = await new Promise((resolve, reject) => {
            db.query(query, [todayDate], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        return res.status(200).json({
            error: false,
            message: "Present employees fetched successfully",
            employees: presentEmployees
        });

    } catch (error) {
        console.error("Error fetching present employees:", error);
        return res.status(500).json({ error: true, message: "Server error" });
    }
});

router.get("/notworking-employees", authenticateToken, authorizeRoles(["Team Leader"]), async (req, res) => {
    try {
        const todayDate = moment().format("YYYY-MM-DD"); // Get today's date

        const query = `
            SELECT Employees.EmployeeID, Employees.Name, Employees.Email, Employees.Role, 
                   Attendances.Date, Attendances.Status, Attendances.ArrivalTime, Attendances.isWorking
            FROM Attendances
            JOIN Employees ON Attendances.EmployeeID = Employees.EmployeeID
            WHERE Attendances.Date = ? 
              AND Attendances.Status = 'Present' 
              AND Employees.Role = 'Mechanic'
              AND Attendances.isWorking = FALSE;
        `;

        const notWorkingMechanics = await new Promise((resolve, reject) => {
            db.query(query, [todayDate], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        return res.status(200).json({
            error: false,
            message: "Not working mechanics fetched successfully",
            employees: notWorkingMechanics
        });

    } catch (error) {
        console.error("Error fetching not working mechanics:", error);
        return res.status(500).json({ error: true, message: "Server error" });
    }
});




router.get("/get-job-cards", authenticateToken, authorizeRoles(["Team Leader","Service Advisor"]), async (req, res) => {
    try {
        const query = "SELECT * FROM JobCards WHERE Status = 'Created'";

        db.query(query, (err, result) => {
            if (err) {
                console.error("Error fetching job cards:", err);
                return res.status(500).json({ error: true, message: "Internal server error" });
            }

            if (result.length === 0) {
                return res.status(404).json({ error: true, message: "No job cards found with 'Created' status" });
            }

            return res.status(200).json({
                success: true,
                jobCards: result,
            });
        });
    } catch (error) {
        console.error("Error fetching job cards:", error);
        return res.status(500).json({ error: true, message: "Server error" });
    }
});

router.get('/get-job-cards/today',authenticateToken,authorizeRoles(["Team Leader","Service Advisor"]), async (req, res) => {
    try {
        const todayDate = moment().format("YYYY-MM-DD"); // Get today's date

        const query = `
            SELECT jc.*, a.Date, a.Time, a.Status 
            FROM JobCards jc
            JOIN Appointments a ON jc.AppointmentID = a.AppointmentID
            WHERE a.Date = ? AND jc.Type = 'Created'
        `;

        const jobCards = await new Promise((resolve, reject) => {
            db.query(query, [todayDate], (err, results) => {
                if (err) reject(err);
                resolve(results);
            });
        });

        if (jobCards.length === 0) {
            return res.status(404).json({
                error: true,
                message: "No job cards found for today's appointments.",
            });
        }

        return res.status(200).json({
            error: false,
            jobCards,
        });

    } catch (error) {
        console.error("Error fetching today's job cards:", error);
        return res.status(500).json({
            error: true,
            message: "Failed to fetch job cards for today.",
        });
    }
});


//     try {
//         const { id } = req.params; // JobCardID to which mechanics are being assigned
//         const { employeeIds } = req.body; // Array of Employee IDs for mechanics

//         // Validate that employeeIds is provided and it's an array
//         if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
//             return res.status(400).json({ error: true, message: "Employee IDs are required as an array" });
//         }

//         // Check if all employees have the "Mechanic" role and are "Present"
//         const employeeStatuses = await Promise.all(employeeIds.map(async (employeeId) => {
//             const checkEmployeeQuery = "SELECT Role FROM Employees WHERE EmployeeID = ?";
//             const employeeResult = await new Promise((resolve, reject) => {
//                 db.query(checkEmployeeQuery, [employeeId], (err, result) => {
//                     if (err) return reject(err);
//                     resolve(result);
//                 });
//             });

//             if (employeeResult.length === 0 || employeeResult[0].Role !== "Mechanic") {
//                 return { employeeId, valid: false, message: "Employee is not a Mechanic" };
//             }

//             const todayDate = moment().format("YYYY-MM-DD");
//             const checkAttendanceQuery = "SELECT * FROM Attendances WHERE EmployeeID = ? AND Date = ?";
//             const attendanceResult = await new Promise((resolve, reject) => {
//                 db.query(checkAttendanceQuery, [employeeId, todayDate], (err, result) => {
//                     if (err) return reject(err);
//                     resolve(result);
//                 });
//             });

//             if (attendanceResult.length === 0 || attendanceResult[0].Status !== "Present") {
//                 return { employeeId, valid: false, message: "Employee is not Present today" };
//             }

//             return { employeeId, valid: true };
//         }));

//         // Filter out employees that failed validation
//         const invalidEmployees = employeeStatuses.filter(status => !status.valid);
//         if (invalidEmployees.length > 0) {
//             return res.status(400).json({
//                 error: true,
//                 message: "The following employees could not be assigned due to issues:",
//                 invalidEmployees,
//             });
//         }

//         // Proceed to assign mechanics to the job card
//         const insertQuery = "INSERT INTO Mechanics_Assigned (JobCardID, EmployeeID) VALUES ?";
//         const jobCardMechanicsData = employeeIds.map(employeeId => [id, employeeId]);

//         // Insert mechanics into the JobCardMechanics table
//         await new Promise((resolve, reject) => {
//             db.query(insertQuery, [jobCardMechanicsData], (err, result) => {
//                 if (err) return reject(err);
//                 resolve(result);
//             });
//         });

//         return res.status(200).json({
//             success: true,
//             message: "Mechanics have been successfully assigned to the job card",
//             assignedEmployees: employeeIds,
//         });
//     } catch (error) {
//         console.error("Error assigning mechanics:", error);
//         return res.status(500).json({ error: true, message: "Server error" });
//     }
// });

router.post("/assign-mechanics/:id", authenticateToken, authorizeRoles(["Team Leader"]), async (req, res) => {
    try {
        const { id } = req.params; // JobCardID to which mechanics are being assigned
        const { employeeIds } = req.body; // Array of Employee IDs for mechanics

        if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
            return res.status(400).json({ error: true, message: "Employee IDs are required as an array" });
        }

        const todayDate = moment().format("YYYY-MM-DD");

        // Validate employees: Check if they are Mechanics and Present
        const employeeStatuses = await Promise.all(employeeIds.map(async (employeeId) => {
            const checkEmployeeQuery = "SELECT Role FROM Employees WHERE EmployeeID = ?";
            const employeeResult = await new Promise((resolve, reject) => {
                db.query(checkEmployeeQuery, [employeeId], (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                });
            });

            if (employeeResult.length === 0 || employeeResult[0].Role !== "Mechanic") {
                return { employeeId, valid: false, message: "Employee is not a Mechanic" };
            }

            const checkAttendanceQuery = "SELECT * FROM Attendances WHERE EmployeeID = ? AND Date = ?";
            const attendanceResult = await new Promise((resolve, reject) => {
                db.query(checkAttendanceQuery, [employeeId, todayDate], (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                });
            });

            if (attendanceResult.length === 0 || attendanceResult[0].Status !== "Present") {
                return { employeeId, valid: false, message: "Employee is not Present today" };
            }

            return { employeeId, valid: true };
        }));

        // Check for invalid employees
        const invalidEmployees = employeeStatuses.filter(status => !status.valid);
        if (invalidEmployees.length > 0) {
            return res.status(400).json({
                error: true,
                message: "Some employees could not be assigned:",
                invalidEmployees,
            });
        }

        // Assign mechanics to the job card
        const insertQuery = "INSERT INTO Mechanics_Assigned (JobCardID, EmployeeID) VALUES ?";
        const jobCardMechanicsData = employeeIds.map(employeeId => [id, employeeId]);

        await new Promise((resolve, reject) => {
            db.query(insertQuery, [jobCardMechanicsData], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        // Update isWorking = TRUE in Attendances table
        const updateAttendanceQuery = "UPDATE Attendances SET isWorking = TRUE WHERE EmployeeID IN (?) AND Date = ?";
        await new Promise((resolve, reject) => {
            db.query(updateAttendanceQuery, [employeeIds, todayDate], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        // Update JobCard status to "Assigned"
        const updateJobCardQuery = "UPDATE JobCards SET Status = 'Assigned' WHERE JobCardID = ?";
        await new Promise((resolve, reject) => {
            db.query(updateJobCardQuery, [id], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        return res.status(200).json({
            success: true,
            message: "Mechanics assigned, attendance updated, and JobCard status set to 'Assigned'",
            assignedEmployees: employeeIds,
        });

    } catch (error) {
        console.error("Error assigning mechanics:", error);
        return res.status(500).json({ error: true, message: "Server error" });
    }
});




module.exports = router;
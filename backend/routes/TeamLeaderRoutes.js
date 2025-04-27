const express = require("express");
const bcrypt = require("bcryptjs"); // ✅ Import bcrypt
const db = require("../db");
const {generateJobCardId,generateNotificationId} = require("../GenerateId");
const { validateEmail, validatePhoneNumber } = require("../validations");
const jwt = require("jsonwebtoken");
const{authenticateToken,authorizeRoles}=require("../utilities");
const moment = require("moment");
const { messaging, bucket } = require("../firebaseConfig"); 

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
        
        // Get the Team Leader's department from the JWT token
        const employeeDepartment = req.user.department;
        
        const query = `
            SELECT Employees.EmployeeID, Employees.Name, Employees.Email, Employees.Role, 
                   Employees.ProfilePicUrl, Employees.Department,
                   Attendances.Date, Attendances.Status, Attendances.ArrivalTime, Attendances.isWorking
            FROM Attendances
            JOIN Employees ON Attendances.EmployeeID = Employees.EmployeeID
            WHERE Attendances.Date = ? 
              AND Attendances.Status = 'Present' 
              AND Employees.Role = 'Mechanic'
              AND Attendances.isWorking = FALSE
              AND Employees.Department = ?
        `;

        const notWorkingMechanics = await new Promise((resolve, reject) => {
            db.query(query, [todayDate, employeeDepartment], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        return res.status(200).json({
            error: false,
            message: `Not working mechanics in ${employeeDepartment} department fetched successfully`,
            employees: notWorkingMechanics
        });

    } catch (error) {
        console.error("Error fetching not working mechanics:", error);
        return res.status(500).json({ error: true, message: "Server error" });
    }
});

router.get("/get-job-cards", authenticateToken, authorizeRoles(["Team Leader", "Service Advisor"]), async (req, res) => {
    try {
        // Get the employee's department and role from the JWT token
        const employeeDepartment = req.user.department;
        const employeeRole = req.user.role;
        
        // Build the query based on role
        let query;
        let queryParams = [];
        
        if (employeeRole === "Team Leader") {
            // Team Leaders can only see job cards for their department
            query = "SELECT * FROM JobCards WHERE Status = 'Created' AND Type = ?";
            queryParams = [employeeDepartment];
        } else {
            // Service Advisors can see all job cards
            query = "SELECT * FROM JobCards WHERE Status = 'Created'";
        }

        db.query(query, queryParams, (err, result) => {
            if (err) {
                console.error("Error fetching job cards:", err);
                return res.status(500).json({ error: true, message: "Internal server error" });
            }

            if (result.length === 0) {
                return res.status(404).json({ 
                    error: true, 
                    message: employeeRole === "Team Leader" 
                        ? `No job cards found with 'Created' status for ${employeeDepartment} department` 
                        : "No job cards found with 'Created' status" 
                });
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
        const { id } = req.params; // JobCardID
        const { employeeIds } = req.body; // Array of Employee IDs

        if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
            return res.status(400).json({ error: true, message: "Employee IDs are required as an array" });
        }

        const todayDate = moment().format("YYYY-MM-DD");

        // 1. Validate employees (Mechanics and Present)
        const employeeStatuses = await Promise.all(employeeIds.map(async (employeeId) => {
            const [employeeResult] = await db.promise().query(
                "SELECT e.*, a.Status FROM Employees e LEFT JOIN Attendances a ON e.EmployeeID = a.EmployeeID AND a.Date = ? WHERE e.EmployeeID = ?",
                [todayDate, employeeId]
            );

            if (employeeResult.length === 0 || employeeResult[0].Role !== "Mechanic") {
                return { employeeId, valid: false, message: "Not a Mechanic" };
            }

            if (employeeResult[0].Status !== "Present") {
                return { employeeId, valid: false, message: "Not Present today" };
            }

            return { 
                employeeId, 
                valid: true,
                name: employeeResult[0].Name,
                specialization: employeeResult[0].Specialization || "General Mechanic"
            };
        }));

        // Check for invalid employees
        const invalidEmployees = employeeStatuses.filter(status => !status.valid);
        if (invalidEmployees.length > 0) {
            return res.status(400).json({
                error: true,
                message: "Some employees could not be assigned",
                invalidEmployees,
            });
        }

        const validMechanics = employeeStatuses.filter(status => status.valid);

        // 2. Get JobCard and Customer details
        const [jobCardResult] = await db.promise().query(
            "SELECT j.*, c.CustomerID, c.FirebaseToken FROM JobCards j JOIN Appointments a ON j.AppointmentID = a.AppointmentID JOIN Customers c ON a.CustomerID = c.CustomerID WHERE j.JobCardID = ?",
            [id]
        );

        if (jobCardResult.length === 0) {
            return res.status(404).json({ error: true, message: "Job Card not found" });
        }

        const customerId = jobCardResult[0].CustomerID;
        const fcmToken = jobCardResult[0].FirebaseToken;

        // 3. Assign mechanics to the job card
        const insertQuery = "INSERT INTO Mechanics_Assigned (JobCardID, EmployeeID) VALUES ?";
        const jobCardMechanicsData = validMechanics.map(mechanic => [id, mechanic.employeeId]);

        await db.promise().query(insertQuery, [jobCardMechanicsData]);

        // 4. Update attendance and job card status
        await db.promise().query(
            "UPDATE Attendances SET isWorking = TRUE WHERE EmployeeID IN (?) AND Date = ?",
            [validMechanics.map(m => m.employeeId), todayDate]
        );

        await db.promise().query(
            "UPDATE JobCards SET Status = 'Assigned' WHERE JobCardID = ?",
            [id]
        );

        // 5. Prepare and send notification to customer
        const mechanicsList = validMechanics.map(m => `${m.name} (${m.specialization})`).join(", ");
        
        const notificationTitle = 'Mechanics Assigned';
        const notificationBody = `Your job card #${id} has been assigned to: ${mechanicsList}`;
        
        let notificationSent = false;
        
        if (fcmToken) {
            const notificationMessage = {
                notification: {
                    title: notificationTitle,
                    body: notificationBody,
                },
                data: {
                    jobCardID: id,
                    type: 'mechanic_assignment',
                    mechanics: JSON.stringify(validMechanics) // Send mechanics details
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

        // 6. Store notification in database
        const notificationID = await generateNotificationId();
        await db.promise().query(
            `INSERT INTO notifications 
            (notification_id, CustomerID, title, message, notification_type, icon_type, color_code, is_read, created_at, navigate_id,metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, CURRENT_TIMESTAMP, ?,?)`,
            [
                notificationID,
                customerId,
                notificationTitle,
                notificationBody,
                'Mechanic Assignment',
                'engineering',
                '#4CAF50', // Green color
                id,
                JSON.stringify({ jobCardID: id, mechanics: validMechanics })
            ]
        );

        return res.status(200).json({
            success: true,
            message: "Mechanics assigned successfully",
            assignedMechanics: validMechanics,
            notification: {
                sent: notificationSent,
                id: notificationID
            }
        });

    } catch (error) {
        console.error("Error assigning mechanics:", error);
        return res.status(500).json({ error: true, message: "Server error" });
    }
});

router.get("/get-jobcards-created", authenticateToken, authorizeRoles(["Team Leader"]), async (req, res) => {
    try {
        // First query to get all job cards with status 'Created'
        const jobCardsQuery = "SELECT * FROM JobCards WHERE Status = ? ORDER BY JobCardID DESC";
        
        const jobCards = await new Promise((resolve, reject) => {
            db.query(jobCardsQuery, ["Created"], (err, result) => {
                if (err) {
                    console.error("Error fetching created job cards:", err);
                    return reject(err);
                }
                resolve(result);
            });
        });

        if (jobCards.length === 0) {
            return res.status(200).json({
                success: true,
                jobCards: [],
                count: 0
            });
        }

        // Extract job card IDs for the second query
        const jobCardIds = jobCards.map(jobCard => jobCard.JobCardID);
        
        // Second query to get all service records for these job cards
        const serviceRecordsQuery = `
            SELECT * FROM ServiceRecords 
            WHERE JobCardID IN (?)
            ORDER BY ServiceRecord_ID
        `;
        
        const serviceRecords = await new Promise((resolve, reject) => {
            db.query(serviceRecordsQuery, [jobCardIds], (err, result) => {
                if (err) {
                    console.error("Error fetching service records:", err);
                    return reject(err);
                }
                resolve(result);
            });
        });
        
        // Group service records by job card ID
        const jobCardsWithServiceRecords = jobCards.map(jobCard => {
            const jobCardServiceRecords = serviceRecords.filter(
                record => record.JobCardID === jobCard.JobCardID
            );
            
            return {
                ...jobCard,
                ServiceRecords: jobCardServiceRecords
            };
        });

        // Return the response
        return res.status(200).json({
            success: true,
            jobCards: jobCardsWithServiceRecords,
            count: jobCardsWithServiceRecords.length
        });
    } catch (error) {
        console.error("Error in get-jobcards-created endpoint:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
});

router.get("/get-jobcards-assigned", authenticateToken, authorizeRoles(["Team Leader"]), async (req, res) => {
    try {
        // First query to get all job cards with status 'Assigned'
        const jobCardsQuery = "SELECT * FROM JobCards WHERE Status = ? ORDER BY JobCardID DESC";
        
        const jobCards = await new Promise((resolve, reject) => {
            db.query(jobCardsQuery, ["Assigned"], (err, result) => {
                if (err) {
                    console.error("Error fetching assigned job cards:", err);
                    return reject(err);
                }
                resolve(result);
            });
        });

        if (jobCards.length === 0) {
            return res.status(200).json({
                success: true,
                jobCards: [],
                count: 0
            });
        }

        // Extract job card IDs for the second query
        const jobCardIds = jobCards.map(jobCard => jobCard.JobCardID);
        
        // Second query to get all service records for these job cards
        const serviceRecordsQuery = `
            SELECT * FROM ServiceRecords 
            WHERE JobCardID IN (?)
            ORDER BY ServiceRecord_ID
        `;
        
        const serviceRecords = await new Promise((resolve, reject) => {
            db.query(serviceRecordsQuery, [jobCardIds], (err, result) => {
                if (err) {
                    console.error("Error fetching service records:", err);
                    return reject(err);
                }
                resolve(result);
            });
        });
        
        // Group service records by job card ID
        const jobCardsWithServiceRecords = jobCards.map(jobCard => {
            const jobCardServiceRecords = serviceRecords.filter(
                record => record.JobCardID === jobCard.JobCardID
            );
            
            return {
                ...jobCard,
                ServiceRecords: jobCardServiceRecords
            };
        });

        // Return the response
        return res.status(200).json({
            success: true,
            jobCards: jobCardsWithServiceRecords,
            count: jobCardsWithServiceRecords.length
        });
    } catch (error) {
        console.error("Error in get-jobcards-assigned endpoint:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
});

router.get("/get-jobcards-ongoing", authenticateToken, authorizeRoles(["Team Leader"]), async (req, res) => {
    try {
        // First query to get all job cards with status 'Ongoing'
        const jobCardsQuery = "SELECT * FROM JobCards WHERE Status = ? ORDER BY JobCardID DESC";
        
        const jobCards = await new Promise((resolve, reject) => {
            db.query(jobCardsQuery, ["Ongoing"], (err, result) => {
                if (err) {
                    console.error("Error fetching ongoing job cards:", err);
                    return reject(err);
                }
                resolve(result);
            });
        });

        if (jobCards.length === 0) {
            return res.status(200).json({
                success: true,
                jobCards: [],
                count: 0
            });
        }

        // Extract job card IDs for the second query
        const jobCardIds = jobCards.map(jobCard => jobCard.JobCardID);
        
        // Second query to get all service records for these job cards
        const serviceRecordsQuery = `
            SELECT * FROM ServiceRecords 
            WHERE JobCardID IN (?)
            ORDER BY ServiceRecord_ID
        `;
        
        const serviceRecords = await new Promise((resolve, reject) => {
            db.query(serviceRecordsQuery, [jobCardIds], (err, result) => {
                if (err) {
                    console.error("Error fetching service records:", err);
                    return reject(err);
                }
                resolve(result);
            });
        });
        
        // Group service records by job card ID
        const jobCardsWithServiceRecords = jobCards.map(jobCard => {
            const jobCardServiceRecords = serviceRecords.filter(
                record => record.JobCardID === jobCard.JobCardID
            );
            
            return {
                ...jobCard,
                ServiceRecords: jobCardServiceRecords
            };
        });

        // Return the response
        return res.status(200).json({
            success: true,
            jobCards: jobCardsWithServiceRecords,
            count: jobCardsWithServiceRecords.length
        });
    } catch (error) {
        console.error("Error in get-jobcards-ongoing endpoint:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
});

router.get("/get-jobcards-finished", authenticateToken, authorizeRoles(["Team Leader"]), async (req, res) => {
    try {
        // First query to get all job cards with status 'Finished'
        const jobCardsQuery = "SELECT * FROM JobCards WHERE Status = ? ORDER BY JobCardID DESC";
        
        const jobCards = await new Promise((resolve, reject) => {
            db.query(jobCardsQuery, ["Finished"], (err, result) => {
                if (err) {
                    console.error("Error fetching finished job cards:", err);
                    return reject(err);
                }
                resolve(result);
            });
        });

        if (jobCards.length === 0) {
            return res.status(200).json({
                success: true,
                jobCards: [],
                count: 0
            });
        }

        // Extract job card IDs for the second query
        const jobCardIds = jobCards.map(jobCard => jobCard.JobCardID);
        
        // Second query to get all service records for these job cards
        const serviceRecordsQuery = `
            SELECT * FROM ServiceRecords 
            WHERE JobCardID IN (?)
            ORDER BY ServiceRecord_ID
        `;
        
        const serviceRecords = await new Promise((resolve, reject) => {
            db.query(serviceRecordsQuery, [jobCardIds], (err, result) => {
                if (err) {
                    console.error("Error fetching service records:", err);
                    return reject(err);
                }
                resolve(result);
            });
        });
        
        // Group service records by job card ID
        const jobCardsWithServiceRecords = jobCards.map(jobCard => {
            const jobCardServiceRecords = serviceRecords.filter(
                record => record.JobCardID === jobCard.JobCardID
            );
            
            return {
                ...jobCard,
                ServiceRecords: jobCardServiceRecords
            };
        });

        // Return the response
        return res.status(200).json({
            success: true,
            jobCards: jobCardsWithServiceRecords,
            count: jobCardsWithServiceRecords.length
        });
    } catch (error) {
        console.error("Error in get-jobcards-finished endpoint:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
});

router.get("/get-jobcards-invoicegenerated", authenticateToken, authorizeRoles(["Team Leader"]), async (req, res) => {
    try {
        // First query to get all job cards with status 'Finished'
        const jobCardsQuery = "SELECT * FROM JobCards WHERE Status = ? ORDER BY JobCardID DESC";
        
        const jobCards = await new Promise((resolve, reject) => {
            db.query(jobCardsQuery, ["Invoice Generated"], (err, result) => {
                if (err) {
                    console.error("Error fetching finished job cards:", err);
                    return reject(err);
                }
                resolve(result);
            });
        });

        if (jobCards.length === 0) {
            return res.status(200).json({
                success: true,
                jobCards: [],
                count: 0
            });
        }

        // Extract job card IDs for the second query
        const jobCardIds = jobCards.map(jobCard => jobCard.JobCardID);
        
        // Second query to get all service records for these job cards
        const serviceRecordsQuery = `
            SELECT * FROM ServiceRecords 
            WHERE JobCardID IN (?)
            ORDER BY ServiceRecord_ID
        `;
        
        const serviceRecords = await new Promise((resolve, reject) => {
            db.query(serviceRecordsQuery, [jobCardIds], (err, result) => {
                if (err) {
                    console.error("Error fetching service records:", err);
                    return reject(err);
                }
                resolve(result);
            });
        });
        
        // Group service records by job card ID
        const jobCardsWithServiceRecords = jobCards.map(jobCard => {
            const jobCardServiceRecords = serviceRecords.filter(
                record => record.JobCardID === jobCard.JobCardID
            );
            
            return {
                ...jobCard,
                ServiceRecords: jobCardServiceRecords
            };
        });

        // Return the response
        return res.status(200).json({
            success: true,
            jobCards: jobCardsWithServiceRecords,
            count: jobCardsWithServiceRecords.length
        });
    } catch (error) {
        console.error("Error in get-jobcards-finished endpoint:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
});





module.exports = router;
const express = require("express");
const bcrypt = require("bcryptjs"); // ✅ Import bcrypt
const db = require("../db");
const jwt = require("jsonwebtoken");
const{authenticateToken,authorizeRoles}=require("../utilities");
const moment = require("moment");
const { v4: uuidv4 } = require("uuid");
const { messaging, bucket } = require("../firebaseConfig"); 
// Firebase storage bucket

const router = express.Router();


router.use((req, res, next) => {
    console.log("Report Route Hit:", req.method, req.url);
    next();
});

router.get("/count-employees",authenticateToken,authorizeRoles(["Admin"]),(req,res)=>{
    const query = `SELECT COUNT(*) AS employee_count FROM employees`;
    db.query(query, (err, result) => {
        if (err) {
            console.error("Error fetching employee count:", err);
            return res.status(500).json({ error: "Internal server error" });
        }
        res.json({ employee_count: result[0].employee_count });
    });
});

router.get("/count-today-attendance", authenticateToken, authorizeRoles(["Admin"]), (req, res) => {
    const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD' format

    const query = `
        SELECT COUNT(*) AS attendanceCount 
        FROM attendances
        WHERE Date = ? AND Status = 'Present'
    `;

    db.query(query, [today], (err, results) => {
        if (err) {
            console.error("Error fetching attendance count:", err);
            return res.status(500).json({ message: "Database error" });
        }

        res.status(200).json({ date: today, count: results[0].attendanceCount });
    });
});

router.get("/count-jobcards", authenticateToken, authorizeRoles(["Admin"]), (req, res) => {
    const query = `
        SELECT COUNT(*) AS jobCardCount 
        FROM JobCards 
        WHERE Status IN ('Finished', 'Invoice Generated')
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching job card count:", err);
            return res.status(500).json({ message: "Database error" });
        }

        res.status(200).json({ count: results[0].jobCardCount });
    });
});

router.get("/monthly-sales", authenticateToken, authorizeRoles(["Admin"]), (req, res) => {
    const query = `
        SELECT 
            DATE_FORMAT(GeneratedDate, '%Y-%m') AS month, 
            SUM(Total) AS totalSales 
        FROM Invoice 
        GROUP BY DATE_FORMAT(GeneratedDate, '%Y-%m') 
        ORDER BY month ASC
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching monthly sales:", err);
            return res.status(500).json({ message: "Database error" });
        }

        res.status(200).json(results); // returns array of { month: 'YYYY-MM', totalSales: number }
    });
});

router.get("/this-month-sales", authenticateToken, authorizeRoles(["Admin"]), (req, res) => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999); // Last day of the month

    const query = `
        SELECT SUM(Total) AS totalSales 
        FROM Invoice 
        WHERE GeneratedDate BETWEEN ? AND ?
    `;

    db.query(query, [startOfMonth, endOfMonth], (err, results) => {
        if (err) {
            console.error("Error fetching this month's sales:", err);
            return res.status(500).json({ message: "Database error" });
        }

        res.status(200).json({ totalSales: results[0].totalSales || 0 });
    });
});




module.exports = router;
const express = require("express");
const bcrypt = require("bcryptjs"); // ✅ Import bcrypt
const db = require("../db");
const jwt = require("jsonwebtoken");
const{authenticateToken,authorizeRoles,generatePdfContent}=require("../utilities");
const moment = require("moment");
const { v4: uuidv4 } = require("uuid");
const { messaging, bucket } = require("../firebaseConfig"); 
// Firebase storage bucket
const PDFDocument = require('pdfkit');
const fs = require('fs-extra');
const path = require('path');

const router = express.Router();


// router.use((req, res, next) => {
//     console.log("Report Route Hit:", req.method, req.url);
//     next();
// });

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
    const currentYear = new Date().getFullYear();
    
    const query = `
        SELECT 
            MONTHNAME(GeneratedDate) AS month, 
            SUM(Total) AS totalSales 
        FROM Invoice 
        WHERE YEAR(GeneratedDate) = ?
        GROUP BY MONTHNAME(GeneratedDate), MONTH(GeneratedDate)
        ORDER BY MONTH(GeneratedDate) ASC
    `;

    db.query(query, [currentYear], (err, results) => {
        if (err) {
            console.error("Error fetching monthly sales:", err);
            return res.status(500).json({ message: "Database error" });
        }

        res.status(200).json(results); // returns array of { month: 'April', totalSales: number }
    });
});

// In your backend routes file (e.g., routes/reports.js)
// routes/reports.js
router.get("/attendance", authenticateToken, (req, res) => {
    const employeeId = req.user.EmployeeID; // Extract just the EmployeeID property
    
    // For debugging
    console.log("Fetching attendance for employee:", employeeId);
    
    const query = `
        SELECT 
            AttendanceID, 
            EmployeeID, 
            Date, 
            Status, 
            ArrivalTime, 
            DepartureTime,
            isWorking
        FROM Attendances
        WHERE EmployeeID = ?
        ORDER BY Date DESC
        LIMIT 30
    `;
    
    db.query(query, [employeeId], (err, results) => {
        if (err) {
            console.error("Error fetching attendance records:", err);
            return res.status(500).json({ message: "Database error" });
        }
        
        console.log(`Found ${results.length} attendance records`);
        
        // Calculate attendance statistics
        const presentCount = results.filter(record => record.Status === 'Present').length;
        const absentCount = results.filter(record => record.Status === 'Absent').length;
        const lateCount = results.filter(record => {
            if (record.Status !== 'Present') return false;
            // Consider arrival after 9:15 AM as late
            if (!record.ArrivalTime) return false;
            
            const arrivalTime = new Date(record.ArrivalTime);
            const hours = arrivalTime.getHours();
            const minutes = arrivalTime.getMinutes();
            
            return (hours > 9 || (hours === 9 && minutes > 15));
        }).length;
        
        const currentDate = new Date();
        
        res.status(200).json({
            success: true,
            month: currentDate.toLocaleString('default', { month: 'long' }),
            year: currentDate.getFullYear(),
            attendanceRecords: results,
            stats: {
                present: presentCount,
                absent: absentCount,
                late: lateCount,
                percentage: results.length ? Math.round((presentCount / results.length) * 100) : 0
            }
        });
    });
});



router.get("/attendance", authenticateToken, async (req, res) => {
  try {
    const employeeId = req.user.id; // or req.user._id depending on your auth

    // Get the current month start and end dates
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const attendanceRecords = await Attendance.find({
      employeeId: employeeId,
      date: {
        $gte: startOfMonth,
        $lte: endOfMonth
      }
    });

    res.status(200).json(attendanceRecords);
  } catch (err) {
    console.error("Error fetching attendance:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/this-month-sales", authenticateToken, authorizeRoles(["Admin"]), (req, res) => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999); // Last day of the month

    const query = `
        SELECT SUM(Total) AS totalSales 
        FROM Invoice 
        WHERE GeneratedDate BETWEEN ? AND ?
        AND PaidStatus = 'Paid'
    `;

    db.query(query, [startOfMonth, endOfMonth], (err, results) => {
        if (err) {
            console.error("Error fetching this month's sales:", err);
            return res.status(500).json({ message: "Database error" });
        }

        res.status(200).json({ totalSales: results[0].totalSales || 0 });
    });
});



router.get("/this-month-appointments", authenticateToken, authorizeRoles(["Admin"]), (req, res) => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999); // Last day of the month

    const query = `
        SELECT COUNT(*) AS totalAppointments 
        FROM Appointments 
        WHERE Date BETWEEN ? AND ?
    `;

    db.query(query, [startOfMonth, endOfMonth], (err, results) => {
        if (err) {
            console.error("Error fetching this month's appointments:", err);
            return res.status(500).json({ message: "Database error" });
        }

        res.status(200).json({ totalAppointments: results[0].totalAppointments || 0 });
    });
});

router.get("/daily", authenticateToken, authorizeRoles(["Admin"]), (req, res) => {
    const { date } = req.query; // Format: YYYY-MM-DD
    const targetDate = date ? new Date(date) : new Date();
    
    // Set time to beginning and end of the day
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const query = `
        SELECT 
            COUNT(i.Invoice_ID) AS transactions,
            SUM(i.Total) AS totalRevenue,
            SUM(i.Labour_Cost) AS serviceRevenue,
            SUM(i.Parts_Cost) AS partsRevenue,
            COUNT(DISTINCT j.JobCardID) AS servicesCompleted,
            (SELECT COUNT(*) FROM Parts_Used pu 
             JOIN Invoice inv ON pu.InvoiceID = inv.Invoice_ID 
             WHERE inv.GeneratedDate BETWEEN ? AND ?) AS partsSold
        FROM Invoice i
        LEFT JOIN JobCards j ON i.JobCard_ID = j.JobCardID
        WHERE i.GeneratedDate BETWEEN ? AND ?
    `;
    
    db.query(query, [startOfDay, endOfDay, startOfDay, endOfDay], (err, results) => {
        if (err) {
            console.error("Error fetching daily report:", err);
            return res.status(500).json({ success: false, message: "Database error" });
        }

        // Format the response
        const report = {
            title: "Daily Summary",
            date: targetDate.toISOString().split('T')[0],
            transactions: results[0].transactions || 0,
            revenue: results[0].totalRevenue || 0,
            services: results[0].servicesCompleted || 0,
            parts: results[0].partsSold || 0,
            serviceRevenue: results[0].serviceRevenue || 0,
            partsRevenue: results[0].partsRevenue || 0
        };

        res.status(200).json({ success: true, data: report });
    });
});

router.get("/weekly", authenticateToken, authorizeRoles(["Admin"]), (req, res) => {
    const { startDate } = req.query; // Format: YYYY-MM-DD (first day of week)
    
    // Calculate start and end dates
    let weekStart;
    if (startDate) {
        weekStart = new Date(startDate);
    } else {
        // Default to current week (starting Monday)
        weekStart = new Date();
        const day = weekStart.getDay();
        const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
        weekStart = new Date(weekStart.setDate(diff));
    }
    
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const query = `
        SELECT 
            COUNT(i.Invoice_ID) AS transactions,
            SUM(i.Total) AS totalRevenue,
            SUM(i.Labour_Cost) AS serviceRevenue,
            SUM(i.Parts_Cost) AS partsRevenue,
            COUNT(DISTINCT j.JobCardID) AS servicesCompleted,
            (SELECT COUNT(*) FROM Parts_Used pu 
             JOIN Invoice inv ON pu.InvoiceID = inv.Invoice_ID 
             WHERE inv.GeneratedDate BETWEEN ? AND ?) AS partsSold,
            DATE(i.GeneratedDate) AS day,
            COUNT(i.Invoice_ID) AS dailyTransactions,
            SUM(i.Total) AS dailyRevenue
        FROM Invoice i
        LEFT JOIN JobCards j ON i.JobCard_ID = j.JobCardID
        WHERE i.GeneratedDate BETWEEN ? AND ?
        GROUP BY day
        ORDER BY day
    `;
    
    db.query(query, [weekStart, weekEnd, weekStart, weekEnd], (err, results) => {
        if (err) {
            console.error("Error fetching weekly report:", err);
            return res.status(500).json({ success: false, message: "Database error" });
        }

        // Calculate totals
        const totals = {
            transactions: 0,
            revenue: 0,
            services: 0,
            parts: 0,
            serviceRevenue: 0,
            partsRevenue: 0
        };
        
        const dailyBreakdown = [];
        
        results.forEach(day => {
            totals.transactions += day.transactions || 0;
            totals.revenue += day.totalRevenue || 0;
            totals.services += day.servicesCompleted || 0;
            totals.serviceRevenue += day.serviceRevenue || 0;
            totals.partsRevenue += day.partsRevenue || 0;
            
            dailyBreakdown.push({
                date: day.day,
                transactions: day.dailyTransactions,
                revenue: day.dailyRevenue
            });
        });
        
        // Get parts count from the first row (it's the same for all rows)
        totals.parts = results.length > 0 ? results[0].partsSold : 0;
        
        // Format dates for response
        const formatDate = (date) => {
            return date.toISOString().split('T')[0];
        };
        
        const report = {
            title: "Weekly Summary",
            date: `${formatDate(weekStart)} - ${formatDate(weekEnd)}`,
            ...totals,
            dailyBreakdown
        };

        res.status(200).json({ success: true, data: report });
    });
});

router.get("/monthly", authenticateToken, authorizeRoles(["Admin"]), (req, res) => {
    const { year, month } = req.query; // Format: YYYY, MM (1-12)
    
    // Calculate start and end dates
    const now = new Date();
    const targetYear = year ? parseInt(year) : now.getFullYear();
    const targetMonth = month ? parseInt(month) - 1 : now.getMonth(); // JS months are 0-indexed
    
    const startOfMonth = new Date(targetYear, targetMonth, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

    // Main query for monthly summary
    const summaryQuery = `
        SELECT 
            COUNT(i.Invoice_ID) AS transactions,
            SUM(i.Total) AS totalRevenue,
            SUM(i.Labour_Cost) AS serviceRevenue,
            SUM(i.Parts_Cost) AS partsRevenue,
            COUNT(DISTINCT j.JobCardID) AS servicesCompleted,
            (SELECT COUNT(*) FROM Parts_Used pu 
             JOIN Invoice inv ON pu.InvoiceID = inv.Invoice_ID 
             WHERE inv.GeneratedDate BETWEEN ? AND ?) AS partsSold
        FROM Invoice i
        LEFT JOIN JobCards j ON i.JobCard_ID = j.JobCardID
        WHERE i.GeneratedDate BETWEEN ? AND ?
    `;
    
    // Query for weekly breakdown
    const weeklyQuery = `
        SELECT 
            WEEK(i.GeneratedDate) AS weekNumber,
            MIN(DATE(i.GeneratedDate)) AS weekStart,
            COUNT(i.Invoice_ID) AS transactions,
            SUM(i.Total) AS revenue
        FROM Invoice i
        WHERE i.GeneratedDate BETWEEN ? AND ?
        GROUP BY weekNumber
        ORDER BY weekNumber
    `;
    
    // Query for department breakdown
    const departmentQuery = `
        SELECT 
            CASE 
                WHEN j.Type = 'Maintenance' THEN 'Maintenance'
                WHEN j.Type = 'Repair' THEN 'Repairs'
                ELSE j.Type
            END AS department,
            COUNT(i.Invoice_ID) AS transactions,
            SUM(i.Total) AS revenue
        FROM Invoice i
        JOIN JobCards j ON i.JobCard_ID = j.JobCardID
        WHERE i.GeneratedDate BETWEEN ? AND ?
        GROUP BY department
        ORDER BY revenue DESC
    `;
    
    // Execute all queries in parallel
    Promise.all([
        new Promise((resolve, reject) => {
            db.query(summaryQuery, [startOfMonth, endOfMonth, startOfMonth, endOfMonth], (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        }),
        new Promise((resolve, reject) => {
            db.query(weeklyQuery, [startOfMonth, endOfMonth], (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        }),
        new Promise((resolve, reject) => {
            db.query(departmentQuery, [startOfMonth, endOfMonth], (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        })
    ])
    .then(([summaryResults, weeklyResults, departmentResults]) => {
        // Format the month name
        const monthNames = ["January", "February", "March", "April", "May", "June",
                           "July", "August", "September", "October", "November", "December"];
        
        // Build the response
        const report = {
            title: "Monthly Summary",
            date: `${monthNames[targetMonth]} ${targetYear}`,
            transactions: summaryResults[0].transactions || 0,
            revenue: summaryResults[0].totalRevenue || 0,
            services: summaryResults[0].servicesCompleted || 0,
            parts: summaryResults[0].partsSold || 0,
            serviceRevenue: summaryResults[0].serviceRevenue || 0,
            partsRevenue: summaryResults[0].partsRevenue || 0,
            weeklyBreakdown: weeklyResults,
            departmentBreakdown: departmentResults
        };
        
        res.status(200).json({ success: true, data: report });
    })
    .catch(err => {
        console.error("Error fetching monthly report:", err);
        res.status(500).json({ success: false, message: "Database error" });
    });
});

router.get("/:type/download", authenticateToken, authorizeRoles(["Admin"]), async (req, res) => {
  const { type } = req.params;
  const { startDate, endDate, department } = req.query;
  const employeeId = req.user.EmployeeID; // Get the employee ID from the authenticated user
  
  try {
    // Get report data based on type
    let reportData;
    let reportStartDate;
    let reportEndDate;
    
    if (type === 'daily') {
      const date = req.query.date || new Date().toISOString().split('T')[0];
      reportStartDate = date;
      reportData = await getDailyReport(date);
    } else if (type === 'weekly') {
      reportStartDate = req.query.startDate;
      if (!reportStartDate) {
        // Calculate default start date (Monday of current week)
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        reportStartDate = new Date(today.setDate(diff)).toISOString().split('T')[0];
      }
      
      // Calculate end date (start date + 6 days)
      const endDateObj = new Date(reportStartDate);
      endDateObj.setDate(endDateObj.getDate() + 6);
      reportEndDate = endDateObj.toISOString().split('T')[0];
      
      reportData = await getWeeklyReport(reportStartDate);
    } else if (type === 'monthly') {
      const year = req.query.year || new Date().getFullYear();
      const month = req.query.month || new Date().getMonth() + 1;
      
      // Calculate start and end dates for the month
      reportStartDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const endDateObj = new Date(year, month, 0); // Last day of month
      reportEndDate = endDateObj.toISOString().split('T')[0];
      
      reportData = await getMonthlyReport(year, month);
    } else if (type === 'custom') {
      if (!startDate || !endDate) {
        return res.status(400).json({ success: false, message: "Start and end dates are required for custom reports" });
      }
      reportStartDate = startDate;
      reportEndDate = endDate;
      reportData = await getCustomReport(startDate, endDate, department);
    } else {
      return res.status(400).json({ success: false, message: "Invalid report type" });
    }
    
    // Save report to database
    const reportId = await saveReportToDatabase(
      reportData, 
      type, 
      reportStartDate, 
      reportEndDate, 
      employeeId,
      department || 'All'
    );
    
    // Continue with PDF generation and download
    const tempPath = path.join(__dirname, '..', 'temp', `${type}_report_${Date.now()}.pdf`);
    await fs.ensureDir(path.dirname(tempPath));
    
    // Generate PDF
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(tempPath);
    
    doc.pipe(stream);
    
    // Add content to PDF
    generatePdfContent(doc, reportData, type);
    
    doc.end();
    
    // When the stream is finished, send the file
    stream.on('finish', () => {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${type}_report_${reportId}.pdf`);
      
      const fileStream = fs.createReadStream(tempPath);
      fileStream.pipe(res);
      
      // Delete the temp file after sending
      fileStream.on('end', () => {
        fs.unlink(tempPath).catch(err => console.error('Error deleting temp file:', err));
      });
    });
    
  } catch (error) {
    console.error(`Error generating ${type} report PDF:`, error);
    res.status(500).json({ success: false, message: "Failed to generate PDF report" });
  }
});

  // Helper function to generate PDF content
//   function generatePdfContent(doc, data, reportType) {
//     // Add logo and header
//     doc.fontSize(20).text('Auto Service Center', { align: 'center' });
//     doc.fontSize(16).text(`${data.title}`, { align: 'center' });
//     doc.fontSize(12).text(`${data.date}`, { align: 'center' });
//     doc.moveDown(2);
    
//     // Add summary section
//     doc.fontSize(14).text('Summary', { underline: true });
//     doc.moveDown(0.5);
//     doc.fontSize(10).text(`Transactions: ${data.transactions}`);
//     doc.fontSize(10).text(`Total Revenue: $${parseFloat(data.revenue).toLocaleString()}`);
//     doc.fontSize(10).text(`Services Completed: ${data.services}`);
//     doc.fontSize(10).text(`Parts Sold: ${data.parts}`);
//     doc.moveDown(1);
    
//     // Add breakdown sections based on report type
//     if (reportType === 'weekly' && data.dailyBreakdown) {
//       doc.fontSize(14).text('Daily Breakdown', { underline: true });
//       doc.moveDown(0.5);
      
//       data.dailyBreakdown.forEach(day => {
//         doc.fontSize(10).text(`${day.date}: $${parseFloat(day.revenue).toLocaleString()} (${day.transactions} transactions)`);
//       });
//     }
    
//     if (reportType === 'monthly') {
//       // Add weekly breakdown
//       if (data.weeklyBreakdown) {
//         doc.moveDown(1);
//         doc.fontSize(14).text('Weekly Breakdown', { underline: true });
//         doc.moveDown(0.5);
        
//         data.weeklyBreakdown.forEach(week => {
//           doc.fontSize(10).text(`Week of ${week.weekStart}: $${parseFloat(week.revenue).toLocaleString()} (${week.transactions} transactions)`);
//         });
//       }
      
//       // Add department breakdown
//       if (data.departmentBreakdown) {
//         doc.moveDown(1);
//         doc.fontSize(14).text('Department Breakdown', { underline: true });
//         doc.moveDown(0.5);
        
//         data.departmentBreakdown.forEach(dept => {
//           doc.fontSize(10).text(`${dept.department}: $${parseFloat(dept.revenue).toLocaleString()} (${dept.transactions} transactions)`);
//         });
//       }
//     }
    
//     // Add footer with date generated
//     const pageCount = doc.bufferedPageRange().count;
//     for (let i = 0; i < pageCount; i++) {
//       doc.switchToPage(i);
      
//       // Save the current position
//       const originalY = doc.y;
      
//       // Go to the bottom of the page
//       doc.page.margins.bottom = 0;
//       doc.y = doc.page.height - 50;
      
//       doc.fontSize(8).text(
//         `Generated on ${new Date().toLocaleString()} by ${data.generatedBy || 'Admin'}`,
//         { align: 'center' }
//       );
      
//       doc.text(`Page ${i + 1} of ${pageCount}`, { align: 'center' });
      
//       // Restore the position
//       doc.y = originalY;
//     }
//   }
  
  // Helper functions to get report data
  async function getDailyReport(date) {
    return new Promise((resolve, reject) => {
      const targetDate = date ? new Date(date) : new Date();
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
  
      const query = `
        SELECT 
            COUNT(i.Invoice_ID) AS transactions,
            SUM(i.Total) AS totalRevenue,
            SUM(i.Labour_Cost) AS serviceRevenue,
            SUM(i.Parts_Cost) AS partsRevenue,
            COUNT(DISTINCT j.JobCardID) AS servicesCompleted,
            (SELECT COUNT(*) FROM Parts_Used pu 
             JOIN Invoice inv ON pu.InvoiceID = inv.Invoice_ID 
             WHERE inv.GeneratedDate BETWEEN ? AND ?) AS partsSold
        FROM Invoice i
        LEFT JOIN JobCards j ON i.JobCard_ID = j.JobCardID
        WHERE i.GeneratedDate BETWEEN ? AND ?
      `;
      
      db.query(query, [startOfDay, endOfDay, startOfDay, endOfDay], (err, results) => {
        if (err) {
          reject(err);
          return;
        }
  
        // Format the response
        const report = {
          title: "Daily Summary",
          date: targetDate.toISOString().split('T')[0],
          transactions: results[0].transactions || 0,
          revenue: results[0].totalRevenue || 0,
          services: results[0].servicesCompleted || 0,
          parts: results[0].partsSold || 0,
          serviceRevenue: results[0].serviceRevenue || 0,
          partsRevenue: results[0].partsRevenue || 0,
          generatedBy: "Admin"
        };
  
        resolve(report);
      });
    });
  }

  async function getWeeklyReport(startDate) {
    return new Promise((resolve, reject) => {
      // Calculate start and end dates
      let weekStart;
      if (startDate) {
        weekStart = new Date(startDate);
      } else {
        // Default to current week (starting Monday)
        weekStart = new Date();
        const day = weekStart.getDay();
        const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
        weekStart = new Date(weekStart.setDate(diff));
      }
      
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
  
      // Modify your summaryQuery to ensure proper aggregation
 const summaryQuery = `
  SELECT 
      COUNT(i.Invoice_ID) AS transactions,
      SUM(i.Total) AS totalRevenue,
      SUM(i.Labour_Cost) AS serviceRevenue,
      SUM(i.Parts_Cost) AS partsRevenue,
      COUNT(DISTINCT j.JobCardID) AS servicesCompleted,
      (SELECT COUNT(*) FROM Parts_Used pu 
       JOIN Invoice inv ON pu.InvoiceID = inv.Invoice_ID 
       WHERE inv.GeneratedDate BETWEEN ? AND ?) AS partsSold
  FROM Invoice i
  LEFT JOIN JobCards j ON i.JobCard_ID = j.JobCardID
  WHERE i.GeneratedDate BETWEEN ? AND ?
`;

 

      
      const dailyBreakdownQuery = `
        SELECT 
            DATE(i.GeneratedDate) AS day,
            COUNT(i.Invoice_ID) AS dailyTransactions,
            SUM(i.Total) AS dailyRevenue
        FROM Invoice i
        WHERE i.GeneratedDate BETWEEN ? AND ?
        GROUP BY day
        ORDER BY day
      `;
      
      // Execute both queries in parallel
      Promise.all([
        new Promise((resolve, reject) => {
          db.query(summaryQuery, [weekStart, weekEnd, weekStart, weekEnd], (err, results) => {
            if (err) reject(err);
            else resolve(results);
          });
        }),
        new Promise((resolve, reject) => {
          db.query(dailyBreakdownQuery, [weekStart, weekEnd], (err, results) => {
            if (err) reject(err);
            else resolve(results);
          });
        })
      ])
      .then(([summaryResults, dailyResults]) => {
        // Format dates for response
        const formatDate = (date) => {
          return date.toISOString().split('T')[0];
        };
        
        const report = {
          title: "Weekly Summary",
          date: `${formatDate(weekStart)} - ${formatDate(weekEnd)}`,
          transactions: summaryResults[0]?.transactions || 0,
          revenue: summaryResults[0]?.totalRevenue || 0,
          services: summaryResults[0]?.servicesCompleted || 0,
          parts: summaryResults[0]?.partsSold || 0,
          serviceRevenue: summaryResults[0]?.serviceRevenue || 0,
          partsRevenue: summaryResults[0]?.partsRevenue || 0,
          dailyBreakdown: dailyResults.map(day => ({
            date: day.day,
            transactions: day.dailyTransactions || 0,
            revenue: day.dailyRevenue || 0
          })),
          generatedBy: "Admin"
        };
        
        resolve(report);
      })
      .catch(err => {
        reject(err);
      });
    });
  }
  
  async function getMonthlyReport(year, month) {
    return new Promise((resolve, reject) => {
      // Calculate start and end dates
      const now = new Date();
      const targetYear = year ? parseInt(year) : now.getFullYear();
      const targetMonth = month ? parseInt(month) - 1 : now.getMonth(); // JS months are 0-indexed
      
      const startOfMonth = new Date(targetYear, targetMonth, 1, 0, 0, 0, 0);
      const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);
  
      // Main query for monthly summary
      const summaryQuery = `
        SELECT 
            COUNT(i.Invoice_ID) AS transactions,
            SUM(i.Total) AS totalRevenue,
            SUM(i.Labour_Cost) AS serviceRevenue,
            SUM(i.Parts_Cost) AS partsRevenue,
            COUNT(DISTINCT j.JobCardID) AS servicesCompleted,
            (SELECT COUNT(*) FROM Parts_Used pu 
             JOIN Invoice inv ON pu.InvoiceID = inv.Invoice_ID 
             WHERE inv.GeneratedDate BETWEEN ? AND ?) AS partsSold
        FROM Invoice i
        LEFT JOIN JobCards j ON i.JobCard_ID = j.JobCardID
        WHERE i.GeneratedDate BETWEEN ? AND ?
      `;
      
      // Query for weekly breakdown
      const weeklyQuery = `
        SELECT 
            WEEK(i.GeneratedDate) AS weekNumber,
            MIN(DATE(i.GeneratedDate)) AS weekStart,
            COUNT(i.Invoice_ID) AS transactions,
            SUM(i.Total) AS revenue
        FROM Invoice i
        WHERE i.GeneratedDate BETWEEN ? AND ?
        GROUP BY weekNumber
        ORDER BY weekNumber
      `;
      
      // Query for department breakdown
      const departmentQuery = `
        SELECT 
            CASE 
                WHEN j.Type = 'Maintenance' THEN 'Maintenance'
                WHEN j.Type = 'Repair' THEN 'Repairs'
                ELSE j.Type
            END AS department,
            COUNT(i.Invoice_ID) AS transactions,
            SUM(i.Total) AS revenue
        FROM Invoice i
        JOIN JobCards j ON i.JobCard_ID = j.JobCardID
        WHERE i.GeneratedDate BETWEEN ? AND ?
        GROUP BY department
        ORDER BY revenue DESC
      `;
      
      // Execute all queries in parallel
      Promise.all([
        new Promise((resolve, reject) => {
          db.query(summaryQuery, [startOfMonth, endOfMonth, startOfMonth, endOfMonth], (err, results) => {
            if (err) reject(err);
            else resolve(results);
          });
        }),
        new Promise((resolve, reject) => {
          db.query(weeklyQuery, [startOfMonth, endOfMonth], (err, results) => {
            if (err) reject(err);
            else resolve(results);
          });
        }),
        new Promise((resolve, reject) => {
          db.query(departmentQuery, [startOfMonth, endOfMonth], (err, results) => {
            if (err) reject(err);
            else resolve(results);
          });
        })
      ])
      .then(([summaryResults, weeklyResults, departmentResults]) => {
        // Format the month name
        const monthNames = ["January", "February", "March", "April", "May", "June",
                           "July", "August", "September", "October", "November", "December"];
        
        // Build the response
        const report = {
          title: "Monthly Summary",
          date: `${monthNames[targetMonth]} ${targetYear}`,
          transactions: summaryResults[0]?.transactions || 0,
          revenue: summaryResults[0]?.totalRevenue || 0,
          services: summaryResults[0]?.servicesCompleted || 0,
          parts: summaryResults[0]?.partsSold || 0,
          serviceRevenue: summaryResults[0]?.serviceRevenue || 0,
          partsRevenue: summaryResults[0]?.partsRevenue || 0,
          weeklyBreakdown: weeklyResults.map(week => ({
            weekNumber: week.weekNumber,
            weekStart: week.weekStart,
            transactions: week.transactions || 0,
            revenue: week.revenue || 0
          })),
          departmentBreakdown: departmentResults.map(dept => ({
            department: dept.department,
            transactions: dept.transactions || 0,
            revenue: dept.revenue || 0
          })),
          generatedBy: "Admin"
        };
        
        resolve(report);
      })
      .catch(err => {
        reject(err);
      });
    });
  }

async function saveReportToDatabase(reportData, type, startDate, endDate, employeeId, department = 'All') {
    return new Promise((resolve, reject) => {
      try {
        // Generate a unique report ID
        const date = new Date();
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
        
        // Get the count of reports generated today
        const countQuery = `
          SELECT COUNT(*) as count 
          FROM Reports 
          WHERE DATE(GeneratedDate) = CURDATE()
        `;
        
        db.query(countQuery, [], (err, countResult) => {
          if (err) {
            console.error("Error counting reports:", err);
            reject(err);
            return;
          }
          
          const count = countResult[0].count + 1;
          const reportId = `REP-${dateStr}-${count.toString().padStart(2, '0')}`;
          
          // Determine end date if not provided (for daily reports)
          let reportEndDate = endDate;
          if (!reportEndDate && type === 'daily') {
            reportEndDate = startDate; // For daily reports, end date is same as start date
          }
          
          // Insert the report
          const insertQuery = `
            INSERT INTO Reports (
              ReportID, ReportType, StartDate, EndDate, Department,
              Transactions, Revenue, ServicesCompleted, PartsSold,
              ServiceRevenue, PartsRevenue, GeneratedBy, ReportData
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          
          const params = [
            reportId,
            type.charAt(0).toUpperCase() + type.slice(1), // Capitalize first letter
            startDate,
            reportEndDate,
            department,
            reportData.transactions || 0,
            reportData.revenue || 0,
            reportData.services || 0,
            reportData.parts || 0,
            reportData.serviceRevenue || 0,
            reportData.partsRevenue || 0,
            employeeId,
            JSON.stringify(reportData)
          ];
          
          db.query(insertQuery, params, (err, result) => {
            if (err) {
              console.error("Error saving report:", err);
              reject(err);
              return;
            }
            
            resolve(reportId);
          });
        });
      } catch (error) {
        console.error("Error in saveReportToDatabase:", error);
        reject(error);
      }
    });
  }

  router.get("/", authenticateToken, authorizeRoles(["Admin"]), async (req, res) => {
    try {
      // Optional query parameters for filtering
      const { reportType, startDate, endDate, department } = req.query;
      
      // Build the query with optional filters
      let query = "SELECT * FROM Reports";
      const queryParams = [];
      
      // Add WHERE clause if filters are provided
      const conditions = [];
      
      if (reportType) {
        conditions.push("ReportType = ?");
        queryParams.push(reportType);
      }
      
      if (startDate) {
        conditions.push("StartDate >= ?");
        queryParams.push(startDate);
      }
      
      if (endDate) {
        conditions.push("EndDate <= ?");
        queryParams.push(endDate);
      }
      
      if (department && department !== 'All') {
        conditions.push("Department = ?");
        queryParams.push(department);
      }
      
      if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
      }
      
      // Add ordering
      query += " ORDER BY GeneratedDate DESC";
      
      // Execute the query
      db.query(query, queryParams, (err, results) => {
        if (err) {
          console.error("Error fetching reports:", err);
          return res.status(500).json({ 
            success: false, 
            message: "Database error", 
            error: err.message 
          });
        }
        
        // Process the results to format the report data
        const reports = results.map(report => {
          // Parse the JSON data if it exists
          let reportData = null;
if (report.ReportData) {
  try {
    // Check if it's already an object
    if (typeof report.ReportData === 'object') {
      reportData = report.ReportData;
    } else {
      // Only parse if it's a string
      reportData = JSON.parse(report.ReportData);
    }
  } catch (e) {
    console.error(`Error parsing report data for ${report.ReportID}:`, e);
  }
}

          return {
            id: report.ReportID,
            type: report.ReportType,
            startDate: report.StartDate,
            endDate: report.EndDate,
            department: report.Department,
            transactions: report.Transactions,
            revenue: report.Revenue,
            services: report.ServicesCompleted,
            parts: report.PartsSold,
            serviceRevenue: report.ServiceRevenue,
            partsRevenue: report.PartsRevenue,
            generatedBy: report.GeneratedBy,
            generatedDate: report.GeneratedDate,
            data: reportData // Include the detailed data if needed
          };
        });
        
        res.status(200).json({
          success: true,
          count: reports.length,
          reports: reports
        });
      });
    } catch (error) {
      console.error("Error in fetch reports API:", error);
      res.status(500).json({ 
        success: false, 
        message: "Server error", 
        error: error.message 
      });
    }
  });

  router.get("/service-distribution", authenticateToken, authorizeRoles(["Admin"]), (req, res) => {
    // Query to get the count of finished services grouped by description
    const query = `
      SELECT 
        Description, 
        COUNT(*) as count,
        (COUNT(*) * 100.0 / (SELECT COUNT(*) FROM ServiceRecords WHERE Status = 'Finished')) as percentage
      FROM 
        ServiceRecords
      WHERE 
        Status = 'Finished'
      GROUP BY 
        Description
      ORDER BY 
        count DESC
    `;
  
    db.query(query, (err, results) => {
      if (err) {
        console.error("Error fetching service distribution:", err);
        return res.status(500).json({ 
          success: false, 
          message: "Error fetching service distribution data",
          error: err
        });
      }
  
      // Format the results for the pie chart
      const formattedResults = results.map(item => ({
        name: item.Description,
        value: Number.isFinite(Number(item.percentage)) ? parseFloat(Number(item.percentage).toFixed(1)) : 0

      }));
  
      // If there are more than 5 services, group the smallest ones as "Other"
      let pieChartData = formattedResults;
      if (formattedResults.length > 5) {
        // Sort by percentage (descending)
        const sortedData = [...formattedResults].sort((a, b) => b.value - a.value);
        
        // Take top 5 services
        const topServices = sortedData.slice(0, 5);
        
        // Calculate "Other" percentage
        const otherPercentage = sortedData.slice(5).reduce((sum, item) => sum + item.value, 0);
        
        // Create final data with "Other" category
        pieChartData = [
          ...topServices,
          { name: "Other", value: parseFloat(otherPercentage.toFixed(1)) }
        ];
      }
  
      return res.status(200).json({
        success: true,
        serviceDistribution: pieChartData
      });
    });
  });


router.get("/department-revenue", authenticateToken, authorizeRoles(["Admin"]), (req, res) => {
    const query = `
      SELECT 
        jc.Type AS department,
        SUM(i.Total) AS revenue
      FROM Invoice i
      INNER JOIN JobCards jc ON i.JobCard_ID = jc.JobCardID
      WHERE i.PaidStatus = 'Paid'
      GROUP BY jc.Type
      ORDER BY revenue DESC
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching department revenue:", err);
            return res.status(500).json({
                success: false,
                message: "Error fetching department revenue"
            });
        }

        // Convert revenue to numbers and ensure proper formatting
        const departmentRevenue = results.map(row => ({
            department: row.department || "Unknown",
            revenue: parseFloat(row.revenue) || 0
        }));

        console.log("Sending department revenue data:", departmentRevenue); // Add this log

        return res.status(200).json({
            success: true,
            departmentRevenue: departmentRevenue
        });
    });
});
  router.get("/today-sales", authenticateToken, authorizeRoles(["Cashier"]), (req, res) => {
    // Get current date (May 6, 2025)
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    // Format dates for MySQL query (YYYY-MM-DD HH:MM:SS)
    const startDateFormatted = startOfDay.toISOString().slice(0, 19).replace('T', ' ');
    const endDateFormatted = endOfDay.toISOString().slice(0, 19).replace('T', ' ');
    
    // Query to get sum of total sales for today where PaidStatus is 'Paid'
    const query = `
      SELECT SUM(Total) as todaySales
      FROM Invoice
      WHERE GeneratedDate BETWEEN ? AND ?
      AND PaidStatus = 'Paid'
    `;
    
    db.query(query, [startDateFormatted, endDateFormatted], (err, results) => {
      if (err) {
        console.error("Error fetching today's sales:", err);
        return res.status(500).json({
          success: false,
          message: "Database error while fetching sales data",
          error: err
        });
      }
      
      // Extract the total sales amount (handle null case if no sales)
      const todaySales = results[0].todaySales || 0;
      
      return res.status(200).json({
        success: true,
        date: today.toISOString().split('T')[0],
        todaySales
      });
    });
  });
  
  
  router.get("/unpaid-invoices", authenticateToken, authorizeRoles(["Cashier"]), (req, res) => {
    // Query to get count of invoices where PaidStatus is not 'Paid'
    const query = `
      SELECT COUNT(*) as unpaidCount
      FROM Invoice
      WHERE PaidStatus != 'Paid'
    `;
    
    db.query(query, (err, results) => {
      if (err) {
        console.error("Error fetching unpaid invoices count:", err);
        return res.status(500).json({
          success: false,
          message: "Database error while fetching unpaid invoices data",
          error: err
        });
      }
      
      // Extract the unpaid count
      const unpaidCount = results[0].unpaidCount || 0;
      
      return res.status(200).json({
        success: true,
        unpaidCount
      });
    });
  });
  
  router.get("/payment-methods-stats", authenticateToken, authorizeRoles(["Cashier"]), (req, res) => {
    // Query to get count of invoices by payment method
    const query = `
      SELECT 
        PaymentMethod,
        COUNT(*) as count,
        SUM(Total) as amount
      FROM Invoice
      WHERE PaidStatus = 'Paid'
      GROUP BY PaymentMethod
    `;
    
    db.query(query, (err, results) => {
      if (err) {
        console.error("Error fetching payment methods stats:", err);
        return res.status(500).json({
          success: false,
          message: "Database error while fetching payment methods data",
          error: err
        });
      }
      
      // Format the results
      const paymentStats = {
        cash: {
          count: 0,
          amount: 0
        },
        payhere: {
          count: 0,
          amount: 0
        },
        other: {
          count: 0,
          amount: 0
        }
      };
      
      results.forEach(result => {
        if (result.PaymentMethod === 'Cash') {
          paymentStats.cash.count = result.count;
          paymentStats.cash.amount = parseFloat(result.amount) || 0;
        } else if (result.PaymentMethod === 'PayHere') {
          paymentStats.payhere.count = result.count;
          paymentStats.payhere.amount = parseFloat(result.amount) || 0;
        } else {
          paymentStats.other.count += result.count;
          paymentStats.other.amount += parseFloat(result.amount) || 0;
        }
      });
      
      return res.status(200).json({
        success: true,
        paymentStats
      });
    });
  });
  
  router.get("/today-transactions", authenticateToken, authorizeRoles(["Cashier"]), (req, res) => {
    // Get current date (May 6, 2025)
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    // Format dates for MySQL query
    const startDateFormatted = startOfDay.toISOString().slice(0, 19).replace('T', ' ');
    const endDateFormatted = endOfDay.toISOString().slice(0, 19).replace('T', ' ');
    
    // Query to get count of today's transactions
    const query = `
      SELECT COUNT(*) as todayTransactions
      FROM Invoice
      WHERE GeneratedDate BETWEEN ? AND ?
    `;
    
    db.query(query, [startDateFormatted, endDateFormatted], (err, results) => {
      if (err) {
        console.error("Error fetching today's transactions:", err);
        return res.status(500).json({
          success: false,
          message: "Database error while fetching transaction data",
          error: err
        });
      }
      
      // Extract the transaction count
      const todayTransactions = results[0].todayTransactions || 0;
      
      return res.status(200).json({
        success: true,
        date: today.toISOString().split('T')[0],
        todayTransactions
      });
    });
  });

  router.get("/recent-transactions", authenticateToken, authorizeRoles(["Cashier"]), (req, res) => {
    // Get current date (May 6, 2025)
    const today = new Date();
    
    // Query to get the 5 most recent transactions with customer and service details
    const query = `
      SELECT 
        i.Invoice_ID as id,
        CONCAT(c.FirstName, ' ', c.SecondName) as customer,
        sr.Description as service,
        i.Total as amount,
        TIME_FORMAT(TIME(i.GeneratedDate), '%H:%i') as time,
        i.PaidStatus as status,
        i.PaymentMethod as paymentMethod
      FROM Invoice i
      JOIN JobCards j ON i.JobCard_ID = j.JobCardID
      JOIN Appointments a ON j.AppointmentID = a.AppointmentID
      JOIN Customers c ON a.CustomerID = c.CustomerID
      JOIN ServiceRecords sr ON sr.JobCardID = j.JobCardID
      ORDER BY i.GeneratedDate DESC
      LIMIT 5
    `;
    
    db.query(query, (err, results) => {
      if (err) {
        console.error("Error fetching recent transactions:", err);
        return res.status(500).json({
          success: false,
          message: "Database error while fetching recent transactions",
          error: err
        });
      }
      
      return res.status(200).json({
        success: true,
        recentTransactions: results
      });
    });
  });
  

  router.get("/monthly-service-records", authenticateToken, authorizeRoles(["Admin"]), (req, res) => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    const query = `
        SELECT 
            COUNT(jc.JobCardID) AS serviceCount,
            (
                SELECT COUNT(jc2.JobCardID) 
                FROM JobCards jc2
                JOIN Appointments a2 ON jc2.AppointmentID = a2.AppointmentID
                WHERE jc2.Status = 'Finished'
                AND a2.Date BETWEEN 
                    DATE_SUB(?, INTERVAL 1 MONTH) 
                    AND DATE_SUB(?, INTERVAL 1 MONTH)
            ) AS lastMonthCount
        FROM JobCards jc
        JOIN Appointments a ON jc.AppointmentID = a.AppointmentID
        WHERE jc.Status IN ('Finished','Paid')
        AND a.Date BETWEEN ? AND ?
    `;

    db.query(query, [startOfMonth, endOfMonth, startOfMonth, endOfMonth], (err, results) => {
        if (err) {
            console.error("Error fetching monthly service records:", err);
            return res.status(500).json({ 
                success: false,
                message: "Database error" 
            });
        }

        const currentCount = results[0]?.serviceCount || 0;
        const lastMonthCount = results[0]?.lastMonthCount || 0;
        
        // Calculate growth percentage
        let growthPercentage = 0;
        if (lastMonthCount > 0) {
            growthPercentage = ((currentCount - lastMonthCount) / lastMonthCount) * 100;
        } else if (currentCount > 0) {
            growthPercentage = 100; // Infinite growth from 0
        }

        res.status(200).json({ 
            success: true,
            serviceCount: currentCount,
            growthPercentage: parseFloat(growthPercentage.toFixed(2)) 
        });
    });
});



router.get("/custom", authenticateToken, authorizeRoles(["Admin"]), (req, res) => {
    const { startDate, endDate, department } = req.query;
    
    // Validate required parameters
    if (!startDate || !endDate) {
        return res.status(400).json({ 
            success: false, 
            message: "Both startDate and endDate parameters are required" 
        });
    }

    // Parse dates and validate
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime())) {
        return res.status(400).json({ 
            success: false, 
            message: "Invalid startDate format. Use YYYY-MM-DD" 
        });
    }
    
    if (isNaN(end.getTime())) {
        return res.status(400).json({ 
            success: false, 
            message: "Invalid endDate format. Use YYYY-MM-DD" 
        });
    }
    
    // Set time to beginning of start date and end of end date
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    // Base query with optional department filter
    let baseQuery = `
        FROM Invoice i
        LEFT JOIN JobCards j ON i.JobCard_ID = j.JobCardID
        WHERE i.GeneratedDate BETWEEN ? AND ?
    `;
    
    if (department && department !== 'All') {
        baseQuery += ` AND j.Type = ?`;
    }

    // Main summary query
    const summaryQuery = `
        SELECT 
            COUNT(i.Invoice_ID) AS transactions,
            SUM(i.Total) AS totalRevenue,
            SUM(i.Labour_Cost) AS serviceRevenue,
            SUM(i.Parts_Cost) AS partsRevenue,
            COUNT(DISTINCT j.JobCardID) AS servicesCompleted,
            (SELECT COUNT(*) FROM Parts_Used pu 
             JOIN Invoice inv ON pu.InvoiceID = inv.Invoice_ID 
             WHERE inv.GeneratedDate BETWEEN ? AND ?) AS partsSold
        ${baseQuery}
    `;

    // Daily breakdown query
    const dailyQuery = `
        SELECT 
            DATE(i.GeneratedDate) AS day,
            COUNT(i.Invoice_ID) AS transactions,
            SUM(i.Total) AS revenue
        ${baseQuery}
        GROUP BY day
        ORDER BY day
    `;

    // Department breakdown query
    const departmentQuery = `
        SELECT 
            CASE 
                WHEN j.Type = 'Maintenance' THEN 'Maintenance'
                WHEN j.Type = 'Repair' THEN 'Repairs'
                ELSE j.Type
            END AS department,
            COUNT(i.Invoice_ID) AS transactions,
            SUM(i.Total) AS revenue
        ${baseQuery}
        GROUP BY department
        ORDER BY revenue DESC
    `;

    // Prepare query parameters
    const params = [start, end];
    const paramsWithDept = department && department !== 'All' 
        ? [...params, department] 
        : params;

    // Execute all queries in parallel
    Promise.all([
        new Promise((resolve, reject) => {
            db.query(summaryQuery, [...params, ...params], (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        }),
        new Promise((resolve, reject) => {
            db.query(dailyQuery, paramsWithDept, (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        }),
        new Promise((resolve, reject) => {
            db.query(departmentQuery, paramsWithDept, (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        })
    ])
    .then(([summaryResults, dailyResults, departmentResults]) => {
        // Format dates for display
        const formatDate = (date) => {
            return date.toISOString().split('T')[0];
        };

        // Build the response
        const report = {
            title: "Custom Report",
            dateRange: `${formatDate(start)} to ${formatDate(end)}`,
            department: department || 'All',
            transactions: summaryResults[0]?.transactions || 0,
            revenue: summaryResults[0]?.totalRevenue || 0,
            services: summaryResults[0]?.servicesCompleted || 0,
            parts: summaryResults[0]?.partsSold || 0,
            serviceRevenue: summaryResults[0]?.serviceRevenue || 0,
            partsRevenue: summaryResults[0]?.partsRevenue || 0,
            dailyBreakdown: dailyResults.map(day => ({
                date: day.day,
                transactions: day.transactions || 0,
                revenue: day.revenue || 0
            })),
            departmentBreakdown: departmentResults.map(dept => ({
                department: dept.department,
                transactions: dept.transactions || 0,
                revenue: dept.revenue || 0
            }))
        };

        res.status(200).json({ success: true, data: report });
    })
    .catch(err => {
        console.error("Error fetching custom report:", err);
        res.status(500).json({ 
            success: false, 
            message: "Database error",
            error: err.message 
        });
    });
});

router.get("/top-five-services", authenticateToken, authorizeRoles(["Cashier"]), (req, res) => {
    const query = `
        SELECT 
            sr.Description AS name,
            COUNT(sr.ServiceRecord_ID) AS count
        FROM ServiceRecords sr
        JOIN JobCards jc ON sr.JobCardID = jc.JobCardID
        WHERE jc.Status IN ('Finished', 'Paid')
        GROUP BY sr.Description
        ORDER BY count DESC
        LIMIT 5
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching top services:", err);
            return res.status(500).json({ 
                success: false,
                message: "Database error" 
            });
        }

        res.status(200).json({ 
            success: true,
            topServices: results // Now each item has { name, count }
        });
    });
});

  

  
  
  










module.exports = router;
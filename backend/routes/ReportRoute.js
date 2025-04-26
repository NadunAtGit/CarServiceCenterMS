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
    
    try {
      // Get report data based on type
      let reportData;
      
      if (type === 'daily') {
        const date = req.query.date || new Date().toISOString().split('T')[0];
        const dailyReport = await getDailyReport(date);
        reportData = dailyReport;
      } else if (type === 'weekly') {
        const weekStart = req.query.startDate;
        const weeklyReport = await getWeeklyReport(weekStart);
        reportData = weeklyReport;
      } else if (type === 'monthly') {
        const year = req.query.year || new Date().getFullYear();
        const month = req.query.month || new Date().getMonth() + 1;
        const monthlyReport = await getMonthlyReport(year, month);
        reportData = monthlyReport;
      } else if (type === 'custom') {
        if (!startDate || !endDate) {
          return res.status(400).json({ success: false, message: "Start and end dates are required for custom reports" });
        }
        const customReport = await getCustomReport(startDate, endDate, department);
        reportData = customReport;
      } else {
        return res.status(400).json({ success: false, message: "Invalid report type" });
      }
      
      // Create a temporary file path
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
        res.setHeader('Content-Disposition', `attachment; filename=${type}_report.pdf`);
        
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
  
  6
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
  










module.exports = router;
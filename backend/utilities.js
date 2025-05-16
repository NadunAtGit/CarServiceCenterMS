const jwt = require("jsonwebtoken");
const path = require('path');
const PDFTable = require('pdfkit-table');

// Middleware to authenticate token
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    console.log("Token is missing");
    return res.status(401).json({ message: "Unauthorized: Token is missing" });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      console.log("Token verification failed: ", err);
      return res.status(403).json({ message: "Forbidden: Invalid token" });
    }

    if (!user.email) {
      console.log("Email is missing in the token payload");
      return res.status(403).json({ message: "Forbidden: Email is required" });
    }

    req.user = user; // Attach user to request object for further validation
    next();
  });
}

// Middleware to check roles and email
function authorizeRoles(allowedRoles) {
  return (req, res, next) => {
    const user = req.user;

    if (!user || !allowedRoles.includes(user.role)) {
      console.log("Access denied: Insufficient permissions");
      return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
    }

    if (!user.email) {
      console.log("Access denied: Email not provided");
      return res.status(403).json({ message: "Forbidden: Email is required for access" });
    }

    next();
  };
}



function generatePdfContent(doc, data, reportType) {
  // Set initial cursor position
  const initialY = doc.y;
  
  // Add logo in top left
  const logoPath = path.join(__dirname, '../backend/Assets/logo.png');
  console.log('Attempting to load logo from:', logoPath)
  try {
    doc.image(logoPath, {
      x: 50,
      y: initialY,
      fit: [150, 80]
    });
  } catch (error) {
    console.error('Error loading logo:', error);
    // Continue without the logo if there's an error
  }
  
  // Move cursor to the right of where the logo would be
  doc.x = 200;
  doc.y = initialY;
  
  // Add header text to the right of the logo
  doc.fontSize(20).text('Rukmal Motors', { align: 'right' });
  doc.fontSize(12).text('No 562/A/1 Jayanthi Mawatha Anuradapura', { align: 'right' });
  doc.fontSize(10).text('0252223845, 0252225500, 0716894545, 0702600800', { align: 'right' });
  doc.moveDown(3);
  doc.fontSize(16).text(`${data.title}`, { align: 'right' });
  doc.fontSize(12).text(`${data.date}`, { align: 'right' });
  
  // Reset position for the rest of the content
  doc.x = 50;
  doc.y = initialY + 120; // Move down past the logo/header area
  doc.moveDown(5);
  
  // Add summary section
  doc.fontSize(14).text('Summary', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10).text(`Transactions: ${data.transactions}`);
  doc.fontSize(10).text(`Total Revenue: $${parseFloat(data.revenue).toLocaleString()}`);
  doc.fontSize(10).text(`Services Completed: ${data.services}`);
  doc.fontSize(10).text(`Parts Sold: ${data.parts}`);
  doc.moveDown(1);
  
  // Add breakdown sections based on report type
  if (reportType === 'weekly' && data.dailyBreakdown && data.dailyBreakdown.length > 0) {
    doc.fontSize(14).text('Daily Breakdown', { underline: true });
    doc.moveDown(0.5);
    
    // Create a simple table manually
    const tableTop = doc.y;
    const tableLeft = 50;
    const colWidths = [150, 100, 150];
    const rowHeight = 20;
    
    // Draw table headers
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('Date', tableLeft, tableTop);
    doc.text('Transactions', tableLeft + colWidths[0], tableTop);
    doc.text('Revenue', tableLeft + colWidths[0] + colWidths[1], tableTop);
    
    // Draw header line
    doc.moveTo(tableLeft, tableTop + 15)
       .lineTo(tableLeft + colWidths[0] + colWidths[1] + colWidths[2], tableTop + 15)
       .stroke();
    
    // Draw table rows
    doc.font('Helvetica').fontSize(10);
    let currentY = tableTop + 25;
    
    data.dailyBreakdown.forEach((day, index) => {
      // Format the date for better readability
      let formattedDate;
      try {
        const dateObj = new Date(day.date);
        formattedDate = dateObj.toLocaleDateString();
      } catch (e) {
        formattedDate = day.date; // Use as-is if parsing fails
      }
      
      doc.text(formattedDate, tableLeft, currentY);
      doc.text(day.transactions.toString(), tableLeft + colWidths[0], currentY);
      doc.text(`$${parseFloat(day.revenue).toLocaleString()}`, tableLeft + colWidths[0] + colWidths[1], currentY);
      
      currentY += rowHeight;
    });
    
    // Draw bottom line
    doc.moveTo(tableLeft, currentY)
       .lineTo(tableLeft + colWidths[0] + colWidths[1] + colWidths[2], currentY)
       .stroke();
    
    // Update the cursor position
    doc.y = currentY + 10;
  }
  
  if (reportType === 'monthly') {
    // Add weekly breakdown
    if (data.weeklyBreakdown && data.weeklyBreakdown.length > 0) {
      doc.moveDown(1);
      doc.fontSize(14).text('Weekly Breakdown', { underline: true });
      doc.moveDown(0.5);
      
      // Create a simple table for weekly breakdown
      const tableTop = doc.y;
      const tableLeft = 50;
      const colWidths = [150, 100, 150];
      const rowHeight = 20;
      
      // Draw table headers
      doc.font('Helvetica-Bold').fontSize(10);
      doc.text('Week', tableLeft, tableTop);
      doc.text('Transactions', tableLeft + colWidths[0], tableTop);
      doc.text('Revenue', tableLeft + colWidths[0] + colWidths[1], tableTop);
      
      // Draw header line
      doc.moveTo(tableLeft, tableTop + 15)
         .lineTo(tableLeft + colWidths[0] + colWidths[1] + colWidths[2], tableTop + 15)
         .stroke();
      
      // Draw table rows
      doc.font('Helvetica').fontSize(10);
      let currentY = tableTop + 25;
      
      data.weeklyBreakdown.forEach((week, index) => {
        doc.text(`Week of ${week.weekStart}`, tableLeft, currentY);
        doc.text(week.transactions.toString(), tableLeft + colWidths[0], currentY);
        doc.text(`$${parseFloat(week.revenue).toLocaleString()}`, tableLeft + colWidths[0] + colWidths[1], currentY);
        
        currentY += rowHeight;
      });
      
      // Draw bottom line
      doc.moveTo(tableLeft, currentY)
         .lineTo(tableLeft + colWidths[0] + colWidths[1] + colWidths[2], currentY)
         .stroke();
      
      // Update the cursor position
      doc.y = currentY + 10;
    }
    
    // Add department breakdown
    if (data.departmentBreakdown && data.departmentBreakdown.length > 0) {
      doc.moveDown(1);
      doc.fontSize(14).text('Department Breakdown', { underline: true });
      doc.moveDown(0.5);
      
      // Create a simple table for department breakdown
      const tableTop = doc.y;
      const tableLeft = 50;
      const colWidths = [150, 100, 150];
      const rowHeight = 20;
      
      // Draw table headers
      doc.font('Helvetica-Bold').fontSize(10);
      doc.text('Department', tableLeft, tableTop);
      doc.text('Transactions', tableLeft + colWidths[0], tableTop);
      doc.text('Revenue', tableLeft + colWidths[0] + colWidths[1], tableTop);
      
      // Draw header line
      doc.moveTo(tableLeft, tableTop + 15)
         .lineTo(tableLeft + colWidths[0] + colWidths[1] + colWidths[2], tableTop + 15)
         .stroke();
      
      // Draw table rows
      doc.font('Helvetica').fontSize(10);
      let currentY = tableTop + 25;
      
      data.departmentBreakdown.forEach((dept, index) => {
        doc.text(dept.department, tableLeft, currentY);
        doc.text(dept.transactions.toString(), tableLeft + colWidths[0], currentY);
        doc.text(`$${parseFloat(dept.revenue).toLocaleString()}`, tableLeft + colWidths[0] + colWidths[1], currentY);
        
        currentY += rowHeight;
      });
      
      // Draw bottom line
      doc.moveTo(tableLeft, currentY)
         .lineTo(tableLeft + colWidths[0] + colWidths[1] + colWidths[2], currentY)
         .stroke();
      
      // Update the cursor position
      doc.y = currentY + 10;
    }
  }
  
  // Add footer with date generated
  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    
    // Save the current position
    const originalY = doc.y;
    
    // Go to the bottom of the page
    doc.page.margins.bottom = 0;
    doc.y = doc.page.height - 50;
    
    doc.fontSize(8).text(
      `Generated on ${new Date().toLocaleString()} by ${data.generatedBy || 'Admin'}`,
      { align: 'center' }
    );
    
    doc.text(`Page ${i + 1} of ${pageCount}`, { align: 'center' });
    
    // Restore the position
    doc.y = originalY;
  }
}







module.exports = {
  authenticateToken,
  authorizeRoles,
  generatePdfContent
};

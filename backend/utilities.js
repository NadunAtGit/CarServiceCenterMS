const jwt = require("jsonwebtoken");

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
  // Add logo and header
  doc.fontSize(20).text('Rukmal Motors', { align: 'center' });
  doc.fontSize(16).text(`${data.title}`, { align: 'center' });
  doc.fontSize(12).text(`${data.date}`, { align: 'center' });
  doc.moveDown(2);
  
  // Add summary section
  doc.fontSize(14).text('Summary', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10).text(`Transactions: ${data.transactions}`);
  doc.fontSize(10).text(`Total Revenue: $${parseFloat(data.revenue).toLocaleString()}`);
  doc.fontSize(10).text(`Services Completed: ${data.services}`);
  doc.fontSize(10).text(`Parts Sold: ${data.parts}`);
  doc.moveDown(1);
  
  // Add breakdown sections based on report type
  if (reportType === 'weekly' && data.dailyBreakdown) {
    doc.fontSize(14).text('Daily Breakdown', { underline: true });
    doc.moveDown(0.5);
    
    data.dailyBreakdown.forEach(day => {
      doc.fontSize(10).text(`${day.date}: $${parseFloat(day.revenue).toLocaleString()} (${day.transactions} transactions)`);
    });
  }
  
  if (reportType === 'monthly') {
    // Add weekly breakdown
    if (data.weeklyBreakdown) {
      doc.moveDown(1);
      doc.fontSize(14).text('Weekly Breakdown', { underline: true });
      doc.moveDown(0.5);
      
      data.weeklyBreakdown.forEach(week => {
        doc.fontSize(10).text(`Week of ${week.weekStart}: $${parseFloat(week.revenue).toLocaleString()} (${week.transactions} transactions)`);
      });
    }
    
    // Add department breakdown
    if (data.departmentBreakdown) {
      doc.moveDown(1);
      doc.fontSize(14).text('Department Breakdown', { underline: true });
      doc.moveDown(0.5);
      
      data.departmentBreakdown.forEach(dept => {
        doc.fontSize(10).text(`${dept.department}: $${parseFloat(dept.revenue).toLocaleString()} (${dept.transactions} transactions)`);
      });
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

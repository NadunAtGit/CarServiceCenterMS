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

module.exports = {
  authenticateToken,
  authorizeRoles,
};

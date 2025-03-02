const multer = require("multer");

// Store files in memory before uploading to Firebase
const storage = multer.memoryStorage();
const upload = multer({ storage });

module.exports = upload;

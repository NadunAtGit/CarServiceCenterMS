const admin = require("firebase-admin");
const path = require("path");

// Load Firebase service account credentials
const serviceAccount = require("./sdp-project-939bd-firebase-adminsdk-fbsvc-f974a8e998.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "sdp-project-939bd.firebasestorage.app", // Change this to your Firebase Storage bucket
});

const bucket = admin.storage().bucket();

module.exports = bucket;

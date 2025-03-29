const admin = require("firebase-admin");
const path = require("path");

// Load Firebase service account credentials
const serviceAccount = require("./sdp-project-939bd-firebase-adminsdk-fbsvc-f974a8e998.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "sdp-project-939bd.firebasestorage.app", // Firebase Storage bucket
});

const bucket = admin.storage().bucket();

// Firebase Messaging initialization
const messaging = admin.messaging();

module.exports = { bucket, messaging };

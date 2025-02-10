const express = require("express");
const db = require("../db");
const {generateAppointmentId} = require("../GenerateId");
const { validateEmail, validatePhoneNumber } = require("../validations");
const{authenticateToken}=require("../utilities")

const router = express.Router();

router.use((req, res, next) => {
    console.log("Appointment Route Hit:", req.method, req.url);
    next();
});


router.post("/make-appointment", authenticateToken, async (req, res) => {
    const { customerId } = req.user; // Get the customerId from the token
    const { Date, Time, VehicleNo } = req.body; // Get the data from the request body

    // Check if all required fields are provided
    if (!Date || !Time || !VehicleNo) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        // Step 1: Check if the vehicle number belongs to the logged-in user
        const vehicleQuery = "SELECT * FROM Vehicles WHERE VehicleNo = ? AND CustomerID = ?";
        const vehicleResult = await new Promise((resolve, reject) => {
            db.query(vehicleQuery, [VehicleNo, customerId], (err, result) => {
                if (err) {
                    console.error("Error checking vehicle:", err);
                    return reject(err);
                }
                resolve(result);
            });
        });

        // If the vehicle does not belong to the logged-in user
        if (vehicleResult.length === 0) {
            return res.status(400).json({ error: "Vehicle does not belong to the logged-in user" });
        }

        // Step 2: Generate a new appointment ID
        const AppointmentID = await generateAppointmentId();

        // Step 3: Insert the new appointment into the Appointments table
        const appointmentQuery =
            "INSERT INTO Appointments (AppointmentID, CustomerID, VehicleID, Date, Time, Status, AppointmentMadeDate) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)";
        const appointmentValues = [AppointmentID, customerId, VehicleNo, Date, Time, "Not Confirmed"];

        await new Promise((resolve, reject) => {
            db.query(appointmentQuery, appointmentValues, (err, result) => {
                if (err) {
                    console.error("Error inserting appointment:", err);
                    return reject(err);
                }
                resolve(result);
            });
        });

        res.status(201).json({
            success: true,
            message: "Appointment created successfully!",
            AppointmentID,
        });
    } catch (error) {
        console.error("Error during /make-appointment:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});



module.exports = router;
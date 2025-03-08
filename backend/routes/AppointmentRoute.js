const express = require("express");
const db = require("../db");
const {generateAppointmentId} = require("../GenerateId");
const { validateEmail, validatePhoneNumber } = require("../validations");
const{authenticateToken,authorizeRoles}=require("../utilities")

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

//not tsted
router.get("/get-not-confirmed", authenticateToken,authorizeRoles(['Admin']), async (req, res) => {
    try {
        const query = "SELECT * FROM appointments WHERE Status = ? ORDER BY AppointmentMadeDate DESC";
        
        const appointments = await new Promise((resolve, reject) => {
            db.query(query, ["Not Confirmed"], (err, result) => {
                if (err) {
                    console.error("Error fetching appointments:", err);
                    return reject(err);
                }
                resolve(result);
            });
        });

        res.status(200).json({
            success: true,
            appointments,
        });
    } catch (error) {
        console.error("Error fetching not confirmed appointments:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get("/get-all", authenticateToken,authorizeRoles(['Admin']), async (req, res) => {
    try {
        const query = "SELECT * FROM appointments ORDER BY AppointmentMadeDate DESC";

        
        const appointments = await new Promise((resolve, reject) => {
            db.query(query, ["Not Confirmed"], (err, result) => {
                if (err) {
                    console.error("Error fetching appointments:", err);
                    return reject(err);
                }
                resolve(result);
            });
        });

        res.status(200).json({
            success: true,
            appointments,
        });
    } catch (error) {
        console.error("Error fetching not confirmed appointments:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.put("/confirm-appointment/:id", authenticateToken,authorizeRoles(['Admin']), async (req, res) => {
    const { id } = req.params; // Get AppointmentID from URL

    try {
        const query = "UPDATE appointments SET Status = 'Confirmed' WHERE AppointmentID = ?";
        
        const result = await new Promise((resolve, reject) => {
            db.query(query, [id], (err, result) => {
                if (err) {
                    console.error("Error updating appointment status:", err);
                    return reject(err);
                }
                resolve(result);
            });
        });

        // Check if any row was affected (valid appointment ID)
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Appointment not found or already confirmed" });
        }

        res.status(200).json({
            success: true,
            message: "Appointment confirmed successfully!",
        });
    } catch (error) {
        console.error("Error confirming appointment:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


router.put("/reschedule-appointment/:id", authenticateToken, async (req, res) => {
    const { id } = req.params; // Get AppointmentID from URL
    const { Date, Time, VehicleNo } = req.body; // New values

    // Check if required fields are provided
    if (!Date || !Time || !VehicleNo) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        // Step 1: Verify if the appointment exists
        const checkQuery = "SELECT * FROM Appointments WHERE AppointmentID = ?";
        const existingAppointment = await new Promise((resolve, reject) => {
            db.query(checkQuery, [id], (err, result) => {
                if (err) {
                    console.error("Error checking appointment:", err);
                    return reject(err);
                }
                resolve(result);
            });
        });

        if (existingAppointment.length === 0) {
            return res.status(404).json({ error: "Appointment not found" });
        }

        // Step 2: Update the appointment details
        const updateQuery = `
            UPDATE Appointments 
            SET Date = ?, Time = ?, VehicleID = ?, AppointmentMadeDate = CURRENT_TIMESTAMP 
            WHERE AppointmentID = ?`;

        const result = await new Promise((resolve, reject) => {
            db.query(updateQuery, [Date, Time, VehicleNo, id], (err, result) => {
                if (err) {
                    console.error("Error updating appointment:", err);
                    return reject(err);
                }
                resolve(result);
            });
        });

        if (result.affectedRows === 0) {
            return res.status(400).json({ error: "Failed to update appointment" });
        }

        res.status(200).json({
            success: true,
            message: "Appointment rescheduled successfully!",
        });
    } catch (error) {
        console.error("Error updating appointment:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


router.get("/search-appointment", async (req, res) => {
    let { query } = req.query; // Use let instead of const to allow reassignment
  
    if (!query) {
      return res.status(400).json({ error: true, message: "Search query is required" });
    }
  
    query = query.trim(); // Trim the query
    const searchQuery = `%${query}%`; // Create search query
  
    console.log("Search Query:", searchQuery); // Log the search query being passed
  
    try {
      // Define the SQL query with placeholders for parameters
      const sqlQuery = `SELECT * FROM appointments WHERE Date LIKE ? OR VehicleID LIKE ? OR Customer LIKE ?`;
      console.log("Executing SQL:", sqlQuery, [searchQuery, searchQuery, searchQuery]);
  
      // Use db.query() with callback like in the /all-employees route
      db.query(sqlQuery, [searchQuery, searchQuery, searchQuery], (err, result) => {
        if (err) {
          console.error("Database query error:", err);
          return res.status(500).json({ error: true, message: "Internal server error" });
        }
  
        // Log the result for debugging
        console.log("Search Results:", result);
  
        return res.status(200).json({
          success: true,
          message: "Search completed successfully",
          results: result, // Send the result as search results
        });
      });
    } catch (error) {
      console.error("Unexpected error in /search-appointments:", error);
      return res.status(500).json({ error: true, message: "Something went wrong" });
    }
});

router.delete("/delete-appointment/:id", authenticateToken, authorizeRoles(["Admin"]), async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: true, message: "Appointment ID is required" });
        }

        const deleteQuery = "DELETE FROM appointment WHERE AppointmentID = ?";

        db.query(deleteQuery, [id], (err, result) => {
            if (err) {
                console.error("Database query error:", err);
                return res.status(500).json({ error: true, message: "Internal server error" });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: true, message: "Appointment not found" });
            }

            return res.status(200).json({
                success: true,
                message: "Appointment deleted successfully",
            });
        });

    } catch (error) {
        console.error("Unexpected error in /delete-employee:", error);
        return res.status(500).json({ error: true, message: "Something went wrong" });
    }
});






module.exports = router;
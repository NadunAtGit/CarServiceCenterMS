const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();
const db = require("./db");
const { admin } = require("./firebaseConfig"); 

const customerRoutes = require("./routes/CustomerRoute");
const appointmentRoutes=require("./routes/AppointmentRoute")
const adminRoutes=require("./routes/AdminRoute");
const advisorRoutes=require("./routes/JobAdvisorRouter");
const teamLeaderRoutes=require("./routes/TeamLeaderRoutes");
const mechanicsRoutes=require("./routes/MechanicsRoute");
const cashierRoutes=require("./routes/CashierRoute");
const ReportRoutes=require("./routes/ReportRoute");
const DriverRoutes=require("./routes/DriverRoutes");
const app = express();
const cors = require("cors");

// ✅ Fix: Ensure JSON Parsing Middleware Is Before Routes
app.use(express.json()); // Use express.json() instead of bodyParser.json()
app.use(bodyParser.urlencoded({ extended: true }));

const PORT = process.env.PORT || 8000;

app.use(cors());


// ✅ Fix: Make Sure Routes Are Loaded After Middleware
app.use("/api/customers", customerRoutes);
app.use("/api/appointments",appointmentRoutes);
app.use("/api/admin",adminRoutes);
app.use("/api/advisor",advisorRoutes);
app.use("/api/teamleader",teamLeaderRoutes);
app.use("/api/mechanic",mechanicsRoutes);
app.use("/api/cashier",cashierRoutes);
app.use("/api/reports",ReportRoutes);
app.use("/api/driver",DriverRoutes);


app._router.stack.forEach((r) => {
    if (r.route && r.route.path) {
        console.log(`Registered route: ${r.route.path}`);
    } else if (r.name === "router") {
        r.handle.stack.forEach((s) => {
            if (s.route) {
                console.log(`Registered route: ${s.route.path}`);
            }
        });
    }
});


app.get("/", (req, res) => {
    res.send("APP is running...");
});

app.listen(PORT,'0.0.0.0', () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
});

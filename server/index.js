require("dotenv").config({ path: __dirname + "/.env" });
const express = require("express");
const path = require("path");
const cors = require("cors");
const mongoose = require("mongoose");
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


const uri = process.env.MONGO_URI;
console.log("MONGO_URI:", uri);

// Connect to MongoDB
mongoose.connect(uri)
  .then(() => {
    console.log("MongoDB connected");

    // Start the server only after DB is connected
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error("MongoDB connection error:", err);
    process.exit(1); // Exit if DB connection fails
  });

// homepage route
app.get("/", (req, res) => {
  res.redirect("/api/feeds"); 
});

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use("/api/attendance", require("./routes/attendance"));
app.use("/api/dues", require("./routes/dues"));
app.use("/api/users", require("./routes/users"));
app.use("/api/feeds", require("./routes/feeds"));
app.use("/uploads", express.static("uploads")); // serve uploaded images
app.use("/api/notifications", require("./routes/notifications"));

// app.use('/api/members', require('./routes/members'));
// app.use('/api/posts', require('./routes/posts'));


module.exports = app;

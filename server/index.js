require("dotenv").config({ path: __dirname + "/.env" });
const express = require("express");
const path = require("path");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");              // ✅ Added
const { Server } = require("socket.io");   // ✅ Added

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// MongoDB connection
const uri = process.env.MONGO_URI;
console.log("MONGO_URI:", uri);

mongoose.connect(uri)
  .then(() => {
    console.log("MongoDB connected");

    // ✅ Use http server instead of app.listen
    const server = http.createServer(app);

    // ✅ Initialize Socket.IO
    const io = new Server(server, {
      cors: { 
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"],
       }, // change to frontend domain in production
    });

    // ✅ Make io available to routes/controllers
    app.set("io", io);

    io.on("connection", (socket) => {
      console.log("🟢 A user connected:", socket.id);

      socket.on("disconnect", () => {
        console.log("🔴 A user disconnected:", socket.id);
      });
    });

    const PORT = process.env.PORT || 5001;
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// Homepage route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "feeds.html"));
});

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use("/api/attendance", require("./routes/attendance"));
app.use("/api/dues", require("./routes/dues"));
app.use("/api/users", require("./routes/users"));
app.use("/api/feeds", require("./routes/feeds"));
app.use("/api/notifications", require("./routes/notifications"));

// module export (optional)
module.exports = app;

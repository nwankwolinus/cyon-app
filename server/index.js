require("dotenv").config({ path: __dirname + "/.env" });
const express = require("express");
const path = require("path");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");

const app = express();

// --- CORS Configuration ---
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:5001',
  'http://127.0.0.1:5001'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('🚫 CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'], 
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
};

app.use(cors(corsOptions)); 
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// MongoDB connection
const uri = process.env.MONGO_URI;
console.log("MONGO_URI:", uri ? "✅ Loaded" : "❌ Missing");

if (!uri) {
  console.error("❌ MONGO_URI is required in environment variables");
  process.exit(1);
}

mongoose.connect(uri)
  .then(() => {
    console.log("✅ MongoDB connected");

    const server = http.createServer(app);

    // Socket.IO configuration
    const io = new Server(server, {
      cors: {
        origin: function (origin, callback) {
          if (!origin) return callback(null, true);
          if (allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            console.log('🚫 Socket.IO CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
          }
        },
        methods: ["GET", "POST"],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      connectTimeout: 60000
    });

    app.set("io", io);

    io.on("connection", (socket) => {
      console.log("🟢 User connected:", socket.id);

      socket.on("authenticate", (token) => {
        console.log("🔐 Socket authentication for:", socket.id);
      });

      socket.on("disconnect", (reason) => {
        console.log("🔴 User disconnected:", socket.id, "Reason:", reason);
      });

      socket.on("error", (error) => {
        console.error("❌ Socket error:", socket.id, error);
      });
    });

    const PORT = process.env.PORT || 5001;
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 CORS enabled for file uploads with 60s timeout`);
    });
  })
  .catch(err => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "Server is running correctly",
    timestamp: new Date().toISOString(),
    port: process.env.PORT || 5001
  });
});

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use("/api/attendance", require("./routes/attendance"));
app.use("/api/dues", require("./routes/dues"));
app.use("/api/users", require('./routes/users'));
app.use('/api/feeds', require('./routes/feeds'));
app.use("/api/notifications", require("./routes/notifications"));

console.log('✅ All routes loaded');

// ----------------------------------------------------------------------
// 🟢 FINAL FIX: CATCH-ALL FALLBACK ROUTE USING REGEX
// This is the most reliable syntax to bypass the PathError.
// It matches all GET requests that haven't been matched by an API or static file.
// ----------------------------------------------------------------------
app.get(/^(?!.*(\.js|\.css|\.ico|\.png|\.jpg|\.jpeg|\.gif)).*$/, (req, res) => {
    // This Regex ensures we don't accidentally serve feeds.html for static asset requests
    // that the express.static middleware couldn't find (which would be a 404).
    res.sendFile(path.join(__dirname, "public", "feeds.html")); 
});

// Error handling middleware (Must be second-to-last)
app.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ----------------------------------------------------------------------
// 🟢 THE ULTIMATE CATCH-ALL (REPLACES 404 AND FALLBACK)
// This MUST be the very last middleware block in your entire file.
// ----------------------------------------------------------------------
app.use((req, res, next) => {
    // If it's a GET request and hasn't been matched by any API route or
    // static file (from the 'public' folder), it's treated as a client-side route
    // (e.g., /feeds/123). We serve the main HTML file so the frontend JS takes over.
    if (req.method === 'GET') {
        // Use a simple return here to end the response chain
        return res.sendFile(path.join(__dirname, "public", "feeds.html"));
    }
    
    // For all other unmatched requests (e.g., a POST to a non-existent route), 
    // respond with a 404 JSON.
    res.status(404).json({ error: 'Route not found' });
});

module.exports = app;
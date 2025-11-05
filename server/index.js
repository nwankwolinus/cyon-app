const express = require("express");
const path = require("path");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");

// Load environment variables from server/.env
require("dotenv").config({ path: __dirname + "/.env" }); 

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
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], 
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
};

app.use(cors(corsOptions)); 
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, "../public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// MongoDB connection
const uri = process.env.MONGO_URI;
console.log("MONGO_URI:", uri ? "✅ Loaded" : "❌ Missing");

if (!uri) {
  console.error("❌ MONGO_URI is required in environment variables");
  process.exit(1);
}

const mongooseOptions = {
  serverSelectionTimeoutMS: 60000, 
  socketTimeoutMS: 45000, 
  connectTimeoutMS: 30000, 
  maxPoolSize: 10, 
  retryWrites: true,
  retryReads: true,
};

console.log('🔄 Attempting MongoDB connection...');

mongoose.connect(uri, mongooseOptions)
  .then(() => {
    console.log("✅ MongoDB connected successfully");
    
    // Create the HTTP server
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
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
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

    // 🚀 START THE HTTP SERVER
    const PORT = process.env.PORT || 5001;
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 CORS enabled for file uploads with 60s timeout`);
    });

    // MongoDB event listeners
    mongoose.connection.on('connected', () => {
      console.log('✅ Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🔴 Mongoose disconnected from MongoDB');
    });

    // Graceful shutdown handler
    process.on('SIGINT', async () => {
      console.log('🛑 Received SIGINT, closing connections...');
      await mongoose.connection.close();
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    });

  })
  .catch((error) => {
    console.error("❌ MongoDB connection failed:", error);
    console.log("💡 Troubleshooting tips: Check MONGO_URI, IP whitelist, and internet connection.");
    process.exit(1);
  });

// ==========================================================
// 🎯 ROUTES (MUST COME BEFORE CATCH-ALL)
// ==========================================================

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
const authRoutes = require('./routes/auth'); // default export
app.use('/api/auth', authRoutes);

app.use('/api/admin', require('./routes/admin'));
app.use("/api/attendance", require("./routes/attendance"));
app.use("/api/dues", require("./routes/dues"));
app.use("/api/users", require('./routes/users'));
app.use('/api/feeds', require('./routes/feeds'));
app.use("/api/notifications", require("./routes/notifications"));

console.log('✅ All routes loaded');

// ==========================================================
// 🎯 SPA CATCH-ALL ROUTE (MUST BE LAST)
// ==========================================================

// Serve feeds.html for the root route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/welcome.html"));
});
// ==========================================================
// 🎯 ERROR HANDLING MIDDLEWARE (MUST BE VERY LAST)
// ==========================================================

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler for API routes (non-GET requests)
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

module.exports = app;
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const dotenv = require("dotenv");
const morgan = require("morgan");

// Load environment variables from a .env file
dotenv.config();

// Initialize app and server
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins (update for production)
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON requests
app.use(morgan("dev")); // Log HTTP requests for debugging

// A simple route
app.get("/", (req, res) => {
  res.send("Server is running!");
});

// WebSocket logic
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Listen for messages
  socket.on("send_message", (data) => {
    console.log("Message received:", data);
    io.emit("receive_message", data); // Broadcast to all clients
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Handle invalid routes
app.use((req, res, next) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Start the server
const PORT = process.env.PORT || 3001; // Use PORT from .env or default to 3001
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

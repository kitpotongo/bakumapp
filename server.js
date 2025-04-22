const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

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
app.use(cors());
app.use(express.json());

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

// Start the server
const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

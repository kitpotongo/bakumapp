const express = require("express");
const app = express();
const fs = require("fs");
const bcrypt = require("bcrypt");
const session = require("express-session");
const http = require("http").Server(app);
const io = require("socket.io")(http);
const path = require("path");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

app.use(session({
  secret: "bakum_secret_key",
  resave: false,
  saveUninitialized: true
}));

const usersPath = "./users.json";
let users = fs.existsSync(usersPath) ? JSON.parse(fs.readFileSync(usersPath)) : {};

function saveUsers() {
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
}

// Registration endpoint
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if (users[username]) {
    return res.status(400).send("Username already exists");
  }
  const hashed = await bcrypt.hash(password, 10);
  users[username] = { password: hashed };
  saveUsers();
  req.session.username = username;
  res.status(200).send("Registered successfully");
});

// Login endpoint
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = users[username];
  if (!user) return res.status(400).send("User not found");

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).send("Incorrect password");

  req.session.username = username;
  res.status(200).send("Login successful");
});

// Serve chat page if logged in
app.get("/chat", (req, res) => {
  if (!req.session.username) return res.redirect("/");
  res.sendFile(path.join(__dirname, "chat.html"));
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Socket.IO for real-time messaging
io.on("connection", (socket) => {
  console.log("User connected");

  socket.on("join", (username) => {
    socket.username = username;
  });

  socket.on("private message", ({ to, message }) => {
    const target = [...io.sockets.sockets.values()].find(s => s.username === to);
    if (target) {
      target.emit("private message", { from: socket.username, message });
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

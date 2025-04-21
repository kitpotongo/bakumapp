
const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const fs = require("fs");
const path = require("path");

app.use(express.json());
app.use(express.static("public"));

const usersFile = path.join(__dirname, "users.json");

// Handle user registration
app.post("/register", (req, res) => {
    const { username, password } = req.body;
    let users = JSON.parse(fs.readFileSync(usersFile));
    
    if (users[username]) {
        return res.json({ success: false, message: "Username already exists" });
    }

    users[username] = password;
    fs.writeFileSync(usersFile, JSON.stringify(users));
    res.json({ success: true });
});

// Handle login
app.post("/login", (req, res) => {
    const { username, password } = req.body;
    let users = JSON.parse(fs.readFileSync(usersFile));
    
    if (users[username] && users[username] === password) {
        res.json({ success: true });
    } else {
        res.json({ success: false, message: "Invalid username or password" });
    }
});

// Real-time chat
io.on("connection", (socket) => {
    console.log("A user connected");

    socket.on("chat message", (msg) => {
        io.emit("chat message", msg);
    });

    socket.on("disconnect", () => {
        console.log("A user disconnected");
    });
});

// Start server
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

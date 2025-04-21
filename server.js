const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

const usersFile = path.join(__dirname, "users.json");

app.use(express.static("public"));
app.use(express.json());

// Register
app.post("/register", (req, res) => {
    const { username, password } = req.body;
    const users = fs.existsSync(usersFile) ? JSON.parse(fs.readFileSync(usersFile)) : {};

    if (users[username]) {
        return res.json({ success: false, message: "Username taken" });
    }

    users[username] = password;
    fs.writeFileSync(usersFile, JSON.stringify(users));
    res.json({ success: true });
});

// Login
app.post("/login", (req, res) => {
    const { username, password } = req.body;
    const users = fs.existsSync(usersFile) ? JSON.parse(fs.readFileSync(usersFile)) : {};

    if (users[username] === password) {
        res.json({ success: true });
    } else {
        res.json({ success: false, message: "Invalid credentials" });
    }
});

// Real-time chat
io.on("connection", socket => {
    console.log("User connected");

    socket.on("chat message", msg => {
        io.emit("chat message", msg);
    });

    socket.on("disconnect", () => {
        console.log("User disconnected");
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on ${PORT}`));

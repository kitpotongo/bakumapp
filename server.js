const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const fs = require('fs');

app.use(express.static('public'));
app.use(express.json());

const USERS_FILE = 'users.json';
let users = {};
if (fs.existsSync(USERS_FILE)) {
    users = JSON.parse(fs.readFileSync(USERS_FILE));
}

app.post('/register', (req, res) => {
    const { username, password } = req.body;
    if (users[username]) {
        return res.json({ success: false, message: 'User already exists' });
    }
    users[username] = { password };
    fs.writeFileSync(USERS_FILE, JSON.stringify(users));
    res.json({ success: true });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (users[username] && users[username].password === password) {
        res.json({ success: true });
    } else {
        res.json({ success: false, message: 'Invalid credentials' });
    }
});

io.on('connection', (socket) => {
    socket.on('chat message', (msg) => {
        io.emit('chat message', msg);
    });
});

http.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});

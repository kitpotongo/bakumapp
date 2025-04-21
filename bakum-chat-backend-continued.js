// Generate JWT token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );
        
        // Return user info and token
        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
        
        // Broadcast user online status to all connected clients
        broadcastUserStatus(user._id, true);
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// User routes
app.get('/api/users/me', authenticate, (req, res) => {
    res.json({
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        online: req.user.online
    });
});

app.get('/api/users', authenticate, async (req, res) => {
    try {
        const users = await User.find().select('-password');
        
        const formattedUsers = users.map(user => ({
            id: user._id,
            name: user.name,
            email: user.email,
            online: user.online,
            lastSeen: user.lastSeen
        }));
        
        res.json(formattedUsers);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Message routes
app.post('/api/messages', authenticate, async (req, res) => {
    try {
        const { receiverId, content } = req.body;
        
        const message = new Message({
            senderId: req.user._id,
            receiverId,
            content
        });
        
        await message.save();
        
        // Send message through WebSocket if receiver is online
        const receiver = clients.get(receiverId);
        
        if (receiver) {
            receiver.send(JSON.stringify({
                type: 'message',
                message: {
                    id: message._id,
                    senderId: req.user._id,
                    senderName: req.user.name,
                    content,
                    timestamp: message.timestamp
                }
            }));
        }
        
        res.status(201).json(message);
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/messages/:userId', authenticate, async (req, res) => {
    try {
        const { userId } = req.params;
        
        const messages = await Message.find({
            $or: [
                { senderId: req.user._id, receiverId: userId },
                { senderId: userId, receiverId: req.user._id }
            ]
        }).sort({ timestamp: 1 });
        
        res.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Serve the frontend in production
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// WebSocket server
const wss = new WebSocket.Server({ server });

// Map to store connected clients (userId -> WebSocket)
const clients = new Map();

// WebSocket authentication middleware
const authenticateWs = (request) => {
    try {
        const url = new URL(request.url, 'http://localhost');
        const token = url.searchParams.get('token');
        
        if (!token) {
            return null;
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        return decoded.userId;
    } catch (error) {
        console.error('WebSocket authentication error:', error);
        return null;
    }
};

// Function to broadcast user status to all connected clients
const broadcastUserStatus = async (userId, online) => {
    try {
        // Update user status in database
        await User.findByIdAndUpdate(userId, { 
            online, 
            lastSeen: Date.now() 
        });
        
        // Broadcast to all connected clients
        clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'user_status',
                    userId: userId.toString(),
                    online
                }));
            }
        });
    } catch (error) {
        console.error('Error broadcasting user status:', error);
    }
};

// Function to broadcast updated users list to all connected clients
const broadcastUsersList = async () => {
    try {
        const users = await User.find().select('-password');
        
        const formattedUsers = users.map(user => ({
            id: user._id,
            name: user.name,
            email: user.email,
            online: user.online,
            lastSeen: user.lastSeen
        }));
        
        clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'users_list',
                    users: formattedUsers
                }));
            }
        });
    } catch (error) {
        console.error('Error broadcasting users list:', error);
    }
};

// WebSocket connection handler
wss.on('connection', async (ws, request) => {
    const userId = authenticateWs(request);
    
    if (!userId) {
        ws.close(1008, 'Authentication failed');
        return;
    }
    
    // Store client connection
    clients.set(userId, ws);
    
    // Set user as online
    await broadcastUserStatus(userId, true);
    
    // Send updated users list to all clients
    broadcastUsersList();
    
    // Handle incoming messages
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            
            switch (data.type) {
                case 'message':
                    // Save message to database
                    const newMessage = new Message({
                        senderId: userId,
                        receiverId: data.data.receiverId,
                        content: data.data.content
                    });
                    
                    await newMessage.save();
                    
                    // Get sender information
                    const sender = await User.findById(userId);
                    
                    // Prepare message object
                    const messageObj = {
                        id: newMessage._id,
                        senderId: userId,
                        senderName: sender.name,
                        receiverId: data.data.receiverId,
                        content: data.data.content,
                        timestamp: newMessage.timestamp
                    };
                    
                    // Send to recipient if online
                    const recipientWs = clients.get(data.data.receiverId);
                    
                    if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
                        recipientWs.send(JSON.stringify({
                            type: 'message',
                            message: messageObj
                        }));
                    }
                    
                    // Also send back to sender for confirmation
                    ws.send(JSON.stringify({
                        type: 'message_sent',
                        message: messageObj
                    }));
                    break;
                    
                default:
                    console.log('Unknown message type:', data.type);
            }
        } catch (error) {
            console.error('Error processing WebSocket message:', error);
        }
    });
    
    // Handle client disconnect
    ws.on('close', async () => {
        // Remove client from connected clients
        clients.delete(userId);
        
        // Set user as offline
        await broadcastUserStatus(userId, false);
        
        // Send updated users list to all clients
        broadcastUsersList();
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

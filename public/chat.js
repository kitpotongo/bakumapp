import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";

// Connect to the backend server
const socket = io("http://localhost:3001");

const Chat = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Listen for messages from the server
    socket.on("receive_message", (data) => {
      setMessages((prevMessages) => [...prevMessages, data]);
    });

    // Cleanup listener on component unmount
    return () => {
      socket.off("receive_message");
    };
  }, []);

  const sendMessage = () => {
    if (message.trim() !== "") {
      const newMessage = {
        text: message,
        timestamp: new Date().toISOString()
      };
      socket.emit("send_message", newMessage); // Send to server
      setMessages((prevMessages) => [...prevMessages, newMessage]); // Add to UI
      setMessage(""); // Clear input
    }
  };

  return (
    <div>
      <h2>Chat</h2>
      <div style={{ border: "1px solid gray", padding: "10px", height: "300px", overflowY: "scroll" }}>
        {messages.map((msg, index) => (
          <div key={index}>
            <strong>{msg.timestamp}:</strong> {msg.text}
          </div>
        ))}
      </div>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message"
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
};

export default Chat;

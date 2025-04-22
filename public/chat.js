import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";

// Connect to the backend server
const socket = io("http://localhost:3001"); // Change this URL if your backend is deployed elsewhere

const Chat = () => {
  const [message, setMessage] = useState(""); // Input message
  const [messages, setMessages] = useState([]); // List of messages

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
        timestamp: new Date().toLocaleTimeString(),
      };
      socket.emit("send_message", newMessage); // Send to server
      setMessages((prevMessages) => [...prevMessages, newMessage]); // Update UI
      setMessage(""); // Clear input
    }
  };

  return (
    <div style={{ width: "400px", margin: "auto", textAlign: "center" }}>
      <h2>Real-Time Chat</h2>
      <div
        style={{
          border: "1px solid gray",
          padding: "10px",
          height: "300px",
          overflowY: "scroll",
          marginBottom: "10px",
        }}
      >
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
        style={{ width: "70%", padding: "5px" }}
      />
      <button
        onClick={sendMessage}
        style={{
          padding: "5px 10px",
          marginLeft: "10px",
          cursor: "pointer",
        }}
      >
        Send
      </button>
    </div>
  );
};

export default Chat;

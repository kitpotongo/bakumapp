const socket = io();
const chatBox = document.getElementById("chat-box");
const form = document.getElementById("chat-form");
const input = document.getElementById("msg");
const username = localStorage.getItem("username") || "Anonymous";

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const msg = input.value;
  if (!msg) return;
  socket.emit("chat message", `${username}: ${msg}`);
  input.value = "";
});

socket.on("chat message", (msg) => {
  const div = document.createElement("div");
  div.classList.add("message");
  div.textContent = msg;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
});

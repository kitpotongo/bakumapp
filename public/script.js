function login() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            localStorage.setItem("username", username);
            window.location.href = "chat.html";
        } else {
            alert(data.message);
        }
    });
}

function register() {
    const username = document.getElementById("username").

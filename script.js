const messageInput = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");
const chatBox = document.getElementById("chat-box");
const newChatButton = document.getElementById("sidebar-new-chat");
const recentChats = document.getElementById("recent-chats");

let chatHistory = [];
let savedChats = JSON.parse(localStorage.getItem("savedChats")) || [];

let currentChatId = Date.now();
function renderRecentChats() {
    recentChats.innerHTML = "";

    savedChats.forEach(function (chat) {
        const chatItem = document.createElement("div");
        chatItem.className = "recent-chat-item";

        const chatTitle = document.createElement("span");
        chatItem.textContent = chat.title;

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "🗑";
        deleteButton.className = "delete-chat-button";

        chatItem.appendChild(chatTitle);
        chatItem.appendChild(deleteButton);

        deleteButton.addEventListener("click", function (event) {
            event.stopPropagation();
            if (!confirm("Delete this chat?")) {
                return;
            }
            savedChats = savedChats.filter(function (savedChat) {
                return savedChat.id !== chat.id;
            });

            localStorage.setItem("savedChats", JSON.stringify(savedChats));
    
            if (currentChatId === chat.id) {
                chatHistory = [];
                currentChatId = Date.now();

                chatBox.innerHTML = `
                    <div class="message bot-message">
                        Hi! 👋 I'm your AI Study Assistant. What would you like to learn today?
                    </div>
                `;

                messageInput.value = "";
                messageInput.focus();
            }

            renderRecentChats();
        });

        chatItem.addEventListener("click", function () {
            document.querySelectorAll(".recent-chat-item").forEach(function (item) {
            item.classList.remove("active");
        });

            chatItem.classList.add("active");
            chatHistory = [...chat.messages];
            currentChatId = chat.id;

            chatBox.innerHTML = "";

            chatHistory.forEach(function (message) {
                const messageElement = document.createElement("div");

                messageElement.className =
                    message.role === "user"
                        ? "message user-message"
                        : "message bot-message";

                if (message.role === "assistant") {
                    messageElement.innerHTML = marked.parse(message.content);
                } else {
                    messageElement.textContent = message.content;
                }

                chatBox.appendChild(messageElement);
            });

            chatBox.scrollTop = chatBox.scrollHeight;
            setTimeout(function () {
                messageInput.focus();
                messageInput.click();
            }, 100);
        });

        recentChats.appendChild(chatItem);
    });
}

renderRecentChats();

function saveCurrentChat() {
    if (chatHistory.length === 0) {
        return;
    }

    const firstUserMessage = chatHistory.find(
        message => message.role === "user"
    );

    if (!firstUserMessage) {
        return;
    }

    const existingChatIndex = savedChats.findIndex(
        chat => chat.id === currentChatId
    );

    const chatData = {
        id: currentChatId,
        title: firstUserMessage.content.slice(0, 30),
        messages: [...chatHistory]
    };

    if (existingChatIndex !== -1) {
        savedChats[existingChatIndex] = chatData;
    } else {
        savedChats.unshift(chatData);
    }

    localStorage.setItem("savedChats", JSON.stringify(savedChats));

    renderRecentChats();
}

let isSending = false;
let chatSession = 0;

messageInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        sendMessage();
    }
});

sendButton.addEventListener("click", sendMessage);

newChatButton.addEventListener("click", function () {
    saveCurrentChat();
    chatHistory = [];
    currentChatId = Date.now();
    chatSession++;
    messageInput.value = "";
    isSending = false;
    sendButton.disabled = false;
    chatBox.innerHTML = `
        <div class="message bot-message">
             Hi! 👋 I'm your AI Study Assistant. What would you like to learn today?
        </div>
    `;
    messageInput.focus();
   
});

async function sendMessage() {
       
     if (isSending) {
        return;
    }

    const message = messageInput.value.trim();

    if (message === "") {
        return;
    }

    isSending = true;
    sendButton.disabled = true;

    const currentSession = chatSession;

    const userMessage = document.createElement("div");
    userMessage.className = "message user-message";
    userMessage.textContent = message;

    chatBox.appendChild(userMessage);

    chatBox.scrollTop = chatBox.scrollHeight;
    setTimeout(function () {
        messageInput.focus();
    }, 0);

    messageInput.value = "";
    messageInput.focus();

    const typingMessage = document.createElement("div"); 
          typingMessage.className = "message bot-message";
          typingMessage.textContent = "Thinking... ";

          chatBox.appendChild(typingMessage);

    try {

        const historyForRequest = [...chatHistory];

        historyForRequest.push({
        role: "user",
        content: message
    });

        const response = await fetch("http://127.0.0.1:8000/chat", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

           body: JSON.stringify({
                 message: message,
                 history: chatHistory.slice(0, -1)
                })
        });

       const data = await response.json();
            if (currentSession !== chatSession) {
                 return;
                }

            if (!response.ok) {
                throw new Error(data.detail || "Request failed");
            }


        typingMessage.remove();

        chatHistory.push({
        role: "user",
        content: message
    });
        if (chatHistory.length > 20) {
            chatHistory = chatHistory.slice(-20);
        }

        chatHistory.push({
            role: "assistant",
            content: data.reply
        });

        saveCurrentChat();

        if (chatHistory.length > 20) {
            chatHistory = chatHistory.slice(-20);
        }

        const botMessage = document.createElement("div");
        botMessage.className = "message bot-message";
        botMessage.innerHTML = marked.parse(data.reply);

        chatBox.appendChild(botMessage);

        chatBox.scrollTop = chatBox.scrollHeight;

    } catch (error) {

        if (typingMessage) {
            typingMessage.remove();
        }

        const errorMessage = document.createElement("div");

        errorMessage.className = "message bot-message";
        errorMessage.textContent = error.message || "Sorry, something went wrong. Please try again.";

        console.error(error);
    }

        finally {
        isSending = false;
        sendButton.disabled = false;
        messageInput.focus();
    }
}
messageInput.focus();
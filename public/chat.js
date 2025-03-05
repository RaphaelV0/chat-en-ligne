const socket = io();
let username = prompt("Quel est votre nom ?");
let room = "Général"; // Salon par défaut

if (!username || username.trim() === "") {
    username = `User${Math.floor(Math.random() * 1000)}`;
}

// Envoi du pseudo au serveur
socket.emit('new user', username);

// Mise à jour des salons
socket.on("update rooms", function (rooms) {
    const roomsUl = document.getElementById("roomsList");
    roomsUl.innerHTML = "";

    rooms.forEach((roomName) => {
        const li = document.createElement("li");
        li.textContent = roomName;
        li.style.cursor = "pointer";
        li.addEventListener("click", () => {
            rejoindreSalon(roomName);
        });
        roomsUl.appendChild(li);
    });
});

// Rejoindre un salon
function rejoindreSalon(nomSalon) {
    if (room) {
        socket.emit("leave room", room);
    }

    room = nomSalon;
    socket.emit("change room", { newRoom: room });

    document.getElementById("roomSelection").style.display = "none";
    document.getElementById("chatContainer").style.display = "block";
    document.getElementById("currentRoom").textContent = room;
}

// Création de salon
document.getElementById("createRoomForm").addEventListener("submit", function (event) {
    event.preventDefault();
    const newRoomName = document.getElementById("newRoomName").value.trim();

    if (newRoomName !== "") {
        socket.emit("create room", newRoomName);
        document.getElementById("newRoomName").value = "";
    }
});

// Envoi d'un message
document.getElementById('form').addEventListener('submit', function (event) {
    event.preventDefault();
    const input = document.getElementById('inputMessage');
    const message = input.value.trim();

    if (message !== "") {
        socket.emit('message', { user: username, message, room });
        input.value = "";
    }
});

// Indicateur de saisie
document.getElementById('inputMessage').addEventListener('input', () => {
    socket.emit('typing', { user: username, room });
});

// Affichage des messages
socket.on("messageRecu", function (msg) {
    const messagesUl = document.getElementById("messages");
    const li = document.createElement('li');
    
    if (msg.message.startsWith("(privé)")) {
        li.style.backgroundColor = "#f0f8ff"; // Couleur de fond différente pour les messages privés
        li.textContent = `${msg.user} (Privé) : ${msg.message.substring(7)}`; // Enlever le préfixe "(privé)"
    } else {
        li.textContent = `${msg.user} : ${msg.message}`;
    }

    // Ajouter un bouton de suppression de message uniquement pour l'utilisateur qui a envoyé le message
    if (msg.user === username) {
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Supprimer';
        deleteButton.addEventListener('click', () => {
            socket.emit('delete message', msg.id); // Suppression du message côté serveur
        });
        li.appendChild(deleteButton);
    }

    li.setAttribute("data-message-id", msg.id);
    messagesUl.appendChild(li);
});

// Suppression du message depuis tous les clients
socket.on('messageDeleted', (messageId) => {
    const messagesUl = document.getElementById("messages");
    const messageItems = messagesUl.getElementsByTagName("li");
    
    // Parcours des messages et suppression de celui qui a le même ID
    for (let i = 0; i < messageItems.length; i++) {
        const messageItem = messageItems[i];
        if (messageItem.getAttribute("data-message-id") === messageId) {
            messagesUl.removeChild(messageItem); // Retirer le message de l'affichage
            break;
        }
    }
});

// Mise à jour des utilisateurs connectés
socket.on("update users", function (users) {
    const userUl = document.getElementById("user");
    userUl.innerHTML = "";
    users.forEach((user) => {
        const li = document.createElement("li");
        li.textContent = user.username;
        userUl.appendChild(li);
    });
});

// Indicateur de saisie
socket.on("typing", function (data) {
    const typingIndicator = document.getElementById("typing");
    typingIndicator.textContent = `${data.user} est en train d'écrire...`;

    setTimeout(() => {
        typingIndicator.textContent = "";
    }, 3000);
});

// Affichage des notifications
socket.on('notification', function (message) {
    const notifications = document.getElementById("notifications");
    const notification = document.createElement("div");
    notification.classList.add("notification");
    notification.textContent = message;
    
    notifications.appendChild(notification);

    // Enlever la notification après 5 secondes
    setTimeout(() => {
        notifications.removeChild(notification);
    }, 5000);
});

// Mise à jour du Dashboard avec les informations sur les utilisateurs et salons
socket.on('update dashboard', (data) => {
    // Mise à jour des statistiques
    document.getElementById('onlineUsersCount').textContent = data.onlineUsers;
    document.getElementById('messageCount').textContent = data.totalMessages;
    document.getElementById('privateMessagesCount').textContent = data.privateMessages;
    document.getElementById('deletedMessagesCount').textContent = data.deletedMessages;

    // Mise à jour de la liste des utilisateurs avec la durée de connexion
    const userList = document.getElementById('userList');
    userList.innerHTML = '';  
    data.users.forEach((user) => {
        const li = document.createElement('li');
        li.textContent = `${user.username} (Connecté depuis: ${formatDuration(user.connectionDuration)})`;
        li.addEventListener('click', () => {
            window.location.href = `/user-stats/${user.username}`; // Accès aux stats utilisateur spécifique
        });
        userList.appendChild(li);
    });

    // Mise à jour de la liste des salons avec la durée de vie
    const roomList = document.getElementById('roomList');
    roomList.innerHTML = '';  
    data.rooms.forEach((room) => {
        const li = document.createElement('li');
        li.textContent = `${room.roomName} (Durée de vie: ${formatDuration(room.roomDuration)})`;
        li.addEventListener('click', () => {
            window.location.href = `/room-stats/${room.roomName}`; // Accès aux stats salon spécifique
        });
        roomList.appendChild(li);
    });
});

// Formatage de la durée en format lisible (minutes et secondes)
function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
}

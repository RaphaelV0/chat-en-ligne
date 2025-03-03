const express = require('express');
const socketIO = require('socket.io');

const PORT = 8000;
const app = express();
const server = app.listen(PORT, function () {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});

app.use(express.static("public"));

app.get('/dashboard', (req, res) => {
    res.sendFile(__dirname + '/public/dashboard.html');
});

const io = socketIO(server);
const users = new Map(); // Stockage des utilisateurs (socket.id => { username, room })
const rooms = new Set(["Général"]); // Liste des salons disponibles

let totalMessages = 0;
let privateMessages = 0;
let deletedMessages = 0;

let messages = []; // Stockage des messages envoyés

io.on('connection', (socket) => {
    console.log('Nouvelle connexion');

    // Ajout d'un utilisateur
    socket.on('new user', (username) => {
        socket.username = username;
        users.set(socket.id, { username, room: "Général" });

        socket.join("Général"); // Par défaut, tout le monde rejoint "Général"
        io.emit('update rooms', Array.from(rooms));
        io.to("Général").emit('update users', getUsersInRoom("Général"));

        // Notification de connexion
        io.to("Général").emit('notification', `${username} a rejoint le salon Général.`);
    });

    // Gérer le changement de salon
    socket.on('change room', ({ newRoom }) => {
        const user = users.get(socket.id);
        if (user) {
            socket.leave(user.room); // Quitter l'ancien salon
            user.room = newRoom; // Mettre à jour le salon
            socket.join(newRoom); // Rejoindre le nouveau

            if (!rooms.has(newRoom)) {
                rooms.add(newRoom);
            }

            io.emit('update rooms', Array.from(rooms));
            io.to(newRoom).emit('update users', getUsersInRoom(newRoom));

            // Notification de changement de salon
            io.to(newRoom).emit('notification', `${user.username} a rejoint le salon ${newRoom}.`);
        }
    });

    // Création de salon
    socket.on("create room", (roomName) => {
        if (!rooms.has(roomName)) {
            rooms.add(roomName);
            io.emit("update rooms", Array.from(rooms));

            // Notification de création de salon
            io.emit('notification', `Un nouveau salon "${roomName}" a été créé.`);
        }
    });

    // Gestion des messages publics et privés
    socket.on('message', ({ user, message, room }) => {
        totalMessages++;
        const messageId = Date.now().toString();
        const newMessage = { id: messageId, user, message, senderId: socket.id };

        const privateMatch = message.match(/^@(\w+)\s(.+)/);

        if (privateMatch) {
            privateMessages++;
            const targetUser = privateMatch[1];
            const privateMessage = privateMatch[2];

            let targetSocketId = null;
            for (let [id, userInfo] of users.entries()) {
                if (userInfo.username === targetUser) {
                    targetSocketId = id;
                    break;
                }
            }

            if (targetSocketId) {
                // Message privé, envoyer à l'utilisateur cible
                io.to(targetSocketId).emit('messageRecu', { id: messageId, user, message: `(privé) ${privateMessage}` });
                socket.emit('messageRecu', { id: messageId, user, message: `(privé à ${targetUser}) ${privateMessage}` });
                
                // Notification de message privé
                io.to(targetSocketId).emit('notification', `Vous avez un message privé de ${user}: ${privateMessage}`);
            } else {
                socket.emit('messageRecu', { id: messageId, user: "Système", message: `Utilisateur ${targetUser} introuvable.` });
            }
        } else {
            messages.push(newMessage);
            io.to(room).emit('messageRecu', newMessage);

            // Notification de message public
            io.to(room).emit('notification', `${user} a envoyé un message: ${message}`);
        }

        // Mettre à jour le dashboard avec les nouvelles statistiques
        updateDashboard();
    });

    // Suppression de message
    socket.on('delete message', (messageId) => {
        const messageIndex = messages.findIndex(msg => msg.id === messageId);

        if (messageIndex !== -1) {
            const message = messages[messageIndex];

            // Vérifier si l'utilisateur est celui qui a envoyé le message
            if (message && message.senderId === socket.id) {
                messages.splice(messageIndex, 1);  // Supprimer le message du tableau
                deletedMessages++;

                // Informer tous les clients que le message a été supprimé
                io.emit('messageDeleted', messageId);

                // Notification de suppression
                io.emit('notification', `Le message de ${message.user} a été supprimé.`);

                // Mettre à jour le dashboard
                updateDashboard();
            }
        }
    });

    // Gérer la déconnexion
    socket.on('disconnect', () => {
        if (users.has(socket.id)) {
            const { room, username } = users.get(socket.id);
            users.delete(socket.id);
            io.to(room).emit('update users', getUsersInRoom(room));

            // Notification de déconnexion
            io.to(room).emit('notification', `${username} a quitté le salon.`);
            updateDashboard();
        }
    });

    // Gérer l'indicateur de saisie
    socket.on("typing", ({ user, room }) => {
        socket.to(room).emit("typing", { user });
    });

    // Fonction pour récupérer les utilisateurs dans une room
    function getUsersInRoom(room) {
        return Array.from(users.values()).filter(user => user.room === room);
    }

    // Fonction pour mettre à jour le dashboard
    function updateDashboard() {
        const onlineUsers = users.size;
        const usersInRooms = Array.from(users.values()).map(user => user.username);

        io.emit('update dashboard', {
            onlineUsers,
            totalMessages,
            privateMessages,
            deletedMessages,
            users: usersInRooms
        });
    }

});

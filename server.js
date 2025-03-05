const express = require('express');
const socketIO = require('socket.io');

const PORT = 8000;
const app = express();
const server = app.listen(PORT, function () {
    console.log(`[${new Date().toLocaleString()}] Serveur démarré sur http://localhost:${PORT}`);
});

app.use(express.static("public"));

// Routes pour les pages
app.get('/dashboard', (req, res) => {
    res.sendFile(__dirname + '/public/dashboard.html');
});

// Route pour les statistiques d'un utilisateur spécifique
app.get('/user-stats/:username', (req, res) => {
    const { username } = req.params;
    const userStats = Array.from(users.values()).find(user => user.username === username);
    if (userStats) {
        res.json(userStats); // Retourner les statistiques de l'utilisateur au format JSON
    } else {
        res.status(404).json({ message: 'Utilisateur introuvable' });
    }
});

// Route pour les statistiques d'une salle spécifique
app.get('/room-stats/:roomName', (req, res) => {
    const { roomName } = req.params;
    const roomStats = rooms.get(roomName);
    if (roomStats) {
        res.json({ roomName, roomDuration: Math.floor((Date.now() - roomStats) / 1000) });
    } else {
        res.status(404).json({ message: 'Salle introuvable' });
    }
});

const io = socketIO(server);
const users = new Map(); // Stockage des utilisateurs (socket.id => { username, room, connectionStart })
const rooms = new Map(); // Liste des salons avec leur date de création

let totalMessages = 0;
let privateMessages = 0;
let deletedMessages = 0;
let messages = []; // Stockage des messages envoyés

io.on('connection', (socket) => {
    console.log(`[${new Date().toLocaleString()}] Nouvelle connexion`);

    // Ajouter un utilisateur
    socket.on('new user', (username) => {
        socket.username = username;
        const connectionStart = Date.now();
        users.set(socket.id, { username, room: "Général", connectionStart });

        socket.join("Général"); // Par défaut, tout le monde rejoint "Général"
        if (!rooms.has("Général")) {
            rooms.set("Général", Date.now()); // Enregistrer la date de création du salon
        }
        io.emit('update rooms', Array.from(rooms.keys()));
        io.to("Général").emit('update users', getUsersInRoom("Général"));

        // Notification de connexion
        io.to("Général").emit('notification', `${username} a rejoint le salon Général.`);
        console.log(`[${new Date().toLocaleString()}] ${username} a rejoint le salon Général.`);
    });

    // Gérer le changement de salon
    socket.on('change room', ({ newRoom }) => {
        const user = users.get(socket.id);
        if (user) {
            socket.leave(user.room); // Quitter l'ancien salon
            user.room = newRoom; // Mettre à jour le salon
            socket.join(newRoom); // Rejoindre le nouveau salon

            if (!rooms.has(newRoom)) {
                rooms.set(newRoom, Date.now()); // Enregistrer la date de création du nouveau salon
            }

            io.emit('update rooms', Array.from(rooms.keys()));
            io.to(newRoom).emit('update users', getUsersInRoom(newRoom));

            // Notification de changement de salon
            io.to(newRoom).emit('notification', `${user.username} a rejoint le salon ${newRoom}.`);
            console.log(`[${new Date().toLocaleString()}] ${user.username} a rejoint le salon ${newRoom}`);
        }
    });

    // Création de salon
    socket.on("create room", (roomName) => {
        if (!rooms.has(roomName)) {
            rooms.set(roomName, Date.now());
            io.emit("update rooms", Array.from(rooms.keys()));

            // Notification de création de salon
            io.emit('notification', `Un nouveau salon "${roomName}" a été créé.`);
            console.log(`[${new Date().toLocaleString()}] Un nouveau salon "${roomName}" a été créé.`);
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
                console.log(`[${new Date().toLocaleString()}] Message privé de ${user} à ${targetUser}: ${privateMessage}`);
            } else {
                socket.emit('messageRecu', { id: messageId, user: "Système", message: `Utilisateur ${targetUser} introuvable.` });
                console.log(`[${new Date().toLocaleString()}] L'utilisateur ${targetUser} n'a pas été trouvé pour le message privé.`);
            }
        } else {
            messages.push(newMessage);
            io.to(room).emit('messageRecu', newMessage);

            // Notification de message public
            io.to(room).emit('notification', `${user} a envoyé un message: ${message}`);
            console.log(`[${new Date().toLocaleString()}] Message public de ${user} dans le salon ${room}: ${message}`);
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
                console.log(`[${new Date().toLocaleString()}] Le message de ${message.user} a été supprimé.`);
                updateDashboard();
            }
        }
    });

    // Gérer la déconnexion
    socket.on('disconnect', () => {
        if (users.has(socket.id)) {
            const { room, username, connectionStart } = users.get(socket.id);
            const connectionDuration = Math.floor((Date.now() - connectionStart) / 1000); // Calcul de la durée de connexion
            users.delete(socket.id);
            io.to(room).emit('update users', getUsersInRoom(room));

            // Notification de déconnexion
            io.to(room).emit('notification', `${username} a quitté le salon.`);
            console.log(`[${new Date().toLocaleString()}] ${username} a quitté le salon ${room}`);
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
        const usersInRooms = Array.from(users.values()).map(user => ({
            username: user.username,
            connectionDuration: Math.floor((Date.now() - user.connectionStart) / 1000) // Durée de connexion en secondes
        }));

        io.emit('update dashboard', {
            onlineUsers,
            totalMessages,
            privateMessages,
            deletedMessages,
            users: usersInRooms,
            rooms: Array.from(rooms.keys()).map(roomName => ({
                roomName,
                roomDuration: Math.floor((Date.now() - rooms.get(roomName)) / 1000) // Durée d'existence du salon
            }))
        });
    }
});

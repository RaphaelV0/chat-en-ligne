const express = require('express');
const socketIO = require('socket.io');

const PORT = 8000;
const app = express();
const server = app.listen(PORT, function() {
    console.log(`http://localhost:${PORT}`);
});

app.use(express.static("public"));

const io = socketIO(server);
const users = new Map(); // Stockage des utilisateurs (socket.id => username)

io.on('connection', (socket) => {
    console.log('Nouvelle connexion');

    // Gérer un nouvel utilisateur
    socket.on('new user', function(username) {
        socket.username = username; 
        users.set(socket.id, username);
        io.sockets.emit('update users', Array.from(users.values()));
    });

    // Gérer l'envoi des messages
    socket.on('message', (msg) => {
        const { user, message } = msg;
        const privateMatch = message.match(/^@(\w+)\s(.+)/); // Vérifie si le message contient @pseudo

        if (privateMatch) {
            const targetUser = privateMatch[1]; // Nom du destinataire
            const privateMessage = privateMatch[2]; // Contenu du message

            let targetSocketId = null;

            // Trouver le socket ID du destinataire
            for (let [id, username] of users.entries()) {
                if (username === targetUser) {
                    targetSocketId = id;
                    break;
                }
            }

            if (targetSocketId) {
                io.to(targetSocketId).emit('messageRecu', { user, message: `(privé) ${privateMessage}` });
                socket.emit('messageRecu', { user, message: `(privé à ${targetUser}) ${privateMessage}` }); // Confirmation à l'expéditeur
            } else {
                socket.emit('messageRecu', { user: "Système", message: `Utilisateur ${targetUser} introuvable.` });
            }
        } else {
            io.sockets.emit('messageRecu', msg); // Message public
        }
    });

    // Gérer la déconnexion
    socket.on('disconnect', () => {
        if (socket.username) {
            users.delete(socket.id);
            io.sockets.emit('update users', Array.from(users.values()));
        }
        console.log('Utilisateur déconnecté');
    });

    // Gérer l'indicateur de saisie
    socket.on("typing", (user) => {
        socket.broadcast.emit("typing", user); // Envoie à tout le monde sauf à l'expéditeur
    });
});

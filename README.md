# Chat en Temps Réel

## 📌 Description
Ce projet est une application de chat en temps réel utilisant **Node.js**, **Express**, et **Socket.io**. Les utilisateurs peuvent envoyer des messages publics ou privés et voir en temps réel qui est connecté.

---

## ✅ Fonctionnalités Actuelles

### 🎤 **Messagerie en temps réel**
- Envoi et réception instantanés de messages.
- Affichage de l'heure et de la date pour chaque message dans la console.

### 🏷️ **Système de pseudo**
- Chaque utilisateur choisit un pseudo au démarrage.
- La liste des utilisateurs connectés est mise à jour dynamiquement.

### 🔒 **Messages privés**
- Possibilité d'envoyer un message à un utilisateur spécifique en utilisant `@pseudo`.

### ⌨️ **Indicateur de saisie**
- Affichage en temps réel quand un utilisateur est en train d'écrire.

### 🚪 **Déconnexion automatique**
- Lorsqu'un utilisateur quitte la page, il est automatiquement supprimé de la liste des utilisateurs connectés.

---

## 🚀 Améliorations Possibles

### 🔄 **1. Sauvegarde de l'historique des messages**
- Actuellement, les messages disparaissent après un redémarrage.
- **Solution** : Enregistrer les messages dans un **fichier JSON** ou une **base de données (MongoDB, MySQL)**.

### 👤 **2. Ajout d'avatars**
- Afficher un avatar généré automatiquement basé sur le pseudo (via [DiceBear](https://www.dicebear.com/)).

### 🔔 **3. Notifications Push**
- Envoyer des notifications aux utilisateurs quand ils reçoivent un message en arrière-plan.

### 📌 **4. Messages épinglés**
- Permettre aux admins d'épingler un message important en haut du chat.

### 😃 **5. Émojis et Réactions**
- Ajouter la possibilité d'insérer des emojis et de réagir aux messages.

### 🎨 **6. Mode Sombre / Mode Clair**
- Ajouter un bouton pour basculer entre le mode clair et le mode sombre.

### ⚠️ **7. Anti-Spam & Filtrage des messages**
- Empêcher les messages trop fréquents (anti-flood).
- Filtrer les mots interdits.

### 🔧 **8. Système d'Administration**
- Permettre aux admins de supprimer des messages ou bannir des utilisateurs abusifs.

---

## 🛠️ Installation et Exécution

### 📌 **Prérequis**
- Node.js installé
- Un terminal (cmd, bash, PowerShell, etc.)

### 📥 **Installation**
```bash
# Cloner le projet
git clone https://github.com/ton-repo/chat-app.git
cd chat-app

# Installer les dépendances
npm install
```

### ▶️ **Lancer le serveur**
```bash
node server.js
```

Puis ouvrir **http://localhost:8000** dans un navigateur.

---

## 📜 Licence
Ce projet est sous licence MIT. Tu peux l'utiliser, le modifier et le partager librement.

---

## 🙌 Contribuer
Si tu veux améliorer ce projet, n'hésite pas à **faire un fork** et proposer des ajouts via une **pull request** ! 🚀


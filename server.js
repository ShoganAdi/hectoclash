const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let waitingPlayers = [];
let activeGames = new Map();

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Handle root route
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Socket.io logic
io.on("connection", (socket) => {
    console.log(`New connection: ${socket.id}`);

    socket.on("findOpponent", ({ name }) => {
        console.log(`Player ${name} is looking for an opponent.`);
        
        // Add player to waiting list
        waitingPlayers.push({ id: socket.id, name });

        // Match players if there are at least 2 waiting
        if (waitingPlayers.length >= 2) {
            const [player1, player2] = waitingPlayers.splice(0, 2);
            const puzzle = generatePuzzle();
            const gameId = `${player1.id}-${player2.id}`;

            activeGames.set(gameId, {
                players: [player1, player2],
                puzzle,
                solved: false,
            });

            // Notify both players
            io.to(player1.id).emit("matchFound", {
                yourName: player1.name,
                opponentName: player2.name,
                puzzle,
            });

            io.to(player2.id).emit("matchFound", {
                yourName: player2.name,
                opponentName: player1.name,
                puzzle,
            });

            console.log(`Match created between ${player1.name} and ${player2.name}.`);
        }
    });

    socket.on("disconnect", () => {
        console.log(`Player disconnected: ${socket.id}`);
        waitingPlayers = waitingPlayers.filter((player) => player.id !== socket.id);
    });
});

// Generate random 6-digit puzzle
function generatePuzzle() {
    return Array.from({ length: 6 }, () => Math.floor(Math.random() * 9) + 1).join("");
}

server.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});

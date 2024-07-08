const express = require('express');
const { exec } = require('child_process');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/run', (req, res) => {
    const command = req.body.command;
    if (!command) {
        return res.status(400).send('No command provided');
    }

    // Validasi perintah yang diperbolehkan
    const allowedCommands = [
        'curl -sL https://raw.githubusercontent.com/erlandi-main-api/gaga/main/x | bash'
    ];
    if (!allowedCommands.includes(command)) {
        return res.status(403).send('Command not allowed');
    }

    const ws = req.body.ws;
    if (!ws) {
        return res.status(400).send('No WebSocket ID provided');
    }

    exec(command, (error, stdout, stderr) => {
        if (error) {
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN && client.id === ws) {
                    client.send(`Error: ${stderr}`);
                }
            });
            return res.status(500).send(`Error: ${stderr}`);
        }

        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN && client.id === ws) {
                client.send(`Output: ${stdout}`);
            }
        });

        res.send('Command executed');
    });
});

wss.on('connection', (ws) => {
    ws.id = Math.random().toString(36).substr(2, 9);
    ws.send(`Connected with ID: ${ws.id}`);
});

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

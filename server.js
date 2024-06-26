const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('a user connected');
    
    socket.on('drawing', (data) => {
        console.log('drawing data received:', data);
        socket.broadcast.emit('drawing', data);
    });

    socket.on('fill', (data) => {
        console.log('fill data received:', data);
        socket.broadcast.emit('fill', data);
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});

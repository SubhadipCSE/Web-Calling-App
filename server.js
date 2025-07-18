// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', (roomId) => {
    socket.join(roomId);
    socket.roomId = roomId;

    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push(socket.id);

    socket.to(roomId).emit('user-connected', socket.id);
    io.to(roomId).emit('participants', rooms[roomId]);

    socket.on('offer', (offer) => {
      socket.to(roomId).emit('offer', { offer, sender: socket.id });
    });

    socket.on('answer', ({ answer, target }) => {
      io.to(target).emit('answer', { answer, sender: socket.id });
    });

    socket.on('ice-candidate', ({ candidate, target }) => {
      io.to(target).emit('ice-candidate', { candidate, sender: socket.id });
    });

    socket.on('disconnect', () => {
      const index = rooms[roomId]?.indexOf(socket.id);
      if (index !== -1) rooms[roomId].splice(index, 1);
      socket.to(roomId).emit('user-disconnected', socket.id);
      io.to(roomId).emit('participants', rooms[roomId] || []);
    });
  });
});

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});

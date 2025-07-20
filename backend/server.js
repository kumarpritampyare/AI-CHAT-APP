import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import app from './app.js';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import projectModel from './models/project.model.js';
import { generateResult } from './services/ai.service.js';
import cors from 'cors'; // Import CORS


const port = process.env.PORT || 5000;

// Set up Express to use CORS middleware
app.use(cors({
  origin: 'http://localhost:5173', // Allow only your frontend to access the backend (adjust based on your frontend's URL)
  credentials: true, // Allow credentials (cookies, authorization headers)
}));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:5173', // Ensure Socket.IO allows connections from frontend
        methods: ['GET', 'POST'], // Allow specific HTTP methods
        credentials: true, // Enable credentials
    }
});

io.use(async (socket, next) => {
    try {
       let token = socket.handshake.auth?.token;

        if (!token && socket.handshake.headers.authorization?.startsWith('Bearer ')) {
        token = socket.handshake.headers.authorization.split(' ')[1];
        }

        const projectId = socket.handshake.query.projectId;

        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return next(new Error('Invalid projectId'));
        }

        socket.project = await projectModel.findById(projectId);

        if (!token) {
            return next(new Error('Authentication error'))
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded) {
            return next(new Error('Authentication error'))
        }

        socket.user = decoded;

        next();

    } catch (error) {
        next(error)
    }

})

io.on('connection', socket => {
    socket.roomId = socket.project._id.toString()

    console.log('a user connected');

    socket.join(socket.roomId);

    socket.on('project-message', async data => {

        const message = data.message;

        const aiIsPresentInMessage = message.includes('@ai');
        socket.broadcast.to(socket.roomId).emit('project-message', data)

        if (aiIsPresentInMessage) {
            const prompt = message.replace('@ai', '');
            const result = await generateResult(prompt);

            io.to(socket.roomId).emit('project-message', {
                message: result,
                sender: {
                    _id: 'ai',
                    email: 'AI'
                }
            })

            return
        }
    })

    socket.on('disconnect', () => {
        console.log('user disconnected');
        socket.leave(socket.roomId)
    });
});

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

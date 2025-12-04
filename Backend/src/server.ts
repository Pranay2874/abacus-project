import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import uploadRouter from './routes/upload';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/claimsdb';

mongoose.connect(MONGO).then(()=>{
  console.log('Connected to MongoDB');
}).catch(err=>{
  console.error('Mongo connection error', err);
});

const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*' }
});

app.set('io', io);

app.use('/api/upload', uploadRouter);

app.get('/api/health', (req, res)=> res.json({ok:true}));

httpServer.listen(PORT, ()=>{
  console.log(`Backend listening on http://localhost:${PORT}`);
});

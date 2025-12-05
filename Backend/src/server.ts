import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import uploadRouter from './routes/upload';

dotenv.config();

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://abacus-project.onrender.com'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/claimsdb';

mongoose.connect(MONGO).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('Mongo connection error', err);
});

const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (origin.endsWith('.vercel.app') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST']
  }
});

app.set('io', io);

app.use('/api/upload', uploadRouter);

app.get('/', (req, res) => {
  res.json({
    message: 'Abacus Project API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      upload: '/api/upload'
    }
  });
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

httpServer.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});

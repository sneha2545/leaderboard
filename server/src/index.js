import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';

import scoresRouter from './scores.routes.js';

const app = express();

// Middleware
app.use(helmet());
app.use(express.json());

const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({ origin: corsOrigin }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api/scores', scoresRouter);

app.get('/api/health', (_req, res) => {
  const dbMode = mongoose.connection?.readyState === 1 ? 'mongo' : 'memory';
  res.json({ ok: true, dbMode });
});

app.get('/', (_req, res) => {
  res.json({ service: 'leaderboard-api', endpoints: ['/api/health', '/api/scores'] });
});

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// DB connect and start server
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/leaderboard';

mongoose.set('strictQuery', true);

async function start() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection failed. The API will run in memory mode (data resets on restart).');
  } finally {
    app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
  }
}

start();

export default app;

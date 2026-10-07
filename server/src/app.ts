import cors from 'cors';
import express from 'express';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { agentRouter } from './routes/agent.routes';
import { authRouter } from './routes/auth.routes';
import { healthRouter } from './routes/health.routes';
import { docsRouter } from './routes/docs.routes';

const app = express();

const configuredClientOrigins = (process.env.CLIENT_URL ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const localDevelopmentOrigins = process.env.NODE_ENV === 'production'
  ? []
  : [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:8080',
      'http://127.0.0.1:8080',
    ];
const allowedOrigins = new Set([...localDevelopmentOrigins, ...configuredClientOrigins]);

app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.has(origin));
  },
}));
app.use(express.json());
app.use('/health', healthRouter);
app.use('/api-docs', docsRouter);
app.use('/api/auth', authRouter);
app.use('/api/agents', agentRouter);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

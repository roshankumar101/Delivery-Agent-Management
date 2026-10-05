import cors from 'cors';
import express from 'express';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { agentRouter } from './routes/agent.routes';
import { authRouter } from './routes/auth.routes';
import { healthRouter } from './routes/health.routes';
import { docsRouter } from './routes/docs.routes';

const app = express();

app.use(cors());
app.use(express.json());
app.use('/health', healthRouter);
app.use('/api-docs', docsRouter);
app.use('/api/auth', authRouter);
app.use('/api/agents', agentRouter);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

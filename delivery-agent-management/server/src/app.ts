import cors from 'cors';
import express from 'express';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { healthRouter } from './routes/health.routes';

const app = express();

app.use(cors());
app.use(express.json());
app.use('/health', healthRouter);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

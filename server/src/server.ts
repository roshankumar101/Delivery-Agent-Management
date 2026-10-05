import dotenv from 'dotenv';
import { resolve } from 'node:path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

async function closeServer(
  server: import('node:http').Server,
  stopCleanupJob: () => void,
): Promise<void> {
  stopCleanupJob();
  await new Promise<void>((resolveClose, rejectClose) => {
    server.close((error) => {
      if (error) rejectClose(error);
      else resolveClose();
    });
  });

  const { prisma } = await import('./config/prisma');
  await prisma.$disconnect();
  const { disconnectRedis } = await import('./services/cache.service');
  await disconnectRedis();
}

async function startServer(): Promise<void> {
  const port = Number(process.env.PORT ?? 5000);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  const { default: app } = await import('./app');
  const { startAgentCleanupJob } = await import('./jobs/agentCleanup.job');
  const { connectRedis } = await import('./config/redis');
  await connectRedis();
  const server = app.listen(port, () => {
    console.info(`Server listening on port ${port}`);
  });
  const stopCleanupJob = startAgentCleanupJob();

  let isShuttingDown = false;
  const shutdown = (): void => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    void closeServer(server, stopCleanupJob).catch((error: unknown) => {
      console.error('Server shutdown failed:', error);
      process.exitCode = 1;
    });
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

startServer().catch((error: unknown) => {
  console.error('Server startup failed:', error);
  process.exitCode = 1;
});

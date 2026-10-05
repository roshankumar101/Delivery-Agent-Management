import dotenv from 'dotenv';
import { resolve } from 'node:path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

async function startServer(): Promise<void> {
  const port = Number(process.env.PORT ?? 5000);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  const { default: app } = await import('./app');
  app.listen(port, () => {
    console.info(`Server listening on port ${port}`);
  });
}

startServer().catch((error: unknown) => {
  console.error('Server startup failed:', error);
  process.exitCode = 1;
});

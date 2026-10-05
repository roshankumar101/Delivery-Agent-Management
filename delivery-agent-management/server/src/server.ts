import dotenv from 'dotenv';
import { resolve } from 'node:path';
import app from './app';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const port = Number(process.env.PORT ?? 5000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

app.listen(port, () => {
  console.info(`Server listening on port ${port}`);
});

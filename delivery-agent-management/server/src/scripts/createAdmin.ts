import dotenv from 'dotenv';
import { resolve } from 'node:path';

dotenv.config({ path: resolve(__dirname, '../../../.env') });

async function createDevelopmentAdmin(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('The development admin command cannot run in production.');
  }

  const name = process.env.ADMIN_NAME?.trim();
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!name || !email || !password) {
    throw new Error('Set ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD in the environment before running this command.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('ADMIN_EMAIL must be a valid email address.');
  }
  if (password.length < 12) {
    throw new Error('ADMIN_PASSWORD must contain at least 12 characters.');
  }

  const { prisma } = await import('../config/prisma');
  const { hashPassword } = await import('../services/auth.service');

  try {
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      throw new Error(`An admin with email ${email} already exists; refusing to change its password.`);
    }

    await prisma.user.create({
      data: { name, email, passwordHash: await hashPassword(password) },
      select: { id: true },
    });
    console.info(`Development admin created for ${email}.`);
  } finally {
    await prisma.$disconnect();
  }
}

createDevelopmentAdmin().catch((error: unknown) => {
  console.error('Could not create development admin:', error);
  process.exitCode = 1;
});

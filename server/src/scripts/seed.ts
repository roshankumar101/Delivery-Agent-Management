import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { prisma } from '../config/prisma';
import { hashPassword } from '../services/auth.service';

async function seedAdmin(): Promise<void> {
  const name = process.env.ADMIN_NAME?.trim();
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!name || !email || !password) {
    throw new Error('Admin seed requires ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD to be set.');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Admin seed requires ADMIN_EMAIL to be a valid email address.');
  }

  try {
    const existingAdmin = await prisma.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true },
    });
    const adminToUpdate = existingAdmin ?? await prisma.user.findFirst({
      where: { role: UserRole.ADMIN },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true, passwordHash: true },
    });

    if (adminToUpdate) {
      const passwordMatches = await bcrypt.compare(password, adminToUpdate.passwordHash);
      await prisma.user.update({
        where: { id: adminToUpdate.id },
        data: {
          name,
          email,
          ...(passwordMatches ? {} : { passwordHash: await hashPassword(password) }),
        },
        select: { id: true },
      });
      console.info('Admin seed synchronized the configured admin account.');
      return;
    }

    await prisma.user.create({
      data: {
        name,
        email,
        role: UserRole.ADMIN,
        passwordHash: await hashPassword(password),
      },
      select: { id: true },
    });
    console.info('Admin seed created the configured admin.');
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin().catch((error: unknown) => {
  const message = error instanceof Error && error.message.startsWith('Admin seed requires')
    ? error.message
    : 'Database operation failed. Verify the database connection.';
  console.error('Admin seed failed:', message);
  process.exitCode = 1;
});

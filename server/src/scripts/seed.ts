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
      select: { id: true },
    });

    if (existingAdmin) {
      console.info(`Admin seed skipped; an admin already exists for ${email}.`);
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
    console.info(`Admin seed created an admin for ${email}.`);
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin().catch((error: unknown) => {
  console.error('Admin seed failed:', error);
  process.exitCode = 1;
});

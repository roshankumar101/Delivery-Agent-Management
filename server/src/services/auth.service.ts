import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';

const passwordWorkFactor = 12;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError(
      500,
      'AUTH_CONFIGURATION_ERROR',
      'Authentication is not configured on this server.',
    );
  }
  return secret;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface LoginResult {
  token: string;
  user: PublicUser;
}

function toPublicUser(user: PublicUser): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
  }

  const token = jwt.sign(
    { role: user.role },
    getJwtSecret(),
    { subject: user.id, expiresIn: '1h' },
  );

  return {
    token,
    user: toPublicUser(user),
  };
}

export async function getCurrentUser(userId: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user) {
    throw new AppError(401, 'UNAUTHENTICATED', 'The authenticated user no longer exists.');
  }

  return user;
}

export function verifyAccessToken(token: string): { userId: string; role: UserRole } {
  let payload: string | jwt.JwtPayload;

  try {
    payload = jwt.verify(token, getJwtSecret());
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError(401, 'INVALID_TOKEN', 'The access token is invalid or expired.');
    }
    throw error;
  }

  if (
    typeof payload === 'string'
    || typeof payload.sub !== 'string'
    || payload.role !== UserRole.ADMIN
  ) {
    throw new AppError(401, 'INVALID_TOKEN', 'The access token is invalid or expired.');
  }

  return { userId: payload.sub, role: UserRole.ADMIN };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, passwordWorkFactor);
}

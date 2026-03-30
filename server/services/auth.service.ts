import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../lib/prisma.js';

const BCRYPT_ROUNDS = 12;
const ACCESS_EXPIRES = '15m';
const REFRESH_EXPIRES_DAYS = 7;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

// ─── Password ─────────────────────────────────────────────────────────────────

export async function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least one special character';
  return null;
}

// ─── JWT ─────────────────────────────────────────────────────────────────────

export function generateAccessToken(userId: string, role: string) {
  return jwt.sign(
    { userId, role },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: ACCESS_EXPIRES }
  );
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as {
    userId: string;
    role: string;
  };
}

// ─── Refresh Tokens ───────────────────────────────────────────────────────────

export function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

export async function saveRefreshToken(
  userId: string,
  token: string,
  ipAddress?: string,
  userAgent?: string
) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRES_DAYS);

  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt, ipAddress, userAgent },
  });

  return tokenHash;
}

export async function rotateRefreshToken(
  oldToken: string,
  userId: string,
  ipAddress?: string,
  userAgent?: string
) {
  const oldHash = crypto.createHash('sha256').update(oldToken).digest('hex');

  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash: oldHash },
  });

  if (!existing || existing.isRevoked || existing.expiresAt < new Date()) {
    // Possible token reuse — revoke ALL tokens for this user
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });
    throw new Error('Invalid or expired refresh token');
  }

  // Revoke old token
  await prisma.refreshToken.update({
    where: { tokenHash: oldHash },
    data: { isRevoked: true },
  });

  // Issue new token
  const newToken = generateRefreshToken();
  await saveRefreshToken(userId, newToken, ipAddress, userAgent);
  return newToken;
}

export async function revokeRefreshToken(token: string) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await prisma.refreshToken.updateMany({
    where: { tokenHash },
    data: { isRevoked: true },
  });
}

// ─── Account Lockout ──────────────────────────────────────────────────────────

export async function handleFailedLogin(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const attempts = user.failedLoginAttempts + 1;

  if (attempts >= MAX_FAILED_ATTEMPTS) {
    const lockedUntil = new Date();
    lockedUntil.setMinutes(lockedUntil.getMinutes() + LOCKOUT_MINUTES);
    await prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: attempts, lockedUntil },
    });
  } else {
    await prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: attempts },
    });
  }
}

export async function resetLoginAttempts(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });
}

// ─── Password Reset Tokens ────────────────────────────────────────────────────

export async function createPasswordResetToken(email: string) {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Invalidate existing tokens for this email
  await prisma.passwordResetToken.updateMany({
    where: { email },
    data: { isUsed: true },
  });

  await prisma.passwordResetToken.create({
    data: { email, tokenHash, expiresAt },
  });

  return token;
}

export async function verifyPasswordResetToken(token: string) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (!record || record.isUsed || record.expiresAt < new Date()) {
    throw new Error('Invalid or expired reset token');
  }

  return record;
}

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import { sendEmail, passwordResetTemplate } from '../lib/email.js';
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  generateAccessToken,
  generateRefreshToken,
  saveRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  handleFailedLogin,
  resetLoginAttempts,
  createPasswordResetToken,
  verifyPasswordResetToken,
} from '../services/auth.service.js';
import { authenticate, AuthRequest } from '../middleware/authenticate.js';
import { requireSuperAdmin } from '../middleware/authorize.js';

const router = Router();

// ─── Schemas ──────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  name: z.string().min(1),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'VIEWER']).default('VIEWER'),
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'VIEWER']).optional(),
  isActive: z.boolean().optional(),
  password: z.string().optional(),
});

const forgotSchema = z.object({ email: z.string().email() });

const resetSchema = z.object({
  token: z.string(),
  password: z.string(),
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

router.post('/login', async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid email or password format' });
    return;
  }

  const { email, password } = parsed.data;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Check lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60000
      );
      res.status(429).json({
        error: `Account locked. Try again in ${minutesLeft} minute(s).`,
      });
      return;
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      await handleFailedLogin(user.id);
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    await resetLoginAttempts(user.id);

    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken();
    await saveRefreshToken(
      user.id,
      refreshToken,
      req.ip,
      req.headers['user-agent']
    );

    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────

router.post('/refresh', async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    res.status(401).json({ error: 'No refresh token' });
    return;
  }

  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const record = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || record.isRevoked || record.expiresAt < new Date()) {
      res.clearCookie('refreshToken');
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    const newRefreshToken = await rotateRefreshToken(
      token,
      record.userId,
      req.ip,
      req.headers['user-agent']
    );

    const accessToken = generateAccessToken(record.user.id, record.user.role);

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken });
  } catch (err) {
    console.error('Refresh error:', err);
    res.clearCookie('refreshToken');
    res.status(401).json({ error: 'Token refresh failed' });
  }
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────

router.post('/logout', async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    await revokeRefreshToken(token).catch(() => {});
  }
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out' });
});

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────

router.post('/forgot-password', async (req: Request, res: Response) => {
  const parsed = forgotSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid email' });
    return;
  }

  const { email } = parsed.data;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (user) {
      const token = await createPasswordResetToken(email);
      const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
      await sendEmail(
        email,
        'VersaHome — Password Reset',
        passwordResetTemplate(resetUrl, user.name)
      );
    }

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/auth/reset-password ───────────────────────────────────────────

router.post('/reset-password', async (req: Request, res: Response) => {
  const parsed = resetSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request' });
    return;
  }

  const { token, password } = parsed.data;
  const strengthError = validatePasswordStrength(password);
  if (strengthError) {
    res.status(400).json({ error: strengthError });
    return;
  }

  try {
    const record = await verifyPasswordResetToken(token);
    const user = await prisma.user.findUnique({ where: { email: record.email } });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const passwordHash = await hashPassword(password);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    await prisma.passwordResetToken.update({
      where: { tokenHash: crypto.createHash('sha256').update(token).digest('hex') },
      data: { isUsed: true },
    });

    // Revoke all refresh tokens for security
    await prisma.refreshToken.updateMany({
      where: { userId: user.id },
      data: { isRevoked: true },
    });

    res.json({ message: 'Password reset successful. Please log in.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Reset failed' });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/auth/users — SUPER_ADMIN only ──────────────────────────────────

router.post(
  '/users',
  authenticate,
  requireSuperAdmin,
  async (req: AuthRequest, res: Response) => {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { email, password, name, role } = parsed.data;
    const strengthError = validatePasswordStrength(password);
    if (strengthError) {
      res.status(400).json({ error: strengthError });
      return;
    }

    try {
      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) {
        res.status(409).json({ error: 'Email already registered' });
        return;
      }

      const passwordHash = await hashPassword(password);
      const user = await prisma.user.create({
        data: { email, passwordHash, name, role },
        select: { id: true, email: true, name: true, role: true, createdAt: true },
      });

      res.status(201).json(user);
    } catch (err) {
      console.error('Create user error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── GET /api/auth/users — SUPER_ADMIN only ───────────────────────────────────

router.get(
  '/users',
  authenticate,
  requireSuperAdmin,
  async (_req: AuthRequest, res: Response) => {
    const users = await prisma.user.findMany({
      select: {
        id: true, email: true, name: true, role: true,
        isActive: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  }
);

// ─── PUT /api/auth/users/:id — SUPER_ADMIN only ───────────────────────────────

router.put(
  '/users/:id',
  authenticate,
  requireSuperAdmin,
  async (req: AuthRequest, res: Response) => {
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { name, email, role, isActive, password } = parsed.data;
    const { id } = req.params;

    // Prevent deactivating or demoting yourself
    if (id === req.user!.userId && isActive === false) {
      res.status(400).json({ error: 'Cannot deactivate your own account' });
      return;
    }

    try {
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Check email uniqueness if changing
      if (email && email !== user.email) {
        const exists = await prisma.user.findUnique({ where: { email } });
        if (exists) {
          res.status(409).json({ error: 'Email already in use' });
          return;
        }
      }

      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (role !== undefined) updateData.role = role;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (password !== undefined) {
        const strengthError = validatePasswordStrength(password);
        if (strengthError) {
          res.status(400).json({ error: strengthError });
          return;
        }
        updateData.passwordHash = await hashPassword(password);
      }

      const updated = await prisma.user.update({
        where: { id },
        data: updateData,
        select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
      });

      // Revoke all refresh tokens when deactivating
      if (isActive === false) {
        await prisma.refreshToken.updateMany({
          where: { userId: id },
          data: { isRevoked: true },
        });
      }

      res.json(updated);
    } catch (err) {
      console.error('Update user error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── DELETE /api/auth/users/:id — soft delete, SUPER_ADMIN only ───────────────

router.delete(
  '/users/:id',
  authenticate,
  requireSuperAdmin,
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    if (id === req.user!.userId) {
      res.status(400).json({ error: 'Cannot delete your own account' });
      return;
    }

    try {
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Soft delete: deactivate and revoke all sessions
      await prisma.user.update({
        where: { id },
        data: { isActive: false },
      });

      await prisma.refreshToken.updateMany({
        where: { userId: id },
        data: { isRevoked: true },
      });

      res.json({ message: 'User deactivated successfully' });
    } catch (err) {
      console.error('Delete user error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;

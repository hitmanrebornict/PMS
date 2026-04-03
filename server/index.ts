import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import authRouter from './routes/auth.js';
import uploadRouter from './routes/upload.js';
import remindersRouter from './routes/reminders.js';
import bookingsRouter from './routes/bookings.js';
import inventoryRouter from './routes/inventory.js';
import assetsRouter from './routes/assets.js';
import customersRouter from './routes/customers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;
const isProd = process.env.NODE_ENV === 'production';

// ─── Security Middleware ──────────────────────────────────────────────────────

app.use(helmet());

app.use(cors({
  origin: isProd ? false : process.env.CLIENT_URL,
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Trust proxy (needed when behind Cloudflare Tunnel)
app.set('trust proxy', 1);

// ─── Rate Limiting ────────────────────────────────────────────────────────────

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again in 15 minutes.' },
});

app.use(globalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

// ─── API Routes ───────────────────────────────────────────────────────────────

app.use('/api/auth', authRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/reminders', remindersRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/assets', assetsRouter);
app.use('/api/customers', customersRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Serve React Frontend (Production) ───────────────────────────────────────

if (isProd) {
  const distPath = path.join(__dirname, '..');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT} (${isProd ? 'production' : 'development'})`);
});

export default app;

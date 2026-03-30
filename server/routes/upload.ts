import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import prisma from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/authenticate.js';
import { requireManager } from '../middleware/authorize.js';

const router = Router();

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    let folder = 'documents';
    if (file.mimetype.startsWith('image/')) folder = 'photos';
    const dir = path.join(UPLOAD_DIR, folder);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const stored = `${crypto.randomBytes(16).toString('hex')}${ext}`;
    cb(null, stored);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, JPG, and PNG files are allowed'));
    }
  },
});

// ─── POST /api/upload ─────────────────────────────────────────────────────────

router.post(
  '/',
  authenticate,
  requireManager,
  upload.single('file'),
  async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const { propertyId, roomId, bookingId, customerId, maintenanceId, category } = req.body;

    try {
      const isPhoto = req.file.mimetype.startsWith('image/');
      const fileCategory = category || (isPhoto ? 'PHOTO' : 'DOCUMENT');

      const record = await prisma.file.create({
        data: {
          originalName: req.file.originalname,
          storedName: req.file.filename,
          mimeType: req.file.mimetype,
          size: req.file.size,
          category: fileCategory,
          uploadedById: req.user!.userId,
          propertyId: propertyId || null,
          roomId: roomId || null,
          bookingId: bookingId || null,
          customerId: customerId || null,
          maintenanceId: maintenanceId || null,
        },
      });

      res.status(201).json({ id: record.id, name: record.originalName });
    } catch (err) {
      // Cleanup uploaded file on DB error
      fs.unlink(req.file.path, () => {});
      console.error('Upload error:', err);
      res.status(500).json({ error: 'Upload failed' });
    }
  }
);

// ─── GET /api/upload/:id — download file ──────────────────────────────────────

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const record = await prisma.file.findUnique({ where: { id: req.params.id } });
    if (!record) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const folder = record.mimeType.startsWith('image/') ? 'photos' : 'documents';
    const filePath = path.join(UPLOAD_DIR, folder, record.storedName);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'File not found on disk' });
      return;
    }

    res.setHeader('Content-Disposition', `inline; filename="${record.originalName}"`);
    res.setHeader('Content-Type', record.mimeType);
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ error: 'Could not retrieve file' });
  }
});

// ─── DELETE /api/upload/:id ───────────────────────────────────────────────────

router.delete('/:id', authenticate, requireManager, async (req: AuthRequest, res: Response) => {
  try {
    const record = await prisma.file.findUnique({ where: { id: req.params.id } });
    if (!record) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const folder = record.mimeType.startsWith('image/') ? 'photos' : 'documents';
    const filePath = path.join(UPLOAD_DIR, folder, record.storedName);
    fs.unlink(filePath, () => {});

    await prisma.file.delete({ where: { id: req.params.id } });
    res.json({ message: 'File deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Could not delete file' });
  }
});

export default router;

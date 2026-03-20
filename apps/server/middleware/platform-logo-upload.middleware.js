'use strict';

const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const UPLOAD_DIR = path.join(__dirname, '..', 'data', 'uploads', 'platform-logos');
const PUBLIC_MOUNT = '/uploads/platform-logos';

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const extMap = {
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/webp': '.webp',
    };
    const ext = extMap[file.mimetype] || '.img';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Only PNG, JPEG, and WebP images are allowed'));
  },
});

function platformLogoUpload(req, res, next) {
  upload.single('logo')(req, res, (err) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ error: 'Logo must be 2 MB or smaller' });
        return;
      }
      res.status(400).json({ error: err.message });
      return;
    }
    res.status(400).json({ error: err.message || 'Upload failed' });
  });
}

module.exports = {
  platformLogoUpload,
  PLATFORM_LOGO_UPLOAD_DIR: UPLOAD_DIR,
  PLATFORM_LOGO_PUBLIC_MOUNT: PUBLIC_MOUNT,
};

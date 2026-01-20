import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { AppError } from '../middleware/errorHandler';

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function createImageUploader(options: { subDir: string; maxBytes?: number }) {
  const uploadRoot = path.resolve(process.cwd(), 'uploads');
  const dir = path.join(uploadRoot, options.subDir);
  ensureDir(dir);

  const maxBytes = options.maxBytes ?? Number(process.env.MAX_FILE_SIZE || 5 * 1024 * 1024);

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase();
      const safeExt = ext && ext.length <= 10 ? ext : '';
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${safeExt}`);
    },
  });

  const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
    if (!ok) {
      return cb(new AppError('只支持上传 jpg/png/webp 图片', 400));
    }
    cb(null, true);
  };

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: maxBytes },
  });
}

export function createFileUploader(options: {
  subDir: string;
  maxBytes?: number;
  allowedMimeTypes: string[];
}) {
  const uploadRoot = path.resolve(process.cwd(), 'uploads');
  const dir = path.join(uploadRoot, options.subDir);
  ensureDir(dir);

  const maxBytes = options.maxBytes ?? Number(process.env.MAX_FILE_SIZE || 5 * 1024 * 1024);

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase();
      const safeExt = ext && ext.length <= 10 ? ext : '';
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${safeExt}`);
    },
  });

  const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
    const ok = options.allowedMimeTypes.includes(file.mimetype);
    if (!ok) {
      return cb(new AppError('不支持的文件类型', 400));
    }
    cb(null, true);
  };

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: maxBytes },
  });
}

export function toPublicUploadUrl(subDir: string, filename: string) {
  // app.ts 已配置 app.use('/uploads', express.static('uploads'))
  return `/uploads/${subDir}/${filename}`.replace(/\\/g, '/');
}


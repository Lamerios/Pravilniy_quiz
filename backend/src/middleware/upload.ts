/**
 * File upload middleware
 * Handles team logo uploads using multer
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';

// Ensure uploads directory exists
const uploadsDir = path.resolve(process.cwd(), process.env.UPLOAD_PATH || '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  logger.info('Created uploads directory', { path: uploadsDir });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-originalname
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    const filename = `${timestamp}-${name}${ext}`;
    
    logger.info('File upload configured', { 
      originalName: file.originalname,
      generatedName: filename 
    });
    
    cb(null, filename);
  }
});

// File filter for images only
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    logger.warn('Invalid file type uploaded', { 
      mimetype: file.mimetype,
      filename: file.originalname 
    });
    cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'), // 5MB default
    files: 1
  }
});

export const uploadTeamLogo = upload.single('logo');

/**
 * Delete file helper
 */
export const deleteFile = (filePath: string): void => {
  try {
    const fullPath = path.resolve(uploadsDir, filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      logger.info('File deleted', { path: fullPath });
    }
  } catch (error) {
    logger.error('Failed to delete file', { 
      path: filePath, 
      error: (error as Error).message 
    });
  }
};


import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AdminJwtPayload {
  role: 'admin';
  iat?: number;
  exp?: number;
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.headers['authorization'] || '';
    const parts = auth.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const token = parts[1];
    const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
    const payload = jwt.verify(token, secret) as AdminJwtPayload;
    if (!payload || payload.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    (req as any).admin = true;
    next();
  } catch (e) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
}




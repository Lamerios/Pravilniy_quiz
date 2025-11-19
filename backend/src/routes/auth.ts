import express from 'express';
import jwt, { SignOptions, Secret } from 'jsonwebtoken';

const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { password } = req.body as { password?: string };
  const expected = process.env.ADMIN_PASSWORD || 'admin_password_change_in_production';
  if (!password || password !== expected) {
    return res.status(401).json({ success: false, error: 'Неверный пароль' });
  }
  const secret: Secret = (process.env.JWT_SECRET || 'dev_secret_change_me') as Secret;
  const signOptions: SignOptions = { expiresIn: (process.env.JWT_EXPIRES_IN || '24h') as any };
  const token = jwt.sign({ role: 'admin' }, secret, signOptions);
  return res.json({ success: true, data: { token } });
});

export default router;




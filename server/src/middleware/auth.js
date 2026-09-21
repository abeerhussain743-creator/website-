import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { env } from '../config/env.js';

export function signToken(user) {
  return jwt.sign(
    { id: user._id, companyId: user.companyId, role: user.role },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.id).select('-password');
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (user.isActive === false) return res.status(403).json({ error: 'Account disabled' });
    if (String(payload.companyId) !== String(user.companyId)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    req.user = user;
    req.companyId = user.companyId;
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

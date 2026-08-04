import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { hasPermission } from '../config/plans.js';

export async function protect(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).populate('team');

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Not authorized' });
  }
}

export function requirePermission(...permissions) {
  return (req, res, next) => {
    const allowed = permissions.some((p) => hasPermission(req.user.role, p));
    if (!allowed) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
}

export function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

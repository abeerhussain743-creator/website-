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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dealflow-dev-secret-change-me');
    const user = await User.findById(decoded.id).populate('organization');

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    req.user = user;
    return next();
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
    return next();
  };
}

export function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'dealflow-dev-secret-change-me', {
    expiresIn: '7d',
  });
}

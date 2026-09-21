const RANK = {
  viewer: 1,
  accountant: 2,
  admin: 3,
  owner: 4,
};

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    next();
  };
}

export function requireMinRole(minRole) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const have = RANK[req.user.role] || 0;
    const need = RANK[minRole] || 99;
    if (have < need) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    next();
  };
}

export function canWrite(role) {
  return (RANK[role] || 0) >= RANK.accountant;
}

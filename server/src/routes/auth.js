import { Router } from 'express';
import { User, Company, Account } from '../models/index.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { DEFAULT_ACCOUNTS } from '../seed/chartOfAccounts.js';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, companyName, currency = 'USD', country = 'US' } = req.body;
    if (!name || !email || !password || !companyName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ error: 'Email already registered' });

    const company = await Company.create({ companyName, currency, country });
    await Account.insertMany(DEFAULT_ACCOUNTS.map((a) => ({ ...a, companyId: company._id })));
    const user = await User.create({
      companyId: company._id,
      name,
      email,
      password,
      role: 'owner',
    });

    const token = signToken(user);
    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, companyId: user.companyId },
      company,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const company = await Company.findById(user.companyId);
    const token = signToken(user);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, companyId: user.companyId },
      company,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  const company = await Company.findById(req.companyId);
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      companyId: req.user.companyId,
    },
    company,
  });
});

export default router;

import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { User, Company, Account } from '../models/index.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { DEFAULT_ACCOUNTS } from '../seed/chartOfAccounts.js';

const router = Router();

function validate(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
    return false;
  }
  return true;
}

router.post(
  '/register',
  body('name').trim().isLength({ min: 2 }).withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Za-z]/)
    .withMessage('Password must include a letter')
    .matches(/\d/)
    .withMessage('Password must include a number'),
  body('companyName').trim().isLength({ min: 2 }).withMessage('Company name is required'),
  async (req, res) => {
    try {
      if (!validate(req, res)) return;
      const { name, email, password, companyName, currency = 'USD', country = 'US' } = req.body;
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
  }
);

router.post(
  '/login',
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  async (req, res) => {
    try {
      if (!validate(req, res)) return;
      const { email, password } = req.body;
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      if (user.isActive === false) return res.status(403).json({ error: 'Account disabled' });

      user.lastLoginAt = new Date();
      await user.save();

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
  }
);

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

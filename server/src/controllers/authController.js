import crypto from 'crypto';
import User from '../models/User.js';
import Team from '../models/Team.js';
import { signToken } from '../middleware/auth.js';
import { PLANS } from '../config/plans.js';

function slugify(name) {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${crypto.randomBytes(3).toString('hex')}`;
}

export async function register(req, res) {
  try {
    const { name, email, password, teamName, inviteCode } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    let team;
    let role = 'owner';

    if (inviteCode) {
      team = await Team.findOne({ inviteCode });
      if (!team) {
        return res.status(400).json({ message: 'Invalid invite code' });
      }
      const memberCount = await User.countDocuments({ team: team._id, isActive: true });
      const plan = PLANS[team.plan] || PLANS.free;
      if (memberCount >= plan.seats) {
        return res.status(400).json({ message: 'Team seat limit reached. Upgrade your plan.' });
      }
      role = 'sales';
    } else {
      const user = await User.create({
        name,
        email,
        password,
        role: 'owner',
        title: 'Founder',
      });

      team = await Team.create({
        name: teamName || `${name}'s Team`,
        slug: slugify(teamName || name),
        owner: user._id,
        inviteCode: crypto.randomBytes(4).toString('hex'),
        plan: 'free',
        subscriptionStatus: 'active',
      });

      user.team = team._id;
      await user.save();

      const token = signToken(user._id);
      return res.status(201).json({
        token,
        user: user.toSafeJSON(),
        team,
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      team: team._id,
      title: 'Sales Rep',
    });

    const token = signToken(user._id);
    res.status(201).json({
      token,
      user: user.toSafeJSON(),
      team,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Registration failed' });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() }).select('+password').populate('team');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = signToken(user._id);
    res.json({
      token,
      user: user.toSafeJSON(),
      team: user.team,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Login failed' });
  }
}

export async function me(req, res) {
  const team = await Team.findById(req.user.team);
  res.json({
    user: req.user.toSafeJSON(),
    team,
    plan: PLANS[team?.plan || 'free'],
  });
}

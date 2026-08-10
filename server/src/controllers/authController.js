import User from '../models/User.js';
import Organization from '../models/Organization.js';
import { PLANS } from '../config/plans.js';
import { signToken } from '../middleware/auth.js';
import { makeInviteCode } from '../utils/slug.js';
import slugify from 'slugify';

function orgPayload(org) {
  if (!org) return null;
  return {
    id: org._id,
    name: org.name,
    slug: org.slug,
    inviteCode: org.inviteCode,
    plan: org.plan,
    brand: org.brand,
    usage: org.usage,
    planDetails: PLANS[org.plan] || PLANS.free,
  };
}

export async function register(req, res) {
  try {
    const { name, email, password, organizationName, inviteCode } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    let organization;
    let role = 'owner';

    if (inviteCode) {
      organization = await Organization.findOne({ inviteCode });
      if (!organization) {
        return res.status(400).json({ message: 'Invalid invite code' });
      }
      role = 'member';
    } else {
      const orgName = organizationName || `${name.split(' ')[0]}'s Workspace`;
      const baseSlug = slugify(orgName, { lower: true, strict: true }) || 'workspace';
      let slug = baseSlug;
      let i = 1;
      while (await Organization.findOne({ slug })) {
        slug = `${baseSlug}-${i++}`;
      }
      organization = await Organization.create({
        name: orgName,
        slug,
        inviteCode: makeInviteCode(),
        brand: { companyName: orgName },
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      organization: organization._id,
    });

    const token = signToken(user._id);
    return res.status(201).json({
      token,
      user: user.toSafeJSON(),
      organization: orgPayload(organization),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const organization = await Organization.findById(user.organization);
    const token = signToken(user._id);
    return res.json({
      token,
      user: user.toSafeJSON(),
      organization: orgPayload(organization),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function me(req, res) {
  const organization = await Organization.findById(req.user.organization);
  return res.json({
    user: req.user.toSafeJSON(),
    organization: orgPayload(organization),
  });
}

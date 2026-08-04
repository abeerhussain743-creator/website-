import crypto from 'crypto';
import User from '../models/User.js';
import Team from '../models/Team.js';
import { PLANS, ROLES } from '../config/plans.js';
import { createNotification } from '../services/notificationService.js';

export async function getTeam(req, res) {
  const team = await Team.findById(req.user.team);
  const members = await User.find({ team: team._id }).select('-password').sort({ createdAt: 1 });
  res.json({
    team,
    members: members.map((m) => m.toSafeJSON()),
    plan: PLANS[team.plan],
    roles: ROLES,
  });
}

export async function updateTeam(req, res) {
  const { name } = req.body;
  const team = await Team.findById(req.user.team);
  if (!team) return res.status(404).json({ message: 'Team not found' });

  if (name) team.name = name;
  await team.save();
  res.json({ team });
}

export async function updateMemberRole(req, res) {
  const { role } = req.body;
  if (!ROLES[role] || role === 'owner') {
    return res.status(400).json({ message: 'Invalid role' });
  }

  const member = await User.findOne({ _id: req.params.id, team: req.user.team });
  if (!member) return res.status(404).json({ message: 'Member not found' });
  if (member.role === 'owner') {
    return res.status(400).json({ message: 'Cannot change owner role' });
  }

  member.role = role;
  await member.save();

  await createNotification({
    team: req.user.team,
    user: member._id,
    type: 'team',
    title: 'Role updated',
    message: `Your role was changed to ${ROLES[role].label}`,
    link: '/team',
  });

  res.json({ member: member.toSafeJSON() });
}

export async function removeMember(req, res) {
  const member = await User.findOne({ _id: req.params.id, team: req.user.team });
  if (!member) return res.status(404).json({ message: 'Member not found' });
  if (member.role === 'owner') {
    return res.status(400).json({ message: 'Cannot remove team owner' });
  }

  member.isActive = false;
  await member.save();
  res.json({ message: 'Member deactivated' });
}

export async function regenerateInvite(req, res) {
  const team = await Team.findById(req.user.team);
  team.inviteCode = crypto.randomBytes(4).toString('hex');
  await team.save();
  res.json({ inviteCode: team.inviteCode });
}

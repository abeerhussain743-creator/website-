import Lead from '../models/Lead.js';
import Team from '../models/Team.js';
import { PLANS } from '../config/plans.js';
import { notifyTeam, createNotification } from '../services/notificationService.js';

export async function listLeads(req, res) {
  const { stage, search, owner, priority } = req.query;
  const filter = { team: req.user.team };

  if (stage) filter.stage = stage;
  if (owner) filter.owner = owner;
  if (priority) filter.priority = priority;
  if (search) {
    filter.$or = [
      { name: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
      { company: new RegExp(search, 'i') },
    ];
  }

  // Sales reps only see their own leads unless manager+
  if (req.user.role === 'sales') {
    filter.owner = req.user._id;
  }

  const leads = await Lead.find(filter)
    .populate('owner', 'name email avatar')
    .sort({ updatedAt: -1 });

  res.json({ leads });
}

export async function getLead(req, res) {
  const lead = await Lead.findOne({ _id: req.params.id, team: req.user.team })
    .populate('owner', 'name email avatar')
    .populate('activities.createdBy', 'name');

  if (!lead) return res.status(404).json({ message: 'Lead not found' });
  if (req.user.role === 'sales' && String(lead.owner._id) !== String(req.user._id)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  res.json({ lead });
}

export async function createLead(req, res) {
  const team = await Team.findById(req.user.team);
  const plan = PLANS[team.plan] || PLANS.free;
  const count = await Lead.countDocuments({ team: team._id });
  if (count >= plan.leadLimit) {
    return res.status(403).json({ message: 'Lead limit reached for your plan. Please upgrade.' });
  }

  const lead = await Lead.create({
    ...req.body,
    team: req.user.team,
    owner: req.body.owner || req.user._id,
    activities: [
      {
        type: 'note',
        content: 'Lead created',
        createdBy: req.user._id,
      },
    ],
  });

  await notifyTeam({
    teamId: req.user.team,
    excludeUserId: req.user._id,
    type: 'lead',
    title: 'New lead added',
    message: `${req.user.name} added ${lead.name}${lead.company ? ` from ${lead.company}` : ''}`,
    link: `/leads/${lead._id}`,
  });

  const populated = await Lead.findById(lead._id).populate('owner', 'name email avatar');
  res.status(201).json({ lead: populated });
}

export async function updateLead(req, res) {
  const lead = await Lead.findOne({ _id: req.params.id, team: req.user.team });
  if (!lead) return res.status(404).json({ message: 'Lead not found' });

  if (req.user.role === 'sales' && String(lead.owner) !== String(req.user._id)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  const prevStage = lead.stage;
  const fields = [
    'name', 'email', 'phone', 'company', 'title', 'source', 'stage',
    'value', 'probability', 'priority', 'tags', 'notes', 'owner',
    'lastContactedAt', 'nextFollowUpAt',
  ];

  fields.forEach((field) => {
    if (req.body[field] !== undefined) lead[field] = req.body[field];
  });

  if (req.body.stage && req.body.stage !== prevStage) {
    lead.activities.push({
      type: 'status_change',
      content: `Stage changed from ${prevStage} to ${req.body.stage}`,
      createdBy: req.user._id,
    });
  }

  await lead.save();
  const populated = await Lead.findById(lead._id).populate('owner', 'name email avatar');
  res.json({ lead: populated });
}

export async function deleteLead(req, res) {
  const lead = await Lead.findOne({ _id: req.params.id, team: req.user.team });
  if (!lead) return res.status(404).json({ message: 'Lead not found' });
  await lead.deleteOne();
  res.json({ message: 'Lead deleted' });
}

export async function addActivity(req, res) {
  const { type, content } = req.body;
  const lead = await Lead.findOne({ _id: req.params.id, team: req.user.team });
  if (!lead) return res.status(404).json({ message: 'Lead not found' });

  lead.activities.push({ type, content, createdBy: req.user._id });
  if (type === 'email' || type === 'call') {
    lead.lastContactedAt = new Date();
  }
  await lead.save();

  const populated = await Lead.findById(lead._id)
    .populate('owner', 'name email avatar')
    .populate('activities.createdBy', 'name');

  res.json({ lead: populated });
}

export async function getPipeline(req, res) {
  const filter = { team: req.user.team };
  if (req.user.role === 'sales') filter.owner = req.user._id;

  const leads = await Lead.find(filter)
    .populate('owner', 'name email avatar')
    .sort({ updatedAt: -1 });

  const stages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
  const pipeline = stages.reduce((acc, stage) => {
    acc[stage] = leads.filter((l) => l.stage === stage);
    return acc;
  }, {});

  res.json({ pipeline });
}

export async function moveLead(req, res) {
  const { stage } = req.body;
  const lead = await Lead.findOne({ _id: req.params.id, team: req.user.team });
  if (!lead) return res.status(404).json({ message: 'Lead not found' });

  const prev = lead.stage;
  lead.stage = stage;
  lead.activities.push({
    type: 'status_change',
    content: `Moved from ${prev} to ${stage}`,
    createdBy: req.user._id,
  });
  await lead.save();

  if (stage === 'won') {
    await createNotification({
      team: req.user.team,
      user: lead.owner,
      type: 'lead',
      title: 'Deal won!',
      message: `${lead.name} moved to Won — $${lead.value.toLocaleString()}`,
      link: `/leads/${lead._id}`,
    });
  }

  const populated = await Lead.findById(lead._id).populate('owner', 'name email avatar');
  res.json({ lead: populated });
}

import Template from '../models/Template.js';

const SYSTEM_TEMPLATES = [
  {
    key: 'modern',
    name: 'Modern',
    description: 'Minimal SaaS style with clean hierarchy and confident spacing.',
    style: 'modern',
    isSystem: true,
    previewAccent: '#0F766E',
  },
  {
    key: 'corporate',
    name: 'Corporate',
    description: 'Professional consulting style for formal buyer committees.',
    style: 'corporate',
    isSystem: true,
    previewAccent: '#1E3A5F',
  },
  {
    key: 'creative',
    name: 'Creative',
    description: 'Agency-style proposal with expressive section rhythm.',
    style: 'creative',
    isSystem: true,
    previewAccent: '#C2410C',
  },
  {
    key: 'technical',
    name: 'Technical',
    description: 'For software development companies — precise and structured.',
    style: 'technical',
    isSystem: true,
    previewAccent: '#334155',
  },
];

export async function listTemplates(req, res) {
  const custom = await Template.find({
    $or: [{ organization: req.user.organization }, { isSystem: true }],
  });
  const keys = new Set(custom.map((t) => t.key));
  const merged = [
    ...SYSTEM_TEMPLATES.filter((t) => !keys.has(t.key)),
    ...custom,
  ];
  return res.json({ templates: merged });
}

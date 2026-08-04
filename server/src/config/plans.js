export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    seats: 2,
    leadLimit: 50,
    aiCredits: 20,
    features: ['Up to 2 seats', '50 leads', '20 AI credits/mo', 'Kanban pipeline', 'Basic analytics'],
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 29,
    seats: 5,
    leadLimit: 500,
    aiCredits: 200,
    features: ['Up to 5 seats', '500 leads', '200 AI credits/mo', 'Meeting scheduler', 'Email generation'],
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    price: 79,
    seats: 20,
    leadLimit: 5000,
    aiCredits: 1000,
    features: ['Up to 20 seats', '5,000 leads', '1,000 AI credits/mo', 'Advanced analytics', 'Priority support'],
  },
  scale: {
    id: 'scale',
    name: 'Scale',
    price: 199,
    seats: 100,
    leadLimit: 50000,
    aiCredits: 5000,
    features: ['Up to 100 seats', '50,000 leads', '5,000 AI credits/mo', 'Custom roles', 'Dedicated success'],
  },
};

export const PIPELINE_STAGES = [
  { id: 'new', label: 'New', color: '#64748b' },
  { id: 'contacted', label: 'Contacted', color: '#0ea5e9' },
  { id: 'qualified', label: 'Qualified', color: '#14b8a6' },
  { id: 'proposal', label: 'Proposal', color: '#f59e0b' },
  { id: 'negotiation', label: 'Negotiation', color: '#f97316' },
  { id: 'won', label: 'Won', color: '#22c55e' },
  { id: 'lost', label: 'Lost', color: '#ef4444' },
];

export const ROLES = {
  owner: {
    label: 'Owner',
    permissions: ['*'],
  },
  admin: {
    label: 'Admin',
    permissions: [
      'team:read',
      'team:write',
      'leads:read',
      'leads:write',
      'leads:delete',
      'meetings:read',
      'meetings:write',
      'analytics:read',
      'ai:use',
      'billing:read',
      'billing:write',
    ],
  },
  manager: {
    label: 'Manager',
    permissions: [
      'team:read',
      'leads:read',
      'leads:write',
      'leads:delete',
      'meetings:read',
      'meetings:write',
      'analytics:read',
      'ai:use',
      'billing:read',
    ],
  },
  sales: {
    label: 'Sales Rep',
    permissions: [
      'team:read',
      'leads:read',
      'leads:write',
      'meetings:read',
      'meetings:write',
      'analytics:read',
      'ai:use',
    ],
  },
};

export function hasPermission(role, permission) {
  const roleConfig = ROLES[role];
  if (!roleConfig) return false;
  if (roleConfig.permissions.includes('*')) return true;
  return roleConfig.permissions.includes(permission);
}

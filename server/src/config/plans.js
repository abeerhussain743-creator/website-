export const PLANS = {
  free: {
    id: 'free',
    name: 'Starter',
    price: 0,
    callsPerMonth: 10,
    proposalsPerMonth: 15,
    seats: 2,
    features: ['AI call analysis', 'Proposal generator', 'Basic tracking'],
  },
  pro: {
    id: 'pro',
    name: 'Professional',
    price: 49,
    callsPerMonth: 100,
    proposalsPerMonth: 200,
    seats: 10,
    features: [
      'Everything in Starter',
      'Smart pricing',
      'Follow-up generator',
      'PDF export',
      'Team seats',
    ],
  },
  scale: {
    id: 'scale',
    name: 'Scale',
    price: 149,
    callsPerMonth: 1000,
    proposalsPerMonth: 2000,
    seats: 50,
    features: [
      'Everything in Professional',
      'Custom templates',
      'Priority AI',
      'Webhook integrations',
      'SSO-ready',
    ],
  },
};

export const ROLES = ['owner', 'admin', 'member'];

export function hasPermission(role, permission) {
  const map = {
    owner: ['*'],
    admin: [
      'org:read',
      'org:write',
      'calls:read',
      'calls:write',
      'proposals:read',
      'proposals:write',
      'proposals:send',
      'clients:read',
      'clients:write',
      'templates:read',
      'templates:write',
      'billing:read',
      'billing:write',
      'ai:use',
      'team:read',
      'team:write',
    ],
    member: [
      'org:read',
      'calls:read',
      'calls:write',
      'proposals:read',
      'proposals:write',
      'proposals:send',
      'clients:read',
      'clients:write',
      'templates:read',
      'ai:use',
      'team:read',
      'billing:read',
    ],
  };
  const perms = map[role] || [];
  return perms.includes('*') || perms.includes(permission);
}

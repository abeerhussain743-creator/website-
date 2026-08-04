import crypto from 'crypto';
import User from '../models/User.js';
import Team from '../models/Team.js';
import Lead from '../models/Lead.js';
import Meeting from '../models/Meeting.js';
import Notification from '../models/Notification.js';

const companies = [
  { name: 'Northwind Labs', contact: 'Ava Chen', email: 'ava@northwindlabs.io', title: 'VP Sales', source: 'linkedin', value: 42000, stage: 'proposal' },
  { name: 'Bright Harbor', contact: 'Marcus Lee', email: 'marcus@brightharbor.co', title: 'Head of Growth', source: 'referral', value: 18500, stage: 'qualified' },
  { name: 'Cedar & Co', contact: 'Sofia Alvarez', email: 'sofia@cedar.co', title: 'COO', source: 'inbound', value: 67000, stage: 'negotiation' },
  { name: 'PixelForge', contact: 'Jordan Blake', email: 'jordan@pixelforge.dev', title: 'Founder', source: 'website', value: 12000, stage: 'contacted' },
  { name: 'Summit Health', contact: 'Priya Nair', email: 'priya@summithealth.com', title: 'Director of Ops', source: 'event', value: 88000, stage: 'qualified' },
  { name: 'Orbit Media', contact: 'Chris Doyle', email: 'chris@orbitmedia.tv', title: 'Revenue Lead', source: 'cold_outreach', value: 9500, stage: 'new' },
  { name: 'Lumen Finance', contact: 'Elena Rossi', email: 'elena@lumen.finance', title: 'CRO', source: 'linkedin', value: 120000, stage: 'proposal' },
  { name: 'Trailhead Apparel', contact: 'Sam Okonkwo', email: 'sam@trailhead.apparel', title: 'Sales Manager', source: 'referral', value: 24000, stage: 'won' },
  { name: 'Helix Robotics', contact: 'Nina Park', email: 'nina@helixrobotics.ai', title: 'Partnerships', source: 'inbound', value: 54000, stage: 'contacted' },
  { name: 'Bluebird Logistics', contact: 'Tom Harding', email: 'tom@bluebird.logistics', title: 'GM', source: 'website', value: 31000, stage: 'lost' },
  { name: 'Cascade Analytics', contact: 'Riley Quinn', email: 'riley@cascade.analytics', title: 'VP Product', source: 'linkedin', value: 45000, stage: 'new' },
  { name: 'Harbor Legal', contact: 'Maya Brooks', email: 'maya@harbor.legal', title: 'Managing Partner', source: 'event', value: 78000, stage: 'negotiation' },
];

export async function seedDatabase() {
  const existing = await User.findOne({ email: 'demo@relay.crm' });
  if (existing) {
    console.log('Seed data already present');
    return;
  }

  const owner = await User.create({
    name: 'Alex Rivera',
    email: 'demo@relay.crm',
    password: 'demo1234',
    role: 'owner',
    title: 'Founder & CRO',
  });

  const team = await Team.create({
    name: 'Relay Demo Team',
    slug: `relay-demo-${crypto.randomBytes(2).toString('hex')}`,
    owner: owner._id,
    plan: 'growth',
    subscriptionStatus: 'active',
    inviteCode: 'relaydemo',
    aiCreditsUsed: 12,
  });

  owner.team = team._id;
  await owner.save();

  const manager = await User.create({
    name: 'Jordan Miles',
    email: 'manager@relay.crm',
    password: 'demo1234',
    role: 'manager',
    title: 'Sales Manager',
    team: team._id,
  });

  const rep1 = await User.create({
    name: 'Sam Torres',
    email: 'sam@relay.crm',
    password: 'demo1234',
    role: 'sales',
    title: 'Account Executive',
    team: team._id,
  });

  const rep2 = await User.create({
    name: 'Casey Nguyen',
    email: 'casey@relay.crm',
    password: 'demo1234',
    role: 'sales',
    title: 'SDR',
    team: team._id,
  });

  const owners = [owner._id, manager._id, rep1._id, rep2._id];

  const leads = await Promise.all(
    companies.map((c, i) => {
      const daysAgo = Math.floor(Math.random() * 40);
      const createdAt = new Date(Date.now() - daysAgo * 86400000);
      return Lead.create({
        team: team._id,
        owner: owners[i % owners.length],
        name: c.contact,
        email: c.email,
        phone: `+1 (555) ${100 + i}${200 + i}`,
        company: c.name,
        title: c.title,
        source: c.source,
        stage: c.stage,
        value: c.value,
        probability: c.stage === 'won' ? 100 : c.stage === 'lost' ? 0 : 20 + (i % 6) * 10,
        priority: i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low',
        tags: i % 2 === 0 ? ['enterprise'] : ['smb'],
        notes: `Interested in AI-assisted follow-ups and pipeline visibility for ${c.name}.`,
        lastContactedAt: new Date(Date.now() - (3 + (i % 10)) * 86400000),
        nextFollowUpAt: new Date(Date.now() + (1 + (i % 5)) * 86400000),
        activities: [
          {
            type: 'note',
            content: 'Lead imported from seed data',
            createdBy: owner._id,
            createdAt,
          },
          {
            type: 'call',
            content: 'Initial discovery conversation — strong interest in analytics dashboard.',
            createdBy: owners[i % owners.length],
          },
        ],
        createdAt,
      });
    })
  );

  const now = new Date();
  await Meeting.create([
    {
      team: team._id,
      organizer: owner._id,
      attendees: [manager._id, rep1._id],
      lead: leads[0]._id,
      title: 'Northwind Labs product demo',
      description: 'Walk through AI email + kanban pipeline.',
      location: 'Zoom',
      startAt: new Date(now.getTime() + 2 * 86400000),
      endAt: new Date(now.getTime() + 2 * 86400000 + 45 * 60000),
      meetingType: 'demo',
    },
    {
      team: team._id,
      organizer: manager._id,
      attendees: [rep1._id, rep2._id],
      lead: leads[2]._id,
      title: 'Cedar & Co negotiation sync',
      description: 'Align on pricing and success criteria.',
      location: 'Google Meet',
      startAt: new Date(now.getTime() + 4 * 86400000),
      endAt: new Date(now.getTime() + 4 * 86400000 + 30 * 60000),
      meetingType: 'negotiation',
    },
    {
      team: team._id,
      organizer: rep2._id,
      attendees: [manager._id],
      lead: leads[4]._id,
      title: 'Summit Health discovery',
      description: 'Understand current CRM pain points.',
      location: 'Phone',
      startAt: new Date(now.getTime() + 1 * 86400000),
      endAt: new Date(now.getTime() + 1 * 86400000 + 30 * 60000),
      meetingType: 'discovery',
    },
  ]);

  await Notification.create([
    {
      team: team._id,
      user: owner._id,
      type: 'system',
      title: 'Welcome to Relay',
      message: 'Your demo workspace is ready. Explore leads, AI tools, and billing.',
      link: '/dashboard',
    },
    {
      team: team._id,
      user: owner._id,
      type: 'lead',
      title: 'Hot lead waiting',
      message: 'Lumen Finance is in proposal stage — $120k potential.',
      link: `/leads/${leads[6]._id}`,
    },
  ]);

  console.log('Seed complete');
  console.log('Demo login: demo@relay.crm / demo1234');
}

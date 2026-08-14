import User from '../models/User.js';
import Organization from '../models/Organization.js';
import Client from '../models/Client.js';
import Call from '../models/Call.js';
import Proposal from '../models/Proposal.js';
import Notification from '../models/Notification.js';
import { analyzeCall, generateProposal } from '../services/aiService.js';
import { makeSlug, makeToken } from '../utils/slug.js';

const ACME_TRANSCRIPT = `
Alex Morgan: Thanks for jumping on, Sarah. Tell me what's going on with the website today.
Sarah Chen: Our current site barely produces qualified leads. Marketing has to file tickets for every content change, and we can't tell which campaigns create CRM opportunities.
Alex: What's the dream outcome in the next quarter?
Sarah: A modern corporate website with a CMS, blog, strong SEO foundation, analytics, and HubSpot CRM integration. Budget is roughly eight to twelve thousand if the scope is right. We want to launch in about six to eight weeks.
Alex: Who else is involved in the decision?
Sarah: I'm the marketing director and primary decision maker. Urgency is high — leadership wants inbound pipeline before the next board review.
Alex: Any constraints we should know?
Sarah: We're still finalizing the exact page count and hard launch date. CRM should be HubSpot, but we can confirm.
`;

const ECOM_TRANSCRIPT = `
Alex Morgan: Jordan, walk me through the store vision.
Jordan Blake: We need a conversion-ready e-commerce website. The current store looks dated, mobile checkout is painful, and inventory is managed in spreadsheets.
Alex: Scope and budget?
Jordan: Catalog CMS, Stripe checkout, abandoned-cart email, analytics, and inventory sync if possible. Budget around ten to fifteen thousand, eight to ten weeks.
Alex: Decision process?
Jordan: I'm the founder and can greenlight this. High urgency — peak season is coming.
`;

export async function seedDatabase() {
  const existing = await User.findOne({ email: 'alex@dealflow.ai' });
  if (existing) {
    console.log('Seed skipped — demo data already present');
    return { seeded: false };
  }

  const organization = await Organization.create({
    name: 'Northstar Agency',
    slug: 'northstar-agency',
    inviteCode: 'dealflow',
    plan: 'pro',
    brand: {
      companyName: 'Northstar Agency',
      website: 'https://northstar.example',
      primaryColor: '#0F766E',
    },
  });

  const owner = await User.create({
    name: 'Alex Morgan',
    email: 'alex@dealflow.ai',
    password: 'demo1234',
    role: 'owner',
    organization: organization._id,
    avatarColor: '#0F766E',
  });

  await User.create({
    name: 'Sam Rivera',
    email: 'sam@dealflow.ai',
    password: 'demo1234',
    role: 'member',
    organization: organization._id,
    avatarColor: '#1D4E89',
  });

  const acme = await Client.create({
    organization: organization._id,
    companyName: 'Acme Digital',
    contactName: 'Sarah Chen',
    contactEmail: 'sarah@acmedigital.example',
    contactTitle: 'Marketing Director',
    industry: 'B2B Services',
    status: 'proposal',
    owner: owner._id,
  });

  const nova = await Client.create({
    organization: organization._id,
    companyName: 'Nova Fitness',
    contactName: 'Maya Ortiz',
    contactEmail: 'maya@novafitness.example',
    contactTitle: 'Owner',
    industry: 'Fitness',
    status: 'qualified',
    owner: owner._id,
  });

  const bright = await Client.create({
    organization: organization._id,
    companyName: 'Bright Dental',
    contactName: 'Dr. Emily Park',
    contactEmail: 'emily@brightdental.example',
    contactTitle: 'Practice Owner',
    industry: 'Healthcare',
    status: 'proposal',
    owner: owner._id,
  });

  const shop = await Client.create({
    organization: organization._id,
    companyName: 'Harbor & Co',
    contactName: 'Jordan Blake',
    contactEmail: 'jordan@harborco.example',
    contactTitle: 'Founder',
    industry: 'Retail',
    status: 'lead',
    owner: owner._id,
  });

  const acmeCall = await Call.create({
    organization: organization._id,
    client: acme._id,
    owner: owner._id,
    title: 'Acme Digital discovery',
    source: 'paste',
    sourceLabel: 'Pasted transcript',
    transcript: ACME_TRANSCRIPT,
    status: 'analyzed',
    analysis: await analyzeCall({ transcript: ACME_TRANSCRIPT, title: 'Acme Digital discovery' }, acme),
  });

  const novaCall = await Call.create({
    organization: organization._id,
    client: nova._id,
    owner: owner._id,
    title: 'Nova Fitness intro call',
    source: 'integration',
    sourceLabel: 'Zoom (simulated)',
    transcript: 'Fitness membership website with class schedule and trial lead capture. Budget around 6 to 10k.',
    status: 'processing',
  });

  const brightCall = await Call.create({
    organization: organization._id,
    client: bright._id,
    owner: owner._id,
    title: 'Bright Dental website rebuild',
    source: 'transcript_file',
    sourceLabel: 'bright-dental.txt',
    transcript: 'Dental clinic needs booking and local SEO. Budget five to nine thousand.',
    status: 'awaiting_approval',
    analysis: await analyzeCall(
      { transcript: 'Dental clinic needs booking and local SEO. Budget five to nine thousand.', title: 'Bright Dental' },
      bright
    ),
  });

  const shopCall = await Call.create({
    organization: organization._id,
    client: shop._id,
    owner: owner._id,
    title: 'Harbor & Co e-commerce discovery',
    source: 'paste',
    sourceLabel: 'Demo scenario transcript',
    transcript: ECOM_TRANSCRIPT,
    status: 'analyzed',
    analysis: await analyzeCall({ transcript: ECOM_TRANSCRIPT, title: 'Harbor e-commerce' }, shop),
  });

  const acmeGenerated = await generateProposal(acmeCall, acme, acmeCall.analysis);
  const acmeProposal = await Proposal.create({
    organization: organization._id,
    client: acme._id,
    call: acmeCall._id,
    owner: owner._id,
    slug: 'acme-website',
    publicToken: makeToken(),
    template: 'modern',
    status: 'sent',
    sentAt: new Date(Date.now() - 1000 * 60 * 60 * 26),
    firstOpenedAt: new Date(Date.now() - 1000 * 60 * 60 * 20),
    lastViewedAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
    openCount: 2,
    totalViewTimeSeconds: 161,
    ...acmeGenerated,
    events: [
      { type: 'created', label: 'Proposal generated by AI', at: new Date(Date.now() - 1000 * 60 * 60 * 28) },
      { type: 'sent', label: 'Sent to sarah@acmedigital.example', at: new Date(Date.now() - 1000 * 60 * 60 * 26) },
      { type: 'opened', label: 'Sarah Chen opened proposal', at: new Date(Date.now() - 1000 * 60 * 60 * 20) },
      { type: 'viewed_pricing', label: 'Viewed pricing', at: new Date(Date.now() - 1000 * 60 * 60 * 20 + 60000) },
      { type: 'returned', label: 'Sarah Chen returned to proposal', at: new Date(Date.now() - 1000 * 60 * 60 * 3) },
    ],
  });
  acmeCall.proposal = acmeProposal._id;
  acmeCall.status = 'proposal_ready';
  await acmeCall.save();

  const brightGenerated = await generateProposal(brightCall, bright, brightCall.analysis);
  const brightProposal = await Proposal.create({
    organization: organization._id,
    client: bright._id,
    call: brightCall._id,
    owner: owner._id,
    slug: makeSlug('bright-dental-proposal'),
    publicToken: makeToken(),
    template: 'corporate',
    status: 'ready',
    ...brightGenerated,
    events: [{ type: 'created', label: 'Proposal generated by AI', at: new Date() }],
  });
  brightCall.proposal = brightProposal._id;
  await brightCall.save();

  // Historical won deal for conversion metrics
  const wonClient = await Client.create({
    organization: organization._id,
    companyName: 'Lumen Analytics',
    contactName: 'Priya Shah',
    contactEmail: 'priya@lumen.example',
    contactTitle: 'VP Marketing',
    status: 'won',
    owner: owner._id,
  });
  const wonCall = await Call.create({
    organization: organization._id,
    client: wonClient._id,
    owner: owner._id,
    title: 'Lumen analytics portal',
    transcript: 'Need a customer portal and dashboard. Budget 12.5k.',
    status: 'won',
    source: 'paste',
    analysis: await analyzeCall({ transcript: 'Need a customer portal and dashboard. Budget 12.5k.', title: 'Lumen' }, wonClient),
  });
  const wonGenerated = await generateProposal(wonCall, wonClient, wonCall.analysis);
  wonGenerated.investment = 12500;
  const wonProposal = await Proposal.create({
    organization: organization._id,
    client: wonClient._id,
    call: wonCall._id,
    owner: owner._id,
    slug: makeSlug('lumen-portal'),
    publicToken: makeToken(),
    template: 'technical',
    status: 'accepted',
    sentAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12),
    acceptedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9),
    openCount: 4,
    totalViewTimeSeconds: 420,
    ...wonGenerated,
    investment: 12500,
    events: [
      { type: 'sent', label: 'Sent to client', at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12) },
      { type: 'opened', label: 'Priya Shah opened proposal', at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 11) },
      { type: 'accepted', label: 'Accepted proposal', at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9) },
    ],
  });
  wonCall.proposal = wonProposal._id;
  await wonCall.save();

  // Extra sent proposals for dashboard numbers
  for (let i = 0; i < 5; i += 1) {
    const c = await Client.create({
      organization: organization._id,
      companyName: `Prospect ${i + 1} Co`,
      contactName: `Contact ${i + 1}`,
      contactEmail: `contact${i + 1}@example.com`,
      status: i % 2 === 0 ? 'proposal' : 'won',
      owner: owner._id,
    });
    const call = await Call.create({
      organization: organization._id,
      client: c._id,
      owner: owner._id,
      title: `${c.companyName} call`,
      transcript: 'Website project discussion. Budget around nine thousand.',
      status: i % 2 === 0 ? 'sent' : 'won',
      source: 'paste',
      analysis: await analyzeCall({ transcript: 'Website project discussion. Budget around nine thousand.', title: c.companyName }, c),
    });
    const gen = await generateProposal(call, c, call.analysis);
    const p = await Proposal.create({
      organization: organization._id,
      client: c._id,
      call: call._id,
      owner: owner._id,
      slug: makeSlug(c.companyName),
      publicToken: makeToken(),
      template: 'modern',
      status: i % 2 === 0 ? 'viewed' : 'accepted',
      sentAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * (i + 2)),
      acceptedAt: i % 2 === 0 ? undefined : new Date(Date.now() - 1000 * 60 * 60 * 24 * i),
      openCount: 1,
      ...gen,
      events: [{ type: 'sent', label: 'Sent', at: new Date() }],
    });
    call.proposal = p._id;
    await call.save();
  }

  await Notification.create({
    organization: organization._id,
    user: owner._id,
    type: 'proposal_opened',
    title: 'Proposal opened',
    body: 'Sarah Chen opened proposal',
    link: `/proposals/${acmeProposal._id}`,
  });

  console.log('DealFlow AI demo data seeded');
  console.log('Login: alex@dealflow.ai / demo1234');
  console.log(`Demo calls ready: Acme (${acmeCall._id}), Nova (${novaCall._id}), Harbor (${shopCall._id})`);
  return { seeded: true };
}

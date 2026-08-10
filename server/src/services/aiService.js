import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

function detectScenario(transcript = '', title = '', company = '') {
  const text = `${title} ${company} ${transcript}`.toLowerCase();
  if (text.includes('e-commerce') || text.includes('ecommerce') || text.includes('online store') || text.includes('shopify')) {
    return 'ecommerce';
  }
  if (text.includes('dental') || text.includes('clinic') || text.includes('patient')) {
    return 'dental';
  }
  if (text.includes('fitness') || text.includes('gym') || text.includes('workout')) {
    return 'fitness';
  }
  return 'corporate';
}

function mockAnalysis(call, client) {
  const scenario = detectScenario(call.transcript, call.title, client?.companyName);

  const scenarios = {
    corporate: {
      summary:
        'Discovery call with Acme Digital covering a corporate website rebuild focused on lead generation, CMS ownership, SEO, analytics, and CRM handoff.',
      painPoints: [
        'Current website generates very few qualified leads.',
        'Marketing team cannot update content without developer help.',
        'No clear attribution between site traffic and CRM opportunities.',
      ],
      budget: {
        min: 8000,
        max: 12000,
        display: '$8,000–$12,000',
        confidence: 78,
        inferred: true,
        note: 'Budget was inferred from the conversation.',
      },
      timeline: {
        display: '6–8 weeks',
        weeksMin: 6,
        weeksMax: 8,
        confidence: 86,
        inferred: false,
      },
      decisionMaker: { name: 'Sarah Chen', title: 'Marketing Director', confidence: 94 },
      urgency: 'High',
      requirements: [
        { title: 'Website redesign', priority: 'High', confidence: 96, description: 'Modern corporate website designed to increase qualified inbound leads.' },
        { title: 'CMS', priority: 'High', confidence: 91, description: 'Editable content system for marketing ownership.' },
        { title: 'Blog', priority: 'Medium', confidence: 88, description: 'Content hub for SEO and thought leadership.' },
        { title: 'SEO', priority: 'High', confidence: 89, description: 'Technical SEO foundation and on-page structure.' },
        { title: 'Analytics', priority: 'Medium', confidence: 95, description: 'Conversion tracking and funnel visibility.' },
        { title: 'CRM integration', priority: 'Medium', confidence: 83, description: 'Lead capture synced into CRM workflows.', inferred: true },
      ],
      missingInformation: [
        { field: 'Final project deadline', question: 'What is your target launch date?' },
        { field: 'Number of website pages', question: 'Approximately how many pages should the first release include?' },
        { field: 'CRM platform', question: 'Which CRM should the website integrate with (HubSpot, Salesforce, or other)?' },
      ],
    },
    ecommerce: {
      summary:
        'Sales call focused on launching a conversion-ready e-commerce storefront with catalog management, checkout, payments, and post-purchase email flows.',
      painPoints: [
        'Manual order handling is slowing growth.',
        'Current storefront looks outdated and converts poorly on mobile.',
        'No reliable inventory sync between sales channels.',
      ],
      budget: {
        min: 10000,
        max: 15000,
        display: '$10,000–$15,000',
        confidence: 81,
        inferred: true,
        note: 'Budget range inferred from package discussion and competitor comparisons.',
      },
      timeline: {
        display: '8–10 weeks',
        weeksMin: 8,
        weeksMax: 10,
        confidence: 84,
        inferred: false,
      },
      decisionMaker: { name: 'Jordan Blake', title: 'Founder', confidence: 92 },
      urgency: 'High',
      requirements: [
        { title: 'E-commerce storefront', priority: 'High', confidence: 97, description: 'Branded online store optimized for conversion.' },
        { title: 'Product catalog CMS', priority: 'High', confidence: 93, description: 'Self-serve product and collection management.' },
        { title: 'Checkout & payments', priority: 'High', confidence: 95, description: 'Secure checkout with Stripe/PayPal.' },
        { title: 'Inventory sync', priority: 'Medium', confidence: 80, description: 'Stock levels reflected across channels.', inferred: true },
        { title: 'Email automations', priority: 'Medium', confidence: 87, description: 'Abandoned cart and order confirmation flows.' },
        { title: 'Analytics & attribution', priority: 'Medium', confidence: 90, description: 'Revenue and funnel tracking.' },
      ],
      missingInformation: [
        { field: 'SKU count', question: 'How many SKUs should launch in the first release?' },
        { field: 'Payment providers', question: 'Which payment providers do you need at launch?' },
        { field: 'Shipping regions', question: 'Which regions will you ship to initially?' },
      ],
    },
    dental: {
      summary: 'Clinic growth call covering patient acquisition website, booking flow, and reputation/SEO foundations.',
      painPoints: [
        'Patients struggle to book appointments online.',
        'Local search visibility is weak compared to competitors.',
      ],
      budget: {
        min: 5000,
        max: 9000,
        display: '$5,000–$9,000',
        confidence: 74,
        inferred: true,
        note: 'Budget was inferred from the conversation.',
      },
      timeline: {
        display: '4–6 weeks',
        weeksMin: 4,
        weeksMax: 6,
        confidence: 82,
        inferred: false,
      },
      decisionMaker: { name: 'Dr. Emily Park', title: 'Practice Owner', confidence: 90 },
      urgency: 'Medium',
      requirements: [
        { title: 'Clinic website redesign', priority: 'High', confidence: 94 },
        { title: 'Online booking', priority: 'High', confidence: 91 },
        { title: 'Local SEO', priority: 'High', confidence: 88 },
        { title: 'Patient forms', priority: 'Medium', confidence: 85 },
      ],
      missingInformation: [
        { field: 'Booking system', question: 'Do you already use a practice management / booking platform?' },
        { field: 'Locations', question: 'Should the site support one location or multiple clinics?' },
      ],
    },
    fitness: {
      summary: 'Fitness brand discovery covering membership site, class schedules, and lead capture for trial conversions.',
      painPoints: [
        'Trial sign-ups drop off because scheduling is confusing.',
        'Brand site does not communicate community or results.',
      ],
      budget: {
        min: 6000,
        max: 10000,
        display: '$6,000–$10,000',
        confidence: 76,
        inferred: true,
        note: 'Budget was inferred from the conversation.',
      },
      timeline: {
        display: '5–7 weeks',
        weeksMin: 5,
        weeksMax: 7,
        confidence: 80,
        inferred: false,
      },
      decisionMaker: { name: 'Maya Ortiz', title: 'Owner', confidence: 89 },
      urgency: 'Medium',
      requirements: [
        { title: 'Brand website', priority: 'High', confidence: 93 },
        { title: 'Class schedule', priority: 'High', confidence: 90 },
        { title: 'Trial lead capture', priority: 'High', confidence: 92 },
        { title: 'Membership payments', priority: 'Medium', confidence: 84 },
      ],
      missingInformation: [
        { field: 'Membership tiers', question: 'Which membership tiers should be highlighted on the site?' },
      ],
    },
  };

  const base = scenarios[scenario];
  return {
    ...base,
    processedAt: new Date(),
  };
}

export function mockProposalContent(call, client, analysis) {
  const company = client.companyName;
  const budgetMid = Math.round(((analysis.budget?.min || 8000) + (analysis.budget?.max || 12000)) / 2);
  const starter = Math.round(budgetMid * 0.68);
  const enterprise = Math.round(budgetMid * 1.45);
  const requirements = analysis.requirements || [];

  const scopeOfWork = [
    { order: 1, title: 'Discovery', description: 'Stakeholder workshops, success metrics, and information architecture.' },
    { order: 2, title: 'UX/UI Design', description: 'Wireframes, visual system, and high-fidelity page designs.' },
    { order: 3, title: 'Development', description: 'Responsive front-end build with performance and accessibility baselines.' },
    { order: 4, title: 'CMS Integration', description: 'Editable content model so marketing can ship updates independently.' },
    { order: 5, title: 'Integrations', description: requirements.some((r) => /crm|payment|booking/i.test(r.title))
      ? 'Connect CRM, analytics, and operational tools discussed on the call.'
      : 'Connect analytics and lead capture tooling.' },
    { order: 6, title: 'SEO Setup', description: 'Technical SEO foundations, metadata, and content structure.' },
    { order: 7, title: 'Analytics', description: 'Event tracking for key conversion moments and reporting views.' },
    { order: 8, title: 'Launch', description: 'QA, content migration support, launch checklist, and handoff training.' },
  ];

  const timeline = [
    { week: 'Week 1', title: 'Discovery', description: 'Requirements validation, sitemap, and project plan.' },
    { week: 'Week 2', title: 'UX/UI', description: 'Design direction and core page templates.' },
    { week: 'Week 3–5', title: 'Development', description: 'Build, CMS setup, and integrations.' },
    { week: 'Week 6', title: 'Testing & Launch', description: 'QA, refinements, launch, and enablement.' },
  ];

  if ((analysis.timeline?.weeksMax || 8) >= 9) {
    timeline[2] = { week: 'Week 3–7', title: 'Development', description: 'Iterative build across catalog, checkout, and automations.' };
    timeline[3] = { week: 'Week 8–10', title: 'Testing & Launch', description: 'QA, soft launch, and optimization.' };
  }

  return {
    title: `${company} — Website Development Proposal`,
    content: {
      projectOverview: `${company} requires a modern digital experience designed to increase qualified inbound demand. Based on our discovery conversation, the priority is converting interest into measurable pipeline while giving your team ownership of content and reporting.`,
      scopeOfWork,
      timeline,
      pricingNotes: `Recommended investment of $${budgetMid.toLocaleString()} balances the must-have scope from the call with a timeline of ${analysis.timeline?.display || '6–8 weeks'}.`,
      nextSteps: 'Accept the proposal to lock the kickoff date, or request changes if scope or packaging should shift.',
    },
    packages: [
      {
        id: 'starter',
        name: 'Starter',
        price: starter,
        description: 'Focused MVP launch with core pages and essential analytics.',
        recommended: false,
        features: ['Core website pages', 'CMS basics', 'Analytics setup', 'Launch support'],
      },
      {
        id: 'professional',
        name: 'Professional',
        price: budgetMid,
        description: 'Recommended package covering the full scope discussed on the call.',
        recommended: true,
        features: requirements.slice(0, 5).map((r) => r.title).concat(['Launch + training']),
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: enterprise,
        description: 'Expanded scope with advanced integrations, richer content, and priority support.',
        recommended: false,
        features: ['Everything in Professional', 'Advanced integrations', 'Extra design exploration', 'Priority support'],
      },
    ],
    selectedPackageId: 'professional',
    investment: budgetMid,
    timelineDisplay: analysis.timeline?.display || '6–8 weeks',
  };
}

export function mockFollowUp({ client, proposal, tone = 'professional', day = 2 }) {
  const firstName = (client.contactName || 'there').split(' ')[0];
  const company = client.companyName;
  const amount = proposal.investment?.toLocaleString?.() || proposal.investment;

  const tones = {
    friendly: {
      2: `Hey ${firstName} — just checking in to make sure the ${company} proposal landed okay. Happy to jump on a quick call if useful.`,
      5: `Hi ${firstName}, circling back on the proposal for ${company}. If anything feels unclear around scope or timeline, I can clarify in a few minutes.`,
      10: `Hi ${firstName}, last nudge from me on the ${company} proposal ($${amount}). If now isn’t the right time, totally understand — just let me know how you’d like to proceed.`,
    },
    professional: {
      2: `Hi ${firstName}, I wanted to follow up on the proposal we sent for ${company}. Please let me know if you have any questions on scope, timeline, or investment.`,
      5: `Hello ${firstName}, following up on the ${company} proposal. We remain ready to begin discovery as soon as you confirm next steps.`,
      10: `Hi ${firstName}, this is a final follow-up regarding the ${company} proposal ($${amount}). If priorities have shifted, I would appreciate a quick update so we can close the loop.`,
    },
    direct: {
      2: `${firstName} — quick check: did you get a chance to review the ${company} proposal?`,
      5: `${firstName}, need a decision path on the ${company} proposal. Any blockers on scope or price?`,
      10: `${firstName}, closing the loop on the ${company} proposal ($${amount}). Are we moving forward, revising, or pausing?`,
    },
  };

  const bucket = day <= 2 ? 2 : day <= 5 ? 5 : 10;
  const selected = tones[tone] || tones.professional;
  return {
    subject: day <= 2
      ? `Checking in on the ${company} proposal`
      : day <= 5
        ? `Follow-up: ${company} proposal`
        : `Final follow-up: ${company} proposal`,
    body: selected[bucket],
    tone,
    day: bucket,
  };
}

async function analyzeWithOpenAI(call, client) {
  const prompt = `Analyze this sales call transcript and return strict JSON with keys:
summary, painPoints (string[]), budget {min,max,display,confidence,inferred,note},
timeline {display,weeksMin,weeksMax,confidence,inferred},
decisionMaker {name,title,confidence}, urgency (Low|Medium|High),
requirements [{title,description,priority,confidence,inferred}],
missingInformation [{field,question}].

Company: ${client.companyName}
Contact: ${client.contactName || ''} ${client.contactTitle || ''}
Transcript:
${call.transcript}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'You extract structured sales intelligence from call transcripts.' },
      { role: 'user', content: prompt },
    ],
  });

  const parsed = JSON.parse(completion.choices[0].message.content);
  return { ...parsed, processedAt: new Date() };
}

export async function analyzeCall(call, client) {
  if (!openai) {
    return mockAnalysis(call, client);
  }
  try {
    return await analyzeWithOpenAI(call, client);
  } catch (error) {
    console.warn('OpenAI analyze failed, using mock:', error.message);
    return mockAnalysis(call, client);
  }
}

export async function generateProposal(call, client, analysis) {
  return mockProposalContent(call, client, analysis);
}

export async function generateFollowUp(payload) {
  return mockFollowUp(payload);
}

export function generateClarifyingQuestions(missingInformation = []) {
  if (!missingInformation.length) {
    return [
      'What is your target launch date?',
      'Who else needs to approve budget before kickoff?',
      'Are there technical constraints we should know about?',
    ];
  }
  return missingInformation.map((item) => item.question).filter(Boolean);
}

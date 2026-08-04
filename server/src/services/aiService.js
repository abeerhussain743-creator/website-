import OpenAI from 'openai';

let client;

function getClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

function mockEmail({ lead, tone, goal }) {
  const company = lead.company || 'your team';
  const firstName = lead.name.split(' ')[0];
  const tones = {
    professional: `Hi ${firstName},\n\nI hope this note finds you well. I've been following ${company}'s work and believe Relay could streamline how your sales team manages pipeline and follow-ups.\n\nWould you be open to a brief 20-minute conversation next week to explore whether this is a fit?\n\nBest regards`,
    friendly: `Hey ${firstName}!\n\nLoved what ${company} has been building lately. Quick thought — teams like yours often lose deals in the follow-up gap. Relay's AI helps close that loop without adding busywork.\n\nGot 15 minutes this week for a quick chat?\n\nCheers`,
    direct: `${firstName} —\n\n${company} is likely leaving revenue on the table with manual follow-ups. Relay generates personalized outreach and next-step suggestions so reps stay focused on closing.\n\nCan we book a demo this week?\n\nThanks`,
  };

  const body = tones[tone] || tones.professional;
  const subject =
    goal === 'follow_up'
      ? `Following up — ${company} + Relay`
      : goal === 'demo'
        ? `Quick demo for ${company}?`
        : `Idea for ${company}'s sales workflow`;

  return {
    subject,
    body,
    source: 'mock',
  };
}

function mockFollowUps(lead) {
  const daysSince = lead.lastContactedAt
    ? Math.floor((Date.now() - new Date(lead.lastContactedAt).getTime()) / 86400000)
    : 14;

  return {
    suggestions: [
      {
        action: 'Send a value-focused follow-up email',
        reason: `No contact in ~${daysSince} days. Re-engage with a relevant insight about ${lead.company || 'their industry'}.`,
        priority: daysSince > 7 ? 'high' : 'medium',
        suggestedTiming: 'Within 24 hours',
      },
      {
        action: 'Book a discovery or demo call',
        reason: `Lead is in "${lead.stage}" stage with estimated value $${lead.value || 0}. A live conversation can advance the deal.`,
        priority: ['qualified', 'proposal', 'negotiation'].includes(lead.stage) ? 'high' : 'medium',
        suggestedTiming: 'This week',
      },
      {
        action: 'Share a short case study',
        reason: 'Social proof reduces friction before proposal/negotiation stages.',
        priority: 'low',
        suggestedTiming: 'Before next meeting',
      },
    ],
    nextBestAction: 'Send a personalized follow-up email referencing their company goals',
    source: 'mock',
  };
}

export async function generateEmail({ lead, tone = 'professional', goal = 'intro', extraContext = '' }) {
  const openai = getClient();
  if (!openai) return mockEmail({ lead, tone, goal });

  const prompt = `Write a concise sales email.
Lead: ${lead.name}, ${lead.title || 'contact'} at ${lead.company || 'their company'}
Email: ${lead.email || 'n/a'}
Stage: ${lead.stage}
Tone: ${tone}
Goal: ${goal}
Context: ${lead.notes || ''} ${extraContext}

Return JSON with keys: subject, body. No markdown.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an expert B2B sales copywriter. Respond only with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const parsed = JSON.parse(completion.choices[0].message.content);
    return { subject: parsed.subject, body: parsed.body, source: 'openai' };
  } catch (err) {
    console.error('OpenAI email error:', err.message);
    return mockEmail({ lead, tone, goal });
  }
}

export async function generateFollowUps(lead) {
  const openai = getClient();
  if (!openai) return mockFollowUps(lead);

  const prompt = `Suggest follow-up actions for this CRM lead.
Name: ${lead.name}
Company: ${lead.company}
Stage: ${lead.stage}
Value: ${lead.value}
Priority: ${lead.priority}
Notes: ${lead.notes || 'none'}
Last contacted: ${lead.lastContactedAt || 'never'}

Return JSON: { suggestions: [{ action, reason, priority, suggestedTiming }], nextBestAction }`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a sales coach AI. Respond only with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.6,
      response_format: { type: 'json_object' },
    });

    const parsed = JSON.parse(completion.choices[0].message.content);
    return { ...parsed, source: 'openai' };
  } catch (err) {
    console.error('OpenAI follow-up error:', err.message);
    return mockFollowUps(lead);
  }
}

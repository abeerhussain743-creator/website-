export const SITE = {
  name: "Aether",
  tagline: "The Future Operating System for Modern Businesses.",
  description:
    "We build intelligent AI products and enterprise automation systems that transform how modern businesses operate.",
  url: "https://aether.ai",
  email: "hello@aether.ai",
} as const;

export const NAV_LINKS = [
  { label: "Products", href: "#products" },
  { label: "Services", href: "#services" },
  { label: "Solutions", href: "#why-us" },
  { label: "Case Studies", href: "#case-studies" },
  { label: "Pricing", href: "#pricing" },
] as const;

export const PRODUCTS = [
  {
    name: "Aether CRM",
    tag: "AI CRM",
    description: "Predictive customer intelligence that closes deals before you ask.",
    metric: "47% faster pipeline",
    status: "Live",
    accent: "#4F8CFF",
  },
  {
    name: "Aether Sales",
    tag: "AI Sales Agent",
    description: "Autonomous outreach that sounds human and converts at scale.",
    metric: "3.2× win rate",
    status: "Live",
    accent: "#2DD4FF",
  },
  {
    name: "Aether Voice",
    tag: "Voice AI",
    description: "Natural voice agents that handle calls with enterprise precision.",
    metric: "99.2% accuracy",
    status: "Live",
    accent: "#6E5BFF",
  },
  {
    name: "Aether Flow",
    tag: "Workflow Automation",
    description: "Orchestrate every process with self-optimizing AI workflows.",
    metric: "12k hrs saved",
    status: "Live",
    accent: "#A855F7",
  },
  {
    name: "Aether Support",
    tag: "Customer Support AI",
    description: "Resolve tickets instantly with context-aware intelligence.",
    metric: "86% auto-resolve",
    status: "Live",
    accent: "#4F8CFF",
  },
  {
    name: "Aether Docs",
    tag: "Document Intelligence",
    description: "Extract, reason, and act on documents in milliseconds.",
    metric: "10× processing",
    status: "Live",
    accent: "#2DD4FF",
  },
  {
    name: "Aether Pulse",
    tag: "Marketing AI",
    description: "Campaign intelligence that learns what converts in real time.",
    metric: "2.8× ROAS",
    status: "Beta",
    accent: "#6E5BFF",
  },
  {
    name: "Aether Insight",
    tag: "AI Analytics",
    description: "Board-ready answers from every data source you own.",
    metric: "Real-time truth",
    status: "Live",
    accent: "#A855F7",
  },
] as const;

export const SERVICES = [
  {
    title: "AI Automation",
    description: "Replace fragile processes with adaptive intelligence.",
    icon: "zap",
  },
  {
    title: "AI Consulting",
    description: "Strategy shaped by operators who ship at enterprise scale.",
    icon: "compass",
  },
  {
    title: "AI Development",
    description: "Custom models and systems engineered for production.",
    icon: "code",
  },
  {
    title: "Custom AI Agents",
    description: "Purpose-built agents that own outcomes end to end.",
    icon: "bot",
  },
  {
    title: "LLM Integration",
    description: "Secure, governed model orchestration across your stack.",
    icon: "layers",
  },
  {
    title: "Voice AI",
    description: "Telephony-grade conversational systems for global teams.",
    icon: "mic",
  },
  {
    title: "Computer Vision",
    description: "Perception pipelines for quality, safety, and ops.",
    icon: "eye",
  },
  {
    title: "Workflow Automation",
    description: "Human-in-the-loop systems that never drop the thread.",
    icon: "workflow",
  },
  {
    title: "AI Chatbots",
    description: "Brand-true assistants trained on your institutional knowledge.",
    icon: "message",
  },
  {
    title: "Enterprise AI",
    description: "Security, compliance, and scale from day one.",
    icon: "shield",
  },
] as const;

export const TRUSTED_BY = [
  "Meridian",
  "Northline",
  "Vantage",
  "Helios Corp",
  "Atlas Financial",
  "Pinnacle",
  "Orbit Systems",
  "Summit Health",
  "Cascade",
  "Apex Global",
] as const;

export const TECH_STACK = [
  "OpenAI",
  "Claude",
  "Gemini",
  "Llama",
  "Mistral",
  "Pinecone",
  "LangChain",
  "n8n",
  "Make",
  "Zapier",
  "AWS",
  "Azure",
  "Google Cloud",
  "Supabase",
  "Vercel",
  "Docker",
  "Kubernetes",
] as const;

export const CASE_STUDIES = [
  {
    company: "Northline Logistics",
    industry: "Supply Chain",
    title: "Autonomous operations at continental scale",
    before: "14-day exception cycles",
    after: "Same-day resolution",
    metrics: [
      { label: "Revenue lift", value: "+38%" },
      { label: "Time saved", value: "9,400 hrs" },
      { label: "ROI", value: "12.4×" },
    ],
  },
  {
    company: "Atlas Financial",
    industry: "Finance",
    title: "Intelligence that underwrites with clarity",
    before: "Manual risk reviews",
    after: "AI-first underwriting",
    metrics: [
      { label: "Decision speed", value: "18×" },
      { label: "Accuracy", value: "99.1%" },
      { label: "Cost reduction", value: "−54%" },
    ],
  },
  {
    company: "Summit Health",
    industry: "Healthcare",
    title: "Patient journeys without friction",
    before: "42-min average handle",
    after: "Under 6 minutes",
    metrics: [
      { label: "CSAT", value: "94%" },
      { label: "Automation", value: "81%" },
      { label: "ROI", value: "8.7×" },
    ],
  },
] as const;

export const TESTIMONIALS = [
  {
    quote:
      "Aether didn't sell us software. They installed an operating system for how we think and ship.",
    name: "Elena Voss",
    role: "Chief Digital Officer",
    company: "Northline Logistics",
  },
  {
    quote:
      "The precision is extraordinary. Our teams move faster because the intelligence is always ahead of them.",
    name: "Marcus Chen",
    role: "VP of Operations",
    company: "Atlas Financial",
  },
  {
    quote:
      "Every interaction feels inevitable—calm, exact, and years ahead of anything else we evaluated.",
    name: "Amara Okonkwo",
    role: "CEO",
    company: "Summit Health",
  },
] as const;

export const FAQS = [
  {
    q: "What makes Aether different from other AI platforms?",
    a: "Aether is not a collection of tools. It is an operating layer—products, agents, and services designed to compound into a single intelligent system for your business.",
  },
  {
    q: "Do you work with enterprise security and compliance requirements?",
    a: "Yes. SOC 2, SSO, VPC deployment, data residency, audit trails, and model governance are available across enterprise engagements.",
  },
  {
    q: "Can you integrate with our existing stack?",
    a: "Aether connects to the systems you already trust—CRMs, ERPs, data warehouses, communications platforms, and custom APIs—without forcing a rip-and-replace.",
  },
  {
    q: "How quickly can we see results?",
    a: "Most product deployments surface measurable impact within the first sprint. Custom agent systems typically reach production within weeks, not quarters.",
  },
  {
    q: "Do you offer custom AI development?",
    a: "Yes. From proprietary agents to full platform builds, our engineering teams design, train, and operate systems tailored to your domain.",
  },
  {
    q: "What does pricing look like?",
    a: "Pricing scales with usage, seats, and deployment model. Start with Starter or Growth, or engage Enterprise for dedicated architecture and SLAs.",
  },
] as const;

export const PRICING_TIERS = [
  {
    name: "Starter",
    price: 2_400,
    period: "mo",
    description: "For teams ready to automate their first critical workflows.",
    features: [
      "2 AI product seats",
      "Core automations",
      "Standard integrations",
      "Email support",
      "Usage analytics",
    ],
    cta: "Start building",
    highlighted: false,
  },
  {
    name: "Growth",
    price: 7_800,
    period: "mo",
    description: "For companies scaling intelligence across departments.",
    features: [
      "Unlimited product seats",
      "Advanced agents",
      "Priority integrations",
      "Dedicated success",
      "Custom workflows",
      "SSO & audit logs",
    ],
    cta: "Scale with Aether",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: null,
    period: "",
    description: "For global organizations that need a private AI operating system.",
    features: [
      "Private cloud / VPC",
      "Custom model training",
      "24/7 mission support",
      "Security reviews",
      "SLA guarantees",
      "On-site strategy",
    ],
    cta: "Book strategy call",
    highlighted: false,
  },
] as const;

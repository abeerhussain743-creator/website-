export const COMPANY = {
  name: "Axion",
  tagline: "We build the systems that run your business.",
  email: "hello@axion.systems",
  url: "https://axion.systems",
} as const;

export const NAV_LINKS = [
  { label: "Solutions", href: "#solutions" },
  { label: "Products", href: "#products" },
  { label: "Industries", href: "#industries" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Work", href: "#work" },
  { label: "About", href: "#about" },
] as const;

export const INTEGRATIONS = [
  "Shopify",
  "Salesforce",
  "HubSpot",
  "Slack",
  "Google",
  "OpenAI",
  "Anthropic",
  "Stripe",
  "Airtable",
  "PostgreSQL",
  "Make",
  "n8n",
] as const;

export const PROBLEMS = [
  "Copying data between systems",
  "Manually processing orders",
  "Responding to repetitive customer questions",
  "Monitoring competitors",
  "Creating reports",
  "Following up with leads",
  "Updating CRMs",
  "Managing repetitive admin work",
] as const;

export const SERVICES = [
  {
    title: "AI Automation",
    description:
      "Automate repetitive business operations with intelligent workflows.",
    icon: "workflow",
  },
  {
    title: "AI Agents",
    description:
      "Deploy autonomous agents that understand context and execute tasks.",
    icon: "bot",
  },
  {
    title: "Workflow Automation",
    description:
      "Connect your tools, systems, and teams into automated processes.",
    icon: "git-branch",
  },
  {
    title: "AI Voice Agents",
    description:
      "Automate customer calls, qualification, support, and booking.",
    icon: "phone",
  },
  {
    title: "Custom AI Software",
    description:
      "Build internal tools and AI-powered business applications.",
    icon: "code",
  },
  {
    title: "E-commerce Automation",
    description:
      "Automate orders, fulfillment, inventory, support, and operations.",
    icon: "shopping-bag",
  },
] as const;

export const AGENT_STEPS = [
  "Customer Message",
  "AI understands intent",
  "Checks CRM",
  "Checks inventory",
  "Makes decision",
  "Executes action",
  "Updates systems",
  "Notifies customer",
] as const;

export const PRODUCTS = [
  {
    name: "Competitor Intelligence",
    problem: "Manual competitor monitoring doesn't scale.",
    description:
      "Track competitor catalogs, prices, and inventory in real time — then surface the changes that matter.",
    status: "Live",
    href: "#competitor-intel",
    accent: "cyan",
  },
  {
    name: "AI Sales Assistant",
    problem: "Leads go cold between handoffs.",
    description:
      "Qualify inbound interest, enrich CRM records, and draft follow-ups that match your sales process.",
    status: "Live",
    href: "#products",
    accent: "blue",
  },
  {
    name: "Support Agent",
    problem: "Support volume grows faster than headcount.",
    description:
      "Resolve routine tickets with grounded answers from your docs, orders, and policies — escalate when needed.",
    status: "Live",
    href: "#products",
    accent: "ice",
  },
  {
    name: "Commerce Ops",
    problem: "Order ops still rely on human glue.",
    description:
      "Orchestrate fulfillment, inventory sync, and customer notifications across your commerce stack.",
    status: "Beta",
    href: "#products",
    accent: "steel",
  },
  {
    name: "Workflow Platform",
    problem: "Automations live scattered across tools.",
    description:
      "Design, monitor, and scale business workflows from a single control plane.",
    status: "Private Preview",
    href: "#builder",
    accent: "mist",
  },
] as const;

export const INDUSTRIES = [
  {
    name: "E-commerce",
    flow: ["Orders", "Inventory", "Fulfillment", "Customer"],
  },
  {
    name: "Restaurants",
    flow: ["Call", "AI Agent", "Reservation", "Confirmation", "CRM"],
  },
  {
    name: "Real Estate",
    flow: ["Lead", "Qualify", "Schedule", "Follow-up", "CRM"],
  },
  {
    name: "Healthcare",
    flow: ["Intake", "Route", "Schedule", "Remind", "Record"],
  },
  {
    name: "Recruitment",
    flow: ["Job", "Candidate", "Qualify", "Outreach", "CRM"],
  },
  {
    name: "SaaS",
    flow: ["Signup", "Onboard", "Expand", "Support", "Retain"],
  },
  {
    name: "Professional Services",
    flow: ["Inquiry", "Scope", "Proposal", "Deliver", "Invoice"],
  },
  {
    name: "Manufacturing",
    flow: ["Order", "Plan", "Produce", "Ship", "Analyze"],
  },
] as const;

export const PROCESS_STEPS = [
  {
    number: "01",
    title: "Discover",
    description:
      "Understand your business and identify repetitive processes.",
  },
  {
    number: "02",
    title: "Design",
    description: "Architect the automation system around real workflows.",
  },
  {
    number: "03",
    title: "Build",
    description:
      "Connect APIs, AI models, databases, and business tools.",
  },
  {
    number: "04",
    title: "Scale",
    description: "Monitor, optimize, and expand the system over time.",
  },
] as const;

export const CASE_STUDIES = [
  {
    title: "Automating competitor intelligence for e-commerce brands",
    label: "Demonstration",
    problem:
      "Merchants tracked competitor catalogs by hand — spreadsheets, screenshots, and delayed decisions.",
    system:
      "A continuous monitoring pipeline that discovers products, extracts attributes, and stores historical change.",
    automation:
      "Scheduled crawls → structured extraction → price/inventory diffs → insight summaries → alert routing.",
    result:
      "Operators see product launches, stockouts, and price moves without manual research cycles.",
    metrics: [
      { label: "Tracked SKUs", value: "12k+" },
      { label: "Change latency", value: "< 1h" },
      { label: "Manual hours cut", value: "~80%" },
    ],
  },
  {
    title: "Autonomous order routing for multi-channel commerce",
    label: "Demonstration",
    problem:
      "Order ops teams were the API between storefront, warehouse, and customer messaging.",
    system:
      "An event-driven automation layer with decision rules for inventory, SLA, and exception handling.",
    automation:
      "Order trigger → inventory check → fulfillment dispatch → CRM update → customer notification.",
    result:
      "Routine orders move end-to-end without human handoffs; exceptions surface with context.",
    metrics: [
      { label: "Touchless rate", value: "74%" },
      { label: "Median cycle", value: "3.2m" },
      { label: "Exception clarity", value: "↑" },
    ],
  },
  {
    title: "AI qualification for high-volume inbound leads",
    label: "Demonstration",
    problem:
      "Sales teams spent hours sorting unqualified inquiries before any real conversation.",
    system:
      "An AI agent that reads intent, checks CRM history, and routes only sales-ready opportunities.",
    automation:
      "Inbound message → intent → enrichment → score → CRM write → owner notify.",
    result:
      "Reps start with context, not triage — and response time drops for the leads that matter.",
    metrics: [
      { label: "Triaged auto", value: "61%" },
      { label: "Reply speed", value: "4×" },
      { label: "CRM completeness", value: "↑" },
    ],
  },
] as const;

export const MANUAL_FLOW = [
  "Website",
  "Human",
  "Spreadsheet",
  "Human",
  "CRM",
  "Human",
  "Email",
  "Human",
] as const;

export const AUTONOMOUS_FLOW = [
  "Trigger",
  "AI Agent",
  "Decision Engine",
  "Automation",
  "Database",
  "Customer",
  "Analytics",
] as const;

export const BUILDER_NODES = [
  { type: "WHEN", label: "New Shopify Order" },
  { type: "AI", label: "Analyze Order" },
  { type: "IF", label: "Inventory Available" },
  { type: "THEN", label: "Fulfill Order" },
  { type: "AND", label: "Update CRM" },
  { type: "AND", label: "Notify Customer" },
] as const;

export const COMPETITOR_PIPELINE = [
  "Discover Products",
  "Extract Product Data",
  "Track Prices",
  "Track Inventory",
  "Detect Changes",
  "Store History",
  "Generate Insights",
  "Alert Business",
] as const;

import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { seedData } from "./seed";
import type { AppData, Company, PlanId, Role, User } from "./types";
import { defaultDecisionSettings } from "./migrate";

const DATA_DIR = path.join(process.cwd(), "data");
const REGISTRY_FILE = path.join(DATA_DIR, "registry.json");
const TENANTS_DIR = path.join(DATA_DIR, "tenants");

export type RegistryUser = User & {
  companyId: string;
  passwordHash: string;
  createdAt: string;
};

export type RegistryCompany = Company & {
  createdAt: string;
  onboardingCompleted: boolean;
  ownerUserId: string;
};

export type Registry = {
  companies: RegistryCompany[];
  users: RegistryUser[];
};

function hashPassword(password: string) {
  return createHash("sha256").update(`forge:${password}`).digest("hex");
}

export function verifyPassword(password: string, passwordHash: string) {
  return hashPassword(password) === passwordHash;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function id(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4)}`;
}

async function ensureDirs() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(TENANTS_DIR, { recursive: true });
}

export async function readRegistry(): Promise<Registry> {
  await ensureDirs();
  try {
    const raw = await fs.readFile(REGISTRY_FILE, "utf8");
    return JSON.parse(raw) as Registry;
  } catch {
    const seeded = await seedDemoRegistry();
    return seeded;
  }
}

export async function writeRegistry(registry: Registry) {
  await ensureDirs();
  await fs.writeFile(REGISTRY_FILE, JSON.stringify(registry, null, 2), "utf8");
  return registry;
}

function tenantPath(companyId: string) {
  return path.join(TENANTS_DIR, `${companyId}.json`);
}

export async function readCompanyTenant(companyId: string): Promise<AppData> {
  await ensureDirs();
  const raw = await fs.readFile(tenantPath(companyId), "utf8");
  return JSON.parse(raw) as AppData;
}

export async function writeCompanyTenant(companyId: string, data: AppData) {
  await ensureDirs();
  await fs.writeFile(tenantPath(companyId), JSON.stringify(data, null, 2), "utf8");
  return data;
}

async function seedDemoRegistry(): Promise<Registry> {
  const companyId = "co_apex";
  const users: RegistryUser[] = [
    {
      id: "u_owner",
      companyId,
      name: "Jordan Hale",
      email: "jordan@apexmetalworks.com",
      role: "owner",
      department: "Executive",
      avatarInitials: "JH",
      passwordHash: hashPassword("demo1234"),
      createdAt: new Date().toISOString(),
    },
    {
      id: "u_sales",
      companyId,
      name: "Sofia Nguyen",
      email: "sofia@apexmetalworks.com",
      role: "salesperson",
      department: "Sales",
      avatarInitials: "SN",
      passwordHash: hashPassword("demo1234"),
      createdAt: new Date().toISOString(),
    },
    {
      id: "u_prod",
      companyId,
      name: "Mike Torres",
      email: "mike@apexmetalworks.com",
      role: "production_manager",
      department: "Production",
      avatarInitials: "MT",
      passwordHash: hashPassword("demo1234"),
      createdAt: new Date().toISOString(),
    },
  ];

  const company: RegistryCompany = {
    id: companyId,
    name: "Apex Metalworks",
    industry: "Metal fabrication & components",
    plan: "growth",
    plants: ["Plant A — Houston"],
    createdAt: new Date().toISOString(),
    onboardingCompleted: true,
    ownerUserId: "u_owner",
    country: "United States",
    employeeBand: "50-200",
  };

  const registry: Registry = { companies: [company], users };
  await writeRegistry(registry);
  await writeCompanyTenant(companyId, {
    ...structuredClone(seedData),
    company: {
      ...seedData.company,
      id: companyId,
      onboardingCompleted: true,
      createdAt: company.createdAt,
      country: "United States",
      employeeBand: "50-200",
    },
    user: users[0],
  });
  return registry;
}

export function buildEmptyTenant(input: {
  company: Company;
  owner: User;
}): AppData {
  return {
    company: {
      ...input.company,
      onboardingCompleted: input.company.onboardingCompleted ?? false,
    },
    user: input.owner,
    customers: [],
    suppliers: [],
    products: [],
    boms: [],
    quotations: [],
    salesOrders: [],
    purchaseOrders: [],
    productionOrders: [],
    workOrders: [],
    machines: [],
    maintenance: [],
    qualityChecks: [],
    warehouses: [{ id: "w1", name: "Main Warehouse", zones: ["Raw Materials", "WIP", "Finished Goods"] }],
    invoices: [],
    bankAccounts: [
      { id: "b1", name: "Operating Account", type: "bank", balance: 0 },
      { id: "b2", name: "Petty Cash", type: "cash", balance: 0 },
    ],
    employees: [],
    alerts: [
      {
        id: "a_welcome",
        severity: "info",
        module: "Onboarding",
        title: "Welcome to Forge",
        detail: "Complete onboarding, then run the Decision Center as your plant data grows.",
        time: "just now",
      },
    ],
    aiInsights: [],
    metrics: {
      revenue: 0,
      salesOrders: 0,
      productionOrders: 0,
      pendingOrders: 0,
      lowStockItems: 0,
      purchaseOrders: 0,
      receivables: 0,
      payables: 0,
      cashBalance: 0,
    },
    revenueTrend: [
      { month: "M1", revenue: 0, cogs: 0, profit: 0 },
      { month: "M2", revenue: 0, cogs: 0, profit: 0 },
    ],
    productionTrend: [
      { day: "Mon", planned: 0, actual: 0 },
      { day: "Tue", planned: 0, actual: 0 },
    ],
    decisions: [],
    decisionSettings: { ...defaultDecisionSettings },
    dispatchHolds: [],
    qcBlocks: [],
  };
}

export type SignupInput = {
  companyName: string;
  industry: string;
  plantName: string;
  country?: string;
  employeeBand?: string;
  plan: PlanId;
  ownerName: string;
  ownerEmail: string;
  password: string;
  withSampleData?: boolean;
};

export async function signupCompany(input: SignupInput) {
  const registry = await readRegistry();
  const email = input.ownerEmail.trim().toLowerCase();
  if (registry.users.some((u) => u.email.toLowerCase() === email)) {
    throw new Error("An account with this email already exists. Sign in instead.");
  }
  if (!input.companyName.trim()) throw new Error("Company name is required");
  if (!input.password || input.password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  const companyId = id("co");
  const userId = id("u");
  const now = new Date().toISOString();

  const owner: RegistryUser = {
    id: userId,
    companyId,
    name: input.ownerName.trim(),
    email,
    role: "owner",
    department: "Executive",
    avatarInitials: initials(input.ownerName),
    passwordHash: hashPassword(input.password),
    createdAt: now,
  };

  const company: RegistryCompany = {
    id: companyId,
    name: input.companyName.trim(),
    industry: input.industry.trim() || "Manufacturing",
    plan: input.plan,
    plants: [input.plantName.trim() || "Plant 1"],
    createdAt: now,
    onboardingCompleted: false,
    ownerUserId: userId,
    country: input.country?.trim() || "",
    employeeBand: input.employeeBand?.trim() || "",
  };

  const publicOwner: User = {
    id: owner.id,
    companyId,
    name: owner.name,
    email: owner.email,
    role: owner.role,
    department: owner.department,
    avatarInitials: owner.avatarInitials,
  };

  let tenant = buildEmptyTenant({
    company: {
      id: company.id,
      name: company.name,
      industry: company.industry,
      plan: company.plan,
      plants: company.plants,
      createdAt: company.createdAt,
      onboardingCompleted: false,
      country: company.country,
      employeeBand: company.employeeBand,
    },
    owner: publicOwner,
  });

  if (input.withSampleData) {
    const sample = structuredClone(seedData);
    tenant = {
      ...sample,
      company: tenant.company,
      user: publicOwner,
      alerts: [
        {
          id: "a_sample",
          severity: "info",
          module: "Onboarding",
          title: "Sample manufacturing data loaded",
          detail: "Explore Decision Center with realistic Apex-style demo records for your new tenant.",
          time: "just now",
        },
        ...sample.alerts,
      ],
    };
  }

  registry.companies.push(company);
  registry.users.push(owner);
  await writeRegistry(registry);
  await writeCompanyTenant(companyId, tenant);

  return { company, user: publicOwner, tenant };
}

export async function findUserByEmail(email: string) {
  const registry = await readRegistry();
  return registry.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase()) ?? null;
}

export async function authenticate(email: string, password: string) {
  const registry = await readRegistry();
  const user = registry.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user || !verifyPassword(password, user.passwordHash)) return null;
  const company = registry.companies.find((c) => c.id === user.companyId);
  if (!company) return null;
  return { user, company };
}

export async function getCompany(companyId: string) {
  const registry = await readRegistry();
  return registry.companies.find((c) => c.id === companyId) ?? null;
}

export async function getRegistryUser(companyId: string, userId: string) {
  const registry = await readRegistry();
  return (
    registry.users.find((u) => u.companyId === companyId && u.id === userId) ?? null
  );
}

export async function completeOnboarding(
  companyId: string,
  patch: {
    companyName?: string;
    industry?: string;
    plantName?: string;
    plan?: PlanId;
    country?: string;
    employeeBand?: string;
    inviteEmail?: string;
    inviteName?: string;
    inviteRole?: Role;
  }
) {
  const registry = await readRegistry();
  const company = registry.companies.find((c) => c.id === companyId);
  if (!company) throw new Error("Company not found");

  company.name = patch.companyName?.trim() || company.name;
  company.industry = patch.industry?.trim() || company.industry;
  company.plan = patch.plan || company.plan;
  company.country = patch.country?.trim() || company.country;
  company.employeeBand = patch.employeeBand?.trim() || company.employeeBand;
  if (patch.plantName?.trim()) {
    company.plants = [patch.plantName.trim(), ...company.plants.filter((p) => p !== patch.plantName)];
  }
  company.onboardingCompleted = true;

  if (patch.inviteEmail?.trim()) {
    const inviteEmail = patch.inviteEmail.trim().toLowerCase();
    if (!registry.users.some((u) => u.email === inviteEmail)) {
      const inviteName = patch.inviteName?.trim() || inviteEmail.split("@")[0];
      registry.users.push({
        id: id("u"),
        companyId,
        name: inviteName,
        email: inviteEmail,
        role: patch.inviteRole || "admin",
        department: "Operations",
        avatarInitials: initials(inviteName),
        passwordHash: hashPassword("changeme123"),
        createdAt: new Date().toISOString(),
      });
    }
  }

  await writeRegistry(registry);

  const tenant = await readCompanyTenant(companyId);
  tenant.company = {
    ...tenant.company,
    name: company.name,
    industry: company.industry,
    plan: company.plan,
    plants: company.plants,
    country: company.country,
    employeeBand: company.employeeBand,
    onboardingCompleted: true,
  };
  await writeCompanyTenant(companyId, tenant);

  return { company, tenant };
}

export async function listCompanies() {
  const registry = await readRegistry();
  return registry.companies.map((c) => ({
    id: c.id,
    name: c.name,
    plan: c.plan,
    industry: c.industry,
    onboardingCompleted: c.onboardingCompleted,
    createdAt: c.createdAt,
  }));
}

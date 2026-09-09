import { promises as fs } from "fs";
import path from "path";
import { seedData } from "./seed";
import type { AppData } from "./types";
import {
  convertQuotation,
  createPurchaseFromShortage,
  startProduction,
} from "./mutations";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "tenant.json");

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(seedData, null, 2), "utf8");
  }
}

export async function readTenant(): Promise<AppData> {
  await ensureStore();
  const raw = await fs.readFile(DATA_FILE, "utf8");
  return JSON.parse(raw) as AppData;
}

export async function writeTenant(data: AppData): Promise<AppData> {
  await ensureStore();
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
  return data;
}

export async function resetTenant(): Promise<AppData> {
  return writeTenant(structuredClone(seedData));
}

export async function mutateConvertQuotation(quotationId: string) {
  const current = await readTenant();
  const result = convertQuotation(current, quotationId);
  await writeTenant(result.data);
  return result;
}

export async function mutateStartProduction(productionOrderId: string) {
  const current = await readTenant();
  const result = startProduction(current, productionOrderId);
  await writeTenant(result.data);
  return result;
}

export async function mutateShortagePurchase(productionOrderId: string) {
  const current = await readTenant();
  const result = createPurchaseFromShortage(current, productionOrderId);
  await writeTenant(result.data);
  return result;
}

export type RevenueShareInput = {
  grossPaisa: number;
  platformShareBps?: number; // basis points, default 3000 = 30%
};

export type RevenueShareSplit = {
  grossPaisa: number;
  platformSharePaisa: number;
  institutionSharePaisa: number;
  platformShareBps: number;
};

export function splitTutorRevenue(input: RevenueShareInput): RevenueShareSplit {
  const bps = input.platformShareBps ?? 3000;
  const platformSharePaisa = Math.floor((input.grossPaisa * bps) / 10_000);
  return {
    grossPaisa: input.grossPaisa,
    platformSharePaisa,
    institutionSharePaisa: input.grossPaisa - platformSharePaisa,
    platformShareBps: bps,
  };
}

export function withinDailyTutorCap(sentToday: number, dailyCap: number): boolean {
  return sentToday < dailyCap;
}

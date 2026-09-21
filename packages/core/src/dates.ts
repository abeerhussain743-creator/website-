const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** Format as `22 Sep 2026` */
export function formatDate(input: Date | string | number): string {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid date");
  const day = d.getUTCDate();
  const month = MONTHS[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

export function isWithinQuietHours(
  hour: number,
  start = 21,
  end = 8,
): boolean {
  if (start === end) return false;
  if (start > end) {
    // e.g. 21–8 overnight
    return hour >= start || hour < end;
  }
  return hour >= start && hour < end;
}

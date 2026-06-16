/**
 * US equity market calendar helpers.
 *
 * The app is a long-term research tool, not an intraday trader, so it
 * keys all market data to the latest *completed* US trading session.
 * Rules:
 *  - On a US weekday after 16:00 ET → that day's close is the latest.
 *  - Before 16:00 ET on a weekday → the prior trading day's close.
 *  - Weekends → the most recent Friday close (minus holidays).
 *  - US market holidays → walk back to the prior trading day.
 *
 * Holiday list is intentionally small and US-NYSE-focused. Update
 * yearly; missing a holiday only causes us to report one stale day.
 */

// YYYY-MM-DD strings (NYSE full closures). Keep current + next year.
const US_MARKET_HOLIDAYS = new Set<string>([
  // 2025
  "2025-01-01", "2025-01-20", "2025-02-17", "2025-04-18",
  "2025-05-26", "2025-06-19", "2025-07-04", "2025-09-01",
  "2025-11-27", "2025-12-25",
  // 2026
  "2026-01-01", "2026-01-19", "2026-02-16", "2026-04-03",
  "2026-05-25", "2026-06-19", "2026-07-03", "2026-09-07",
  "2026-11-26", "2026-12-25",
  // 2027
  "2027-01-01", "2027-01-18", "2027-02-15", "2027-03-26",
  "2027-05-31", "2027-06-18", "2027-07-05", "2027-09-06",
  "2027-11-25", "2027-12-24",
]);

const MARKET_CLOSE_HOUR_ET = 16; // 4 PM

/** Returns the current date+time expressed in US/Eastern. */
function nowInEastern(now: Date = new Date()): { y: number; m: number; d: number; hour: number; weekday: number } {
  // Intl.DateTimeFormat with the en-US locale and ET timezone gives us
  // the wall-clock values directly without pulling in tz libraries.
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    y: Number(parts.year),
    m: Number(parts.month),
    d: Number(parts.day),
    hour: Number(parts.hour),
    weekday: weekdayMap[parts.weekday ?? "Mon"] ?? 1,
  };
}

function toISODate(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function isWeekend(weekday: number): boolean {
  return weekday === 0 || weekday === 6;
}

function isHoliday(dateISO: string): boolean {
  return US_MARKET_HOLIDAYS.has(dateISO);
}

/** Step a date string back by one calendar day. */
function previousDay(dateISO: string): string {
  // Use UTC math to avoid local-tz drift; the date is just a label.
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return toISODate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

function weekdayOf(dateISO: string): number {
  const [y, m, d] = dateISO.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/**
 * Latest completed US trading session as a YYYY-MM-DD string (ET calendar date).
 */
export function getLatestCompletedTradingDay(now: Date = new Date()): string {
  const et = nowInEastern(now);
  let candidate = toISODate(et.y, et.m, et.d);

  // If today is a weekday + holiday-free + past 4pm ET → today's close is final.
  const todayUsable = !isWeekend(et.weekday) && !isHoliday(candidate) && et.hour >= MARKET_CLOSE_HOUR_ET;
  if (!todayUsable) {
    candidate = previousDay(candidate);
  }

  // Walk back over weekends + holidays.
  for (let i = 0; i < 10; i++) {
    const wd = weekdayOf(candidate);
    if (!isWeekend(wd) && !isHoliday(candidate)) return candidate;
    candidate = previousDay(candidate);
  }
  return candidate;
}

/**
 * Classify how fresh a stored trade_date is relative to the latest
 * completed trading day.
 */
export type DataFreshness = "fresh" | "stale" | "missing";

export function classifyFreshness(
  tradeDateISO: string | null | undefined,
  now: Date = new Date(),
): DataFreshness {
  if (!tradeDateISO) return "missing";
  const latest = getLatestCompletedTradingDay(now);
  if (tradeDateISO === latest) return "fresh";
  // Within ~3 calendar days of the latest close is "stale" (e.g. cron lag,
  // long weekend); anything older is treated as missing.
  const a = new Date(`${tradeDateISO}T00:00:00Z`).getTime();
  const b = new Date(`${latest}T00:00:00Z`).getTime();
  const ageDays = Math.round((b - a) / (24 * 60 * 60 * 1000));
  return ageDays <= 3 ? "stale" : "missing";
}
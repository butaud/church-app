export const CHURCH_TIME_ZONE = "America/Los_Angeles";

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getLocalHourAndWeekday(date: Date): {
  hour: number;
  weekday: string;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CHURCH_TIME_ZONE,
    weekday: "long",
    hour: "numeric",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")!.value) % 24;
  const weekday = parts.find((p) => p.type === "weekday")!.value;
  return { hour, weekday };
}

export function getLocalDateStr(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CHURCH_TIME_ZONE,
  }).format(date);
}

export function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// "2026-11-01" -> "Sunday, November 1"
export function formatDateLong(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

// "18:00" -> "6:00 PM"; empty or malformed input -> ""
export function formatTimeLabel(time: string): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return "";
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

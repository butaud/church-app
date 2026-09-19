export function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// year: full year, month: 0-indexed
export function sundaysInMonth(year: number, month: number): string[] {
  const dates: string[] = [];
  const d = new Date(Date.UTC(year, month, 1));
  while (d.getUTCDay() !== 0) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  while (d.getUTCMonth() === month) {
    dates.push(toDateStr(d));
    d.setUTCDate(d.getUTCDate() + 7);
  }
  return dates;
}

export function formatDateLong(dateStr: string): string {
  const [y, m, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, day));
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateShort(dateStr: string): string {
  const [y, m, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, day));
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function monthLabel(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 1)).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

import type { DateRange } from "../types/dashboard";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 1000 * 60 * 60 * 24;

function toIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseDateRange(url: URL): DateRange {
  const today = new Date();
  const fallbackTo = toIsoDay(today);
  const fallbackFrom = toIsoDay(new Date(today.getTime() - 29 * DAY_MS));

  const from = url.searchParams.get("from") ?? fallbackFrom;
  const to = url.searchParams.get("to") ?? fallbackTo;

  if (!ISO_DATE.test(from) || !ISO_DATE.test(to)) {
    return { from: fallbackFrom, to: fallbackTo };
  }

  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T00:00:00.000Z`);

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return { from: fallbackFrom, to: fallbackTo };
  }

  if (fromDate > toDate) {
    return { from: fallbackFrom, to: fallbackTo };
  }

  const maxRangeDays = 365;
  const rangeDays = Math.floor((toDate.getTime() - fromDate.getTime()) / DAY_MS);
  if (rangeDays > maxRangeDays) {
    return { from: fallbackFrom, to: fallbackTo };
  }

  return { from, to };
}

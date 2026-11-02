import { ConvexError } from "convex/values";

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function formatDay(isoDate: string) {
  return dayFormat.format(new Date(`${isoDate}T00:00:00Z`));
}

export function formatRange(startDate: string, endDate: string) {
  if (startDate === endDate) return formatDay(startDate);
  return `${formatDay(startDate)} – ${formatDay(endDate)}`;
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

export function timeAgo(timestamp: number, now = Date.now()) {
  const elapsed = timestamp - now;
  for (const [unit, ms] of UNITS) {
    if (Math.abs(elapsed) >= ms) {
      return relative.format(Math.round(elapsed / ms), unit);
    }
  }
  return "just now";
}

export function localToday() {
  return new Date().toLocaleDateString("en-CA");
}

export function errorMessage(error: unknown) {
  if (error instanceof ConvexError && typeof error.data === "string") {
    return error.data;
  }
  return "Something went wrong. Please try again.";
}

/**
 * The demo's clock. The whole demo is one working day, and times are minutes
 * since midnight. "Skip ahead" moves the clock on half an hour at a time.
 */

export const DAY_NAME = "Thursday, June 10, 2027";
export const SHIFT_START = 8 * 60;
export const SHIFT_END = 17 * 60;
/** When a visitor arrives, the day is already under way. */
export const START_NOW = 9 * 60 + 30;
export const STEP = 30;
/** The clock stops here: the last jobs are finishing and nothing new will happen. */
export const LAST_NOW = 17 * 60 + 30;

/** "2:40 PM" */
export function fmtTime(minutes: number): string {
  const m = Math.round(minutes);
  const hour = Math.floor(m / 60) % 24;
  const minute = m % 60;
  return `${hour % 12 === 0 ? 12 : hour % 12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
}

/** "2 PM", or "2:30 PM" when it is not on the hour. */
export function fmtHour(minutes: number): string {
  return fmtTime(minutes).replace(":00", "");
}

/** "1 to 3 PM", "11 AM to 1 PM" */
export function fmtWindow(start: number, end: number): string {
  const a = fmtHour(start);
  const b = fmtHour(end);
  return a.slice(-2) === b.slice(-2) ? `${a.slice(0, -3)} to ${b}` : `${a} to ${b}`;
}

/** "between 11 AM and 1 PM" */
export const fmtBetween = (start: number, end: number) => `between ${fmtWindow(start, end).replace(" to ", " and ")}`;

/** "25 minutes", "1 hour", "1 hour 15 minutes" */
export function fmtDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const hours = Math.floor(m / 60);
  const rest = m % 60;
  const h = hours === 0 ? "" : hours === 1 ? "1 hour" : `${hours} hours`;
  const r = rest === 0 ? "" : rest === 1 ? "1 minute" : `${rest} minutes`;
  return [h, r].filter(Boolean).join(" ") || "no time";
}

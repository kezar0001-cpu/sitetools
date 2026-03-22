/**
 * Date utility helpers used across the SitePlan module.
 *
 * Originally defined inline in GanttChart.tsx; extracted here so
 * GanttChart, MilestoneTimeline and any future components share
 * a single, tested source of truth.
 */

/** Number of whole days between two Date objects (always positive going forward). */
export function daysBetween(a: Date, b: Date): number {
  return Math.ceil((b.getTime() - a.getTime()) / 86400000);
}

/** Return a new Date that is `n` calendar days after `d`. */
export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** Monday of the week containing `d`. */
export function startOfWeek(d: Date): Date {
  const r = new Date(d);
  r.setDate(r.getDate() - r.getDay() + 1);
  return r;
}

/** First day of the month containing `d`. */
export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** First day of the calendar quarter containing `d`. */
export function startOfQuarter(d: Date): Date {
  const qMonth = Math.floor(d.getMonth() / 3) * 3;
  return new Date(d.getFullYear(), qMonth, 1);
}

/** e.g. "Jan 2026" */
export function formatMonth(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/** e.g. "Jan 5" */
export function formatWeek(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** e.g. "5" (day of month only) */
export function formatDay(d: Date): string {
  return d.toLocaleDateString("en-US", { day: "numeric" });
}

/** e.g. "Q1 2026" */
export function formatQuarter(d: Date): string {
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `Q${q} ${d.getFullYear()}`;
}

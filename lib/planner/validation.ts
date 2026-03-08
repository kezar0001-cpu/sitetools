import { TaskStatus, PublicHoliday } from "./types";

export function normalizePercent(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function statusFromPercent(value: number, current: TaskStatus): TaskStatus {
  if (value >= 100) return "done";
  if (value <= 0 && current === "done") return "in-progress";
  if (value > 0 && current === "not-started") return "in-progress";
  return current;
}

export function calculateDurationDays(plannedStart: string | null, plannedFinish: string | null): number | null {
  if (!plannedStart || !plannedFinish) return null;
  const start = new Date(plannedStart);
  const finish = new Date(plannedFinish);
  if (Number.isNaN(start.getTime()) || Number.isNaN(finish.getTime())) return null;
  const ms = finish.getTime() - start.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

/** Calculate end date from start + duration (calendar days). */
export function calculateEndDate(startDate: string, durationDays: number): string {
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime()) || durationDays < 0) return startDate;
  const end = new Date(start);
  end.setDate(end.getDate() + durationDays);
  return end.toISOString().slice(0, 10);
}

/** Check if a date falls on a weekend (Sat/Sun). */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/** Check if a date is a public holiday. */
export function isHoliday(date: Date, holidays: PublicHoliday[]): boolean {
  const dateStr = date.toISOString().slice(0, 10);
  return holidays.some((h) => h.holiday_date === dateStr);
}

/** Calculate working days between two dates (excludes weekends + holidays). */
export function calculateWorkingDays(
  startDate: string,
  endDate: string,
  holidays: PublicHoliday[] = []
): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;

  let workingDays = 0;
  const current = new Date(start);

  while (current <= end) {
    if (!isWeekend(current) && !isHoliday(current, holidays)) {
      workingDays++;
    }
    current.setDate(current.getDate() + 1);
  }

  return workingDays;
}

/** Add working days to a start date (skips weekends + holidays). */
export function addWorkingDays(
  startDate: string,
  workingDays: number,
  holidays: PublicHoliday[] = []
): string {
  const current = new Date(startDate);
  if (Number.isNaN(current.getTime()) || workingDays <= 0) return startDate;

  let added = 0;
  while (added < workingDays) {
    current.setDate(current.getDate() + 1);
    if (!isWeekend(current) && !isHoliday(current, holidays)) {
      added++;
    }
  }

  return current.toISOString().slice(0, 10);
}


/**
 * Calculate expected progress as-of a date using planned start/finish.
 * Returns null when planned dates are missing or invalid.
 */
export function calculateExpectedProgress(
  plannedStart: string | null,
  plannedFinish: string | null,
  asOf: Date = new Date()
): number | null {
  if (!plannedStart || !plannedFinish) return null;

  const start = new Date(plannedStart);
  const finish = new Date(plannedFinish);
  if (Number.isNaN(start.getTime()) || Number.isNaN(finish.getTime())) return null;

  if (finish.getTime() <= start.getTime()) {
    return asOf.getTime() >= finish.getTime() ? 100 : 0;
  }

  if (asOf.getTime() <= start.getTime()) return 0;
  if (asOf.getTime() >= finish.getTime()) return 100;

  const elapsed = asOf.getTime() - start.getTime();
  const total = finish.getTime() - start.getTime();
  return normalizePercent((elapsed / total) * 100);
}

/** Positive value means ahead of plan, negative means behind plan. */
export function calculateProgressVariance(
  actualPercent: number,
  plannedStart: string | null,
  plannedFinish: string | null,
  asOf: Date = new Date()
): number | null {
  const expected = calculateExpectedProgress(plannedStart, plannedFinish, asOf);
  if (expected === null) return null;
  return normalizePercent(actualPercent) - expected;
}

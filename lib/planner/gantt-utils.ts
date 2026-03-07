import { PlanTask, PublicHoliday, STATUS_COLORS } from "./types";

/** Generate an array of dates between start and end (inclusive). */
export function generateDateRange(startDate: Date, endDate: Date): Date[] {
    const dates: Date[] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

/** Get earliest and latest dates across all tasks, with padding. */
export function getTaskDateRange(
    tasks: PlanTask[],
    paddingDays: number = 7
): { start: Date; end: Date } {
    const now = new Date();
    let earliest = new Date(now);
    let latest = new Date(now);
    latest.setDate(latest.getDate() + 30);

    for (const task of tasks) {
        if (task.planned_start) {
            const d = new Date(task.planned_start);
            if (d < earliest) earliest = new Date(d);
        }
        if (task.planned_finish) {
            const d = new Date(task.planned_finish);
            if (d > latest) latest = new Date(d);
        }
        if (task.actual_start) {
            const d = new Date(task.actual_start);
            if (d < earliest) earliest = new Date(d);
        }
        if (task.actual_finish) {
            const d = new Date(task.actual_finish);
            if (d > latest) latest = new Date(d);
        }
    }

    earliest.setDate(earliest.getDate() - paddingDays);
    latest.setDate(latest.getDate() + paddingDays);

    return { start: earliest, end: latest };
}

/** Calculate the pixel offset and width for a task bar. */
export function calculateTaskBar(
    task: PlanTask,
    rangeStart: Date,
    dayWidth: number
): { offsetPx: number; widthPx: number; color: string } | null {
    if (!task.planned_start) return null;

    const start = new Date(task.planned_start);
    const finish = task.planned_finish
        ? new Date(task.planned_finish)
        : new Date(start.getTime() + 86400000); // Default 1 day

    const startOffset = Math.floor(
        (start.getTime() - rangeStart.getTime()) / 86400000
    );
    const duration = Math.max(
        1,
        Math.ceil((finish.getTime() - start.getTime()) / 86400000)
    );

    return {
        offsetPx: startOffset * dayWidth,
        widthPx: Math.max(dayWidth * 0.5, duration * dayWidth),
        color: STATUS_COLORS[task.status] ?? "#94a3b8",
    };
}

/** Calculate today marker pixel offset. */
export function getTodayOffset(rangeStart: Date, dayWidth: number): number {
    const now = new Date();
    const daysDiff = (now.getTime() - rangeStart.getTime()) / 86400000;
    return Math.floor(daysDiff * dayWidth);
}

/** Format a date to short display. */
export function formatDateShort(date: Date): string {
    return date.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

/** Format a date for column header (e.g., "Mon 10"). */
export function formatDayHeader(date: Date): string {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return `${days[date.getDay()]} ${date.getDate()}`;
}

/** Format month header. */
export function formatMonthHeader(date: Date): string {
    return date.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}

/** Check if a date is a weekend. */
export function isWeekendDate(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
}

/** Check if a date is a holiday. */
export function isHolidayDate(date: Date, holidays: PublicHoliday[]): boolean {
    const dateStr = date.toISOString().slice(0, 10);
    return holidays.some((h) => h.holiday_date === dateStr);
}

/** Group dates by month for header rendering. */
export function groupDatesByMonth(dates: Date[]): Array<{ label: string; count: number }> {
    const groups: Array<{ label: string; count: number }> = [];
    let currentLabel = "";
    let count = 0;

    for (const date of dates) {
        const label = formatMonthHeader(date);
        if (label === currentLabel) {
            count++;
        } else {
            if (currentLabel) groups.push({ label: currentLabel, count });
            currentLabel = label;
            count = 1;
        }
    }
    if (currentLabel) groups.push({ label: currentLabel, count });

    return groups;
}

/** Get day width based on zoom level. */
export function getDayWidth(zoomLevel: "day" | "week" | "month"): number {
    switch (zoomLevel) {
        case "day": return 36;
        case "week": return 18;
        case "month": return 6;
        default: return 18;
    }
}

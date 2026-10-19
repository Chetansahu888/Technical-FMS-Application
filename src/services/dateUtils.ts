/**
 * Date and SLA Calculation Utilities
 * Context: Asia/Kolkata (IST: UTC+05:30)
 * Date format standard: MM/DD/YYYY HH:mm:ss
 */

/**
 * Converts a Date object or ISO string to Asia/Kolkata Date representation
 */
export function getISTDate(dateInput?: Date | string | number): Date {
  const d = dateInput ? new Date(dateInput) : new Date();
  // Using Intl to resolve IST components
  const istString = d.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  return new Date(istString);
}

/**
 * Formats date as MM/DD/YYYY HH:mm:ss (IST)
 */
export function formatISTDateTime(dateInput?: string | Date | null): string {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';

  // Format into MM/DD/YYYY HH:mm:ss using Asia/Kolkata
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  let month = '01', day = '01', year = '2026', hour = '00', minute = '00', second = '00';

  parts.forEach(p => {
    if (p.type === 'month') month = p.value;
    if (p.type === 'day') day = p.value;
    if (p.type === 'year') year = p.value;
    if (p.type === 'hour') hour = p.value;
    if (p.type === 'minute') minute = p.value;
    if (p.type === 'second') second = p.value;
  });

  return `${month}/${day}/${year} ${hour}:${minute}:${second}`;
}

/**
 * Calculates next Planned Date based on working days and SLA days.
 * Preserves the exact local hour and minute of the request.
 * 
 * Default:
 * Sunday (0) is non-working.
 * Saturday (6) is working.
 * SLA = 1 working day.
 * 
 * Examples:
 * Friday 2:30 PM -> Saturday 2:30 PM
 * Saturday 2:30 PM -> Monday 2:30 PM
 */
export function calculatePlannedDate(
  requestDateInput: string | Date,
  workingDays: number[] = [1, 2, 3, 4, 5, 6], // 0=Sun, 1=Mon, ..., 6=Sat
  slaDays: number = 1
): string {
  const reqDate = new Date(requestDateInput);
  
  // Clone date in IST frame
  let cursor = new Date(reqDate.getTime());
  let addedWorkingDays = 0;

  // Add working days one by one
  while (addedWorkingDays < slaDays) {
    // Move forward by 24 hours (calendar day)
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
    
    // Check day of week in Asia/Kolkata
    const dayOfWeekStr = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short'
    }).format(cursor);

    // Map day string to index 0..6
    const dayMap: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6
    };
    const dayOfWeek = dayMap[dayOfWeekStr] ?? cursor.getDay();

    if (workingDays.includes(dayOfWeek)) {
      addedWorkingDays++;
    }
  }

  return cursor.toISOString();
}

/**
 * Format a duration in milliseconds to human-readable string:
 * "X days Y hours" or "Y hours Z mins" or "Z mins"
 */
export function formatDuration(ms: number): string {
  if (ms <= 0) return '0 mins';

  const totalMinutes = Math.floor(ms / (1000 * 60));
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;
  const remainingMinutes = totalMinutes % 60;

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
  }
  if (remainingHours > 0) {
    parts.push(`${remainingHours} ${remainingHours === 1 ? 'hr' : 'hrs'}`);
  }
  if (parts.length === 0 || (days === 0 && remainingMinutes > 0)) {
    parts.push(`${remainingMinutes} mins`);
  }

  return parts.slice(0, 2).join(' ');
}

export interface TicketDelayStatus {
  isOverdue: boolean;
  delayMs: number;
  delayFormatted: string;
  isCompleted: boolean;
  isRemaining: boolean;
  remainingMs: number;
  remainingFormatted: string;
}

/**
 * Calculates whether a ticket is overdue, its delay or remaining time.
 * Overdue: Actual is blank and current time is later than Planned.
 * Completed Delay: MAX(Actual - Planned, 0)
 * Pending Overdue Duration: MAX(Current Time - Planned, 0)
 * Delay uses calendar elapsed time (including Sundays).
 */
export function getTicketDelayInfo(
  plannedDateStr: string,
  actualDateStr?: string | null,
  nowInput?: Date
): TicketDelayStatus {
  const plannedTime = new Date(plannedDateStr).getTime();
  const now = (nowInput || new Date()).getTime();
  const hasActual = Boolean(actualDateStr && !isNaN(new Date(actualDateStr).getTime()));
  const actualTime = hasActual ? new Date(actualDateStr!).getTime() : 0;

  if (hasActual) {
    // Completed ticket
    const delay = Math.max(0, actualTime - plannedTime);
    return {
      isOverdue: actualTime > plannedTime,
      delayMs: delay,
      delayFormatted: delay > 0 ? formatDuration(delay) : 'On Time',
      isCompleted: true,
      isRemaining: false,
      remainingMs: 0,
      remainingFormatted: '-'
    };
  }

  // Not completed yet
  if (now > plannedTime) {
    const overdueMs = now - plannedTime;
    return {
      isOverdue: true,
      delayMs: overdueMs,
      delayFormatted: `${formatDuration(overdueMs)} overdue`,
      isCompleted: false,
      isRemaining: false,
      remainingMs: 0,
      remainingFormatted: '-'
    };
  } else {
    const remainingMs = plannedTime - now;
    return {
      isOverdue: false,
      delayMs: 0,
      delayFormatted: '-',
      isCompleted: false,
      isRemaining: true,
      remainingMs: remainingMs,
      remainingFormatted: `${formatDuration(remainingMs)} left`
    };
  }
}

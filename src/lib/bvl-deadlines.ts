/**
 * BVL Quarterly Reporting Deadline Utilities
 * 
 * BVL (Bundesamt für Verbraucherschutz und Lebensmittelsicherheit) requires
 * quarterly reports for antibiotic usage. Deadlines are at the end of each quarter.
 * 
 * Quarter deadlines in Germany:
 * - Q1: March 31st (report due by end of Q2)
 * - Q2: June 30th (report due by end of Q3)
 * - Q3: September 30th (report due by end of Q4)
 * - Q4: December 31st (report due by end of Q1 next year)
 */

export interface BvlQuarter {
  quarter: 1 | 2 | 3 | 4;
  year: number;
  startDate: Date;
  endDate: Date;
  reportDeadline: Date;
  label: string;
  labelShort: string;
}

/**
 * Get the BVL reporting deadline for a given quarter
 * Reports for a quarter are due 3 months after the quarter ends
 */
export function getQuarterDeadline(year: number, quarter: 1 | 2 | 3 | 4): Date {
  const deadlines: Record<1 | 2 | 3 | 4, Date> = {
    1: new Date(year, 5, 30),     // Q1 report due June 30
    2: new Date(year, 8, 30),     // Q2 report due September 30
    3: new Date(year, 11, 31),    // Q3 report due December 31
    4: new Date(year + 1, 2, 31), // Q4 report due March 31 next year
  };
  return deadlines[quarter];
}

/**
 * Get quarter for a given date
 */
export function getQuarterFromDate(date: Date): 1 | 2 | 3 | 4 {
  const month = date.getMonth();
  if (month < 3) return 1;
  if (month < 6) return 2;
  if (month < 9) return 3;
  return 4;
}

/**
 * Get quarter start and end dates
 */
export function getQuarterDates(year: number, quarter: 1 | 2 | 3 | 4): { start: Date; end: Date } {
  const quarters: Record<1 | 2 | 3 | 4, { start: Date; end: Date }> = {
    1: { start: new Date(year, 0, 1), end: new Date(year, 2, 31) },
    2: { start: new Date(year, 3, 1), end: new Date(year, 5, 30) },
    3: { start: new Date(year, 6, 1), end: new Date(year, 8, 30) },
    4: { start: new Date(year, 9, 1), end: new Date(year, 11, 31) },
  };
  return quarters[quarter];
}

/**
 * Get the current BVL quarter info
 */
export function getCurrentQuarter(): BvlQuarter {
  const now = new Date();
  const year = now.getFullYear();
  const quarter = getQuarterFromDate(now);
  const dates = getQuarterDates(year, quarter);
  
  const labels: Record<1 | 2 | 3 | 4, { long: string; short: string }> = {
    1: { long: '1. Quartal', short: 'Q1' },
    2: { long: '2. Quartal', short: 'Q2' },
    3: { long: '3. Quartal', short: 'Q3' },
    4: { long: '4. Quartal', short: 'Q4' },
  };

  return {
    quarter,
    year,
    startDate: dates.start,
    endDate: dates.end,
    reportDeadline: getQuarterDeadline(year, quarter),
    label: `${labels[quarter].long} ${year}`,
    labelShort: `${labels[quarter].short} ${year}`,
  };
}

/**
 * Get the next upcoming BVL reporting deadline
 */
export function getNextDeadline(): BvlQuarter {
  const now = new Date();
  const currentQuarter = getCurrentQuarter();
  
  // If we're still within the current quarter, deadline is end of this quarter
  if (now <= currentQuarter.endDate) {
    return currentQuarter;
  }
  
  // Otherwise, we're in the reporting period for the previous quarter
  // The next deadline is the next quarter's end
  const nextQuarter: 1 | 2 | 3 | 4 = currentQuarter.quarter === 4 ? 1 : (currentQuarter.quarter + 1) as 1 | 2 | 3 | 4;
  const nextYear = nextQuarter === 1 ? currentQuarter.year + 1 : currentQuarter.year;
  const dates = getQuarterDates(nextYear, nextQuarter);
  
  const labels: Record<1 | 2 | 3 | 4, { long: string; short: string }> = {
    1: { long: '1. Quartal', short: 'Q1' },
    2: { long: '2. Quartal', short: 'Q2' },
    3: { long: '3. Quartal', short: 'Q3' },
    4: { long: '4. Quartal', short: 'Q4' },
  };

  return {
    quarter: nextQuarter,
    year: nextYear,
    startDate: dates.start,
    endDate: dates.end,
    reportDeadline: getQuarterDeadline(nextYear, nextQuarter),
    label: `${labels[nextQuarter].long} ${nextYear}`,
    labelShort: `${labels[nextQuarter].short} ${nextYear}`,
  };
}

/**
 * Get the deadline for reporting the previous quarter's data
 * (This is the actual BVL submission deadline)
 */
export function getReportingDeadline(): BvlQuarter {
  const now = new Date();
  const year = now.getFullYear();
  const quarter = getQuarterFromDate(now);
  
  // The reporting deadline is for the PREVIOUS quarter
  // e.g., in Q2 (Apr-Jun), we're reporting Q1 data, due June 30
  const prevQuarter: 1 | 2 | 3 | 4 = quarter === 1 ? 4 : (quarter - 1) as 1 | 2 | 3 | 4;
  const prevYear = quarter === 1 ? year - 1 : year;
  const dates = getQuarterDates(prevYear, prevQuarter);
  
  const labels: Record<1 | 2 | 3 | 4, { long: string; short: string }> = {
    1: { long: '1. Quartal', short: 'Q1' },
    2: { long: '2. Quartal', short: 'Q2' },
    3: { long: '3. Quartal', short: 'Q3' },
    4: { long: '4. Quartal', short: 'Q4' },
  };

  return {
    quarter: prevQuarter,
    year: prevYear,
    startDate: dates.start,
    endDate: dates.end,
    reportDeadline: getQuarterDeadline(prevYear, prevQuarter),
    label: `${labels[prevQuarter].long} ${prevYear}`,
    labelShort: `${labels[prevQuarter].short} ${prevYear}`,
  };
}

/**
 * Calculate days remaining until deadline
 */
export function getDaysRemaining(deadline: Date): number {
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Calculate time remaining as human-readable string
 */
export function getTimeRemaining(deadline: Date): string {
  const days = getDaysRemaining(deadline);
  
  if (days < 0) {
    return 'Überfällig';
  }
  if (days === 0) {
    return 'Heute';
  }
  if (days === 1) {
    return '1 Tag';
  }
  if (days < 7) {
    return `${days} Tage`;
  }
  if (days < 14) {
    return '1 Woche';
  }
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} Woche${weeks > 1 ? 'n' : ''}`;
  }
  const months = Math.floor(days / 30);
  if (months === 1) {
    return '1 Monat';
  }
  return `${months} Monate`;
}

/**
 * Check if deadline is urgent (within 14 days)
 */
export function isDeadlineUrgent(deadline: Date): boolean {
  return getDaysRemaining(deadline) <= 14 && getDaysRemaining(deadline) >= 0;
}

/**
 * Check if deadline is overdue
 */
export function isDeadlineOverdue(deadline: Date): boolean {
  return getDaysRemaining(deadline) < 0;
}

/**
 * Format date in German format
 */
export function formatGermanDate(date: Date): string {
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Get all quarters for a year
 */
export function getYearQuarters(year: number): BvlQuarter[] {
  const quarters: BvlQuarter[] = [];
  for (let q = 1; q <= 4; q++) {
    const dates = getQuarterDates(year, q as 1 | 2 | 3 | 4);
    const labels: Record<number, { long: string; short: string }> = {
      1: { long: '1. Quartal', short: 'Q1' },
      2: { long: '2. Quartal', short: 'Q2' },
      3: { long: '3. Quartal', short: 'Q3' },
      4: { long: '4. Quartal', short: 'Q4' },
    };
    quarters.push({
      quarter: q as 1 | 2 | 3 | 4,
      year,
      startDate: dates.start,
      endDate: dates.end,
      reportDeadline: getQuarterDeadline(year, q as 1 | 2 | 3 | 4),
      label: `${labels[q].long} ${year}`,
      labelShort: `${labels[q].short} ${year}`,
    });
  }
  return quarters;
}
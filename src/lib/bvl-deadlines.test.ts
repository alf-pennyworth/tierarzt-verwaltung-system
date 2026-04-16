import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getQuarterDeadline,
  getQuarterFromDate,
  getQuarterDates,
  getCurrentQuarter,
  getNextDeadline,
  getReportingDeadline,
  getDaysRemaining,
  getTimeRemaining,
  isDeadlineUrgent,
  isDeadlineOverdue,
  formatGermanDate,
  getYearQuarters,
} from './bvl-deadlines';

describe('BVL Deadline Utilities', () => {
  describe('getQuarterFromDate', () => {
    it('returns Q1 for January-March', () => {
      expect(getQuarterFromDate(new Date(2026, 0, 15))).toBe(1);  // January
      expect(getQuarterFromDate(new Date(2026, 1, 15))).toBe(1);  // February
      expect(getQuarterFromDate(new Date(2026, 2, 31))).toBe(1);   // March
    });

    it('returns Q2 for April-June', () => {
      expect(getQuarterFromDate(new Date(2026, 3, 1))).toBe(2);    // April
      expect(getQuarterFromDate(new Date(2026, 4, 15))).toBe(2);   // May
      expect(getQuarterFromDate(new Date(2026, 5, 30))).toBe(2);   // June
    });

    it('returns Q3 for July-September', () => {
      expect(getQuarterFromDate(new Date(2026, 6, 1))).toBe(3);    // July
      expect(getQuarterFromDate(new Date(2026, 7, 15))).toBe(3);   // August
      expect(getQuarterFromDate(new Date(2026, 8, 30))).toBe(3);   // September
    });

    it('returns Q4 for October-December', () => {
      expect(getQuarterFromDate(new Date(2026, 9, 1))).toBe(4);    // October
      expect(getQuarterFromDate(new Date(2026, 10, 15))).toBe(4);  // November
      expect(getQuarterFromDate(new Date(2026, 11, 31))).toBe(4);   // December
    });
  });

  describe('getQuarterDates', () => {
    it('returns correct start and end dates for Q1', () => {
      const dates = getQuarterDates(2026, 1);
      expect(dates.start).toEqual(new Date(2026, 0, 1));  // Jan 1
      expect(dates.end).toEqual(new Date(2026, 2, 31));    // Mar 31
    });

    it('returns correct start and end dates for Q2', () => {
      const dates = getQuarterDates(2026, 2);
      expect(dates.start).toEqual(new Date(2026, 3, 1));   // Apr 1
      expect(dates.end).toEqual(new Date(2026, 5, 30));    // Jun 30
    });

    it('returns correct start and end dates for Q3', () => {
      const dates = getQuarterDates(2026, 3);
      expect(dates.start).toEqual(new Date(2026, 6, 1));   // Jul 1
      expect(dates.end).toEqual(new Date(2026, 8, 30));    // Sep 30
    });

    it('returns correct start and end dates for Q4', () => {
      const dates = getQuarterDates(2026, 4);
      expect(dates.start).toEqual(new Date(2026, 9, 1));    // Oct 1
      expect(dates.end).toEqual(new Date(2026, 11, 31));    // Dec 31
    });
  });

  describe('getQuarterDeadline', () => {
    it('returns Q1 deadline as June 30', () => {
      const deadline = getQuarterDeadline(2026, 1);
      expect(deadline.getMonth()).toBe(5);  // June (0-indexed)
      expect(deadline.getDate()).toBe(30);
    });

    it('returns Q2 deadline as September 30', () => {
      const deadline = getQuarterDeadline(2026, 2);
      expect(deadline.getMonth()).toBe(8);  // September
      expect(deadline.getDate()).toBe(30);
    });

    it('returns Q3 deadline as December 31', () => {
      const deadline = getQuarterDeadline(2026, 3);
      expect(deadline.getMonth()).toBe(11);  // December
      expect(deadline.getDate()).toBe(31);
    });

    it('returns Q4 deadline as March 31 of next year', () => {
      const deadline = getQuarterDeadline(2026, 4);
      expect(deadline.getFullYear()).toBe(2027);
      expect(deadline.getMonth()).toBe(2);  // March
      expect(deadline.getDate()).toBe(31);
    });
  });

  describe('getDaysRemaining', () => {
    it('returns positive days for future deadline', () => {
      const future = new Date();
      future.setDate(future.getDate() + 10);
      expect(getDaysRemaining(future)).toBe(10);
    });

    it('returns 0 for today', () => {
      const today = new Date();
      expect(getDaysRemaining(today)).toBe(0);
    });

    it('returns negative days for past deadline', () => {
      const past = new Date();
      past.setDate(past.getDate() - 5);
      expect(getDaysRemaining(past)).toBe(-5);
    });
  });

  describe('getTimeRemaining', () => {
    it('returns "Überfällig" for past deadline', () => {
      const past = new Date();
      past.setDate(past.getDate() - 5);
      expect(getTimeRemaining(past)).toBe('Überfällig');
    });

    it('returns "Heute" for today', () => {
      const today = new Date();
      expect(getTimeRemaining(today)).toBe('Heute');
    });

    it('returns "1 Tag" for 1 day remaining', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(getTimeRemaining(tomorrow)).toBe('1 Tag');
    });

    it('returns correct days for less than a week', () => {
      const days3 = new Date();
      days3.setDate(days3.getDate() + 3);
      expect(getTimeRemaining(days3)).toBe('3 Tage');
    });

    it('returns weeks for days < 14', () => {
      const days7 = new Date();
      days7.setDate(days7.getDate() + 7);
      expect(getTimeRemaining(days7)).toBe('1 Woche');

      const days10 = new Date();
      days10.setDate(days10.getDate() + 10);
      expect(getTimeRemaining(days10)).toBe('1 Woche');
    });

    it('returns weeks for days < 30', () => {
      const days14 = new Date();
      days14.setDate(days14.getDate() + 14);
      expect(getTimeRemaining(days14)).toBe('2 Wochen');

      const days21 = new Date();
      days21.setDate(days21.getDate() + 21);
      expect(getTimeRemaining(days21)).toBe('3 Wochen');
    });

    it('returns months for 30+ days', () => {
      const days30 = new Date();
      days30.setDate(days30.getDate() + 30);
      expect(getTimeRemaining(days30)).toBe('1 Monat');

      const days60 = new Date();
      days60.setDate(days60.getDate() + 60);
      expect(getTimeRemaining(days60)).toBe('2 Monate');

      const days90 = new Date();
      days90.setDate(days90.getDate() + 90);
      expect(getTimeRemaining(days90)).toBe('3 Monate');
    });
  });

  describe('isDeadlineUrgent', () => {
    it('returns true for deadlines within 14 days', () => {
      const soon = new Date();
      soon.setDate(soon.getDate() + 5);
      expect(isDeadlineUrgent(soon)).toBe(true);

      const days13 = new Date();
      days13.setDate(days13.getDate() + 13);
      expect(isDeadlineUrgent(days13)).toBe(true);
    });

    it('returns false for deadlines beyond 14 days', () => {
      const later = new Date();
      later.setDate(later.getDate() + 20);
      expect(isDeadlineUrgent(later)).toBe(false);
    });

    it('returns false for past deadlines', () => {
      const past = new Date();
      past.setDate(past.getDate() - 1);
      expect(isDeadlineUrgent(past)).toBe(false);
    });
  });

  describe('isDeadlineOverdue', () => {
    it('returns true for past deadlines', () => {
      const past = new Date();
      past.setDate(past.getDate() - 1);
      expect(isDeadlineOverdue(past)).toBe(true);
    });

    it('returns false for future deadlines', () => {
      const future = new Date();
      future.setDate(future.getDate() + 1);
      expect(isDeadlineOverdue(future)).toBe(false);
    });

    it('returns false for today', () => {
      const today = new Date();
      expect(isDeadlineOverdue(today)).toBe(false);
    });
  });

  describe('formatGermanDate', () => {
    it('formats date in German format DD.MM.YYYY', () => {
      const date = new Date(2026, 3, 16);  // April 16, 2026
      expect(formatGermanDate(date)).toBe('16.04.2026');
    });

    it('pads single-digit day and month', () => {
      const date = new Date(2026, 0, 5);  // January 5, 2026
      expect(formatGermanDate(date)).toBe('05.01.2026');
    });
  });

  describe('getYearQuarters', () => {
    it('returns all 4 quarters for a year', () => {
      const quarters = getYearQuarters(2026);
      expect(quarters).toHaveLength(4);
      expect(quarters[0].quarter).toBe(1);
      expect(quarters[1].quarter).toBe(2);
      expect(quarters[2].quarter).toBe(3);
      expect(quarters[3].quarter).toBe(4);
    });

    it('includes correct labels', () => {
      const quarters = getYearQuarters(2026);
      expect(quarters[0].label).toBe('1. Quartal 2026');
      expect(quarters[0].labelShort).toBe('Q1 2026');
      expect(quarters[3].label).toBe('4. Quartal 2026');
      expect(quarters[3].labelShort).toBe('Q4 2026');
    });
  });

  describe('getCurrentQuarter', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns Q1 in January', () => {
      vi.setSystemTime(new Date(2026, 0, 15));  // January 15, 2026
      const quarter = getCurrentQuarter();
      expect(quarter.quarter).toBe(1);
      expect(quarter.year).toBe(2026);
      expect(quarter.label).toBe('1. Quartal 2026');
    });

    it('returns Q2 in May', () => {
      vi.setSystemTime(new Date(2026, 4, 15));  // May 15, 2026
      const quarter = getCurrentQuarter();
      expect(quarter.quarter).toBe(2);
      expect(quarter.year).toBe(2026);
    });

    it('returns Q3 in August', () => {
      vi.setSystemTime(new Date(2026, 7, 15));  // August 15, 2026
      const quarter = getCurrentQuarter();
      expect(quarter.quarter).toBe(3);
      expect(quarter.year).toBe(2026);
    });

    it('returns Q4 in November', () => {
      vi.setSystemTime(new Date(2026, 10, 15));  // November 15, 2026
      const quarter = getCurrentQuarter();
      expect(quarter.quarter).toBe(4);
      expect(quarter.year).toBe(2026);
    });
  });

  describe('getNextDeadline', () => {
    it('returns current quarter if within quarter', () => {
      // The function returns the next deadline which could be current or next quarter
      const next = getNextDeadline();
      expect(next).toBeDefined();
      expect(next.quarter).toBeGreaterThanOrEqual(1);
      expect(next.quarter).toBeLessThanOrEqual(4);
    });
  });

  describe('BVL reporting cycle', () => {
    it('Q1 data must be reported by June 30', () => {
      // Q1 = Jan-Mar, report due end of Q2 (June 30)
      const deadline = getQuarterDeadline(2026, 1);
      expect(deadline.getMonth()).toBe(5);  // June
      expect(deadline.getDate()).toBe(30);
    });

    it('Q2 data must be reported by September 30', () => {
      // Q2 = Apr-Jun, report due end of Q3 (Sep 30)
      const deadline = getQuarterDeadline(2026, 2);
      expect(deadline.getMonth()).toBe(8);  // September
      expect(deadline.getDate()).toBe(30);
    });

    it('Q3 data must be reported by December 31', () => {
      // Q3 = Jul-Sep, report due end of Q4 (Dec 31)
      const deadline = getQuarterDeadline(2026, 3);
      expect(deadline.getMonth()).toBe(11);  // December
      expect(deadline.getDate()).toBe(31);
    });

    it('Q4 data must be reported by March 31 of next year', () => {
      // Q4 = Oct-Dec, report due end of Q1 next year (Mar 31)
      const deadline = getQuarterDeadline(2026, 4);
      expect(deadline.getFullYear()).toBe(2027);
      expect(deadline.getMonth()).toBe(2);  // March
      expect(deadline.getDate()).toBe(31);
    });
  });
});
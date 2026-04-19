import { describe, it, expect } from 'vitest';
import { navigateDate } from './navigateDate.js';

describe('navigateDate', () => {
  it('should navigate by day forward', () => {
    expect(navigateDate(1, 'day', '2024-01-15')).toBe('2024-01-16');
  });

  it('should navigate by day backward', () => {
    expect(navigateDate(-1, 'day', '2024-01-15')).toBe('2024-01-14');
  });

  it('should navigate by week forward', () => {
    expect(navigateDate(1, 'week', '2024-01-15')).toBe('2024-01-22');
  });

  it('should navigate by week backward', () => {
    expect(navigateDate(-1, 'week', '2024-01-15')).toBe('2024-01-08');
  });

  it('should navigate by month forward', () => {
    expect(navigateDate(1, 'month', '2024-01-15')).toBe('2024-02-15');
  });

  it('should navigate by month backward', () => {
    expect(navigateDate(-1, 'month', '2024-01-15')).toBe('2023-12-15');
  });
});
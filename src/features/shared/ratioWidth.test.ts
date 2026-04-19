import { describe, it, expect } from 'vitest';
import { ratioWidth } from './ratioWidth.js';

describe('ratioWidth', () => {
  it('should return 50% for value 50 and total 100', () => {
    expect(ratioWidth(50, 100)).toBe('50%');
  });

  it('should return 0% when total is 0', () => {
    expect(ratioWidth(0, 0)).toBe('0%');
  });
});
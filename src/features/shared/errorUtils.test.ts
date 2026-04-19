import { describe, it, expect } from 'vitest';
import { compactText, formatIssueLabel, summarizeErrorMessage, translateStructuredIssue } from './errorUtils.js';

describe('compactText', () => {
  it('should collapse multiple whitespaces to single space', () => {
    expect(compactText('a  b    c')).toBe('a b c');
  });

  it('should trim leading and trailing whitespace', () => {
    expect(compactText('  hello  ')).toBe('hello');
  });

  it('should handle newlines', () => {
    expect(compactText('a\nb')).toBe('a b');
  });
});

describe('formatIssueLabel', () => {
  it('should translate evidence to Japanese', () => {
    expect(formatIssueLabel(['evidence'], 'ja')).toBe('根拠データ');
  });

  it('should translate confidence to English', () => {
    expect(formatIssueLabel(['confidence'], 'en')).toBe('confidence');
  });
});

describe('translateStructuredIssue', () => {
  it('should translate invalid_type object error to Japanese', () => {
    const issue = { code: 'invalid_type', expected: 'string', received: 'object', path: ['evidence'] };
    expect(translateStructuredIssue(issue, 'ja')).toBe('根拠データがテキストではなくオブジェクトで返されました');
  });

  it('should translate invalid_type object error to English', () => {
    const issue = { code: 'invalid_type', expected: 'string', received: 'object', path: ['evidence'] };
    expect(translateStructuredIssue(issue, 'en')).toBe('evidence came back as an object instead of text');
  });

  it('should translate too_big error to Japanese', () => {
    const issue = { code: 'too_big', maximum: 10, path: ['items'] };
    expect(translateStructuredIssue(issue, 'ja')).toBe('itemsが多すぎます（最大10件）');
  });

  it('should translate too_big error to English', () => {
    const issue = { code: 'too_big', maximum: 10, path: ['items'] };
    expect(translateStructuredIssue(issue, 'en')).toBe('items has too many items (max 10)');
  });
});

describe('summarizeErrorMessage', () => {
  it('should parse JSON array and translate first error', () => {
    const message = JSON.stringify([{ code: 'invalid_type', expected: 'string', received: 'object', path: ['evidence'] }]);
    expect(summarizeErrorMessage(message, 'ja')).toBe('根拠データがテキストではなくオブジェクトで返されました');
  });

  it('should include count suffix when multiple errors', () => {
    const message = JSON.stringify([
      { code: 'invalid_type', expected: 'string', received: 'object', path: ['evidence'] },
      { code: 'invalid_type', expected: 'number', path: ['count'] },
    ]);
    expect(summarizeErrorMessage(message, 'en')).toBe('evidence came back as an object instead of text (+1)');
  });

  it('should return plain text for non-JSON message', () => {
    expect(summarizeErrorMessage('Something went wrong', 'en')).toBe('Something went wrong');
  });

  it('should return empty string for empty message', () => {
    expect(summarizeErrorMessage('', 'en')).toBe('');
  });
});

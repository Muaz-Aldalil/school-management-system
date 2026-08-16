import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatPhoneSD,
  validatePhone,
  formatDateSD,
  getArabicNumber,
  getScoreLabel,
  getArabicScore,
} from '../lib/utils';

describe('formatCurrency', () => {
  it('formats SDG with Arabic separators and suffix', () => {
    expect(formatCurrency(1000, 'SDG')).toBe('١٬٠٠٠ ج.س');
    expect(formatCurrency(0, 'SDG')).toBe('٠ ج.س');
  });
  it('uses t() suffix when provided', () => {
    expect(formatCurrency(500, 'SDG', () => 'جنيه')).toBe('٥٠٠ جنيه');
  });
  it('formats USD with 2 decimals', () => {
    expect(formatCurrency(10, 'USD')).toBe('$10.00');
  });
  it('returns empty for null/undefined', () => {
    expect(formatCurrency(null)).toBe('');
    expect(formatCurrency(undefined)).toBe('');
  });
});

describe('formatPhoneSD', () => {
  it('normalizes local numbers to +249 format', () => {
    expect(formatPhoneSD('0123456789')).toBe('+249123456789');
    expect(formatPhoneSD('123456789')).toBe('+249123456789');
  });
  it('passes through already internationalized numbers', () => {
    expect(formatPhoneSD('+249123456789')).toBe('+249123456789');
    expect(formatPhoneSD('249123456789')).toBe('+249123456789');
  });
  it('strips separators', () => {
    expect(formatPhoneSD('012-345-6789')).toBe('+249123456789');
  });
  it('returns empty for falsy input', () => {
    expect(formatPhoneSD('')).toBe('');
    expect(formatPhoneSD(null)).toBe('');
  });
});

describe('validatePhone', () => {
  it('accepts valid Sudanese numbers in multiple formats', () => {
    expect(validatePhone('0123456789')).toBe(true);
    expect(validatePhone('+249123456789')).toBe(true);
    expect(validatePhone('123456789')).toBe(true);
    expect(validatePhone('011 234 5678')).toBe(true);
  });
  it('rejects invalid numbers', () => {
    expect(validatePhone('')).toBe(false);
    expect(validatePhone('123')).toBe(false);
    expect(validatePhone('01234567890')).toBe(false);
    expect(validatePhone('abcd')).toBe(false);
  });
});

describe('formatDateSD', () => {
  it('formats a date in Arabic locale', () => {
    const out = formatDateSD('2026-08-15', 'ar');
    expect(out).toMatch(/أغسطس/);
  });
  it('formats a date in English locale', () => {
    const out = formatDateSD(new Date(2026, 7, 15), 'en');
    expect(out).toMatch(/Aug/);
  });
  it('handles invalid dates without throwing', () => {
    const bad = formatDateSD('not-a-date', 'ar');
    expect(bad === 'Invalid Date' || typeof bad === 'string').toBe(true);
  });
});

describe('getArabicNumber', () => {
  it('converts digits to Arabic-Indic numerals', () => {
    expect(getArabicNumber(2026)).toBe('٢٠٢٦');
    expect(getArabicNumber('42')).toBe('٤٢');
  });
  it('handles 0 and negative numbers', () => {
    expect(getArabicNumber(0)).toBe('٠');
    expect(getArabicNumber(-5)).toBe('-٥');
  });
});

describe('getScoreLabel', () => {
  it('uses Arabic score without translator', () => {
    expect(getScoreLabel(90)).toBe(getArabicScore(90));
  });
  it('uses translator keys when provided', () => {
    const t = (k) => ({ 'grades.excellent': 'ممتاز جدا' }[k] || k);
    expect(getScoreLabel(90, t)).toBe('ممتاز جدا');
  });
  it('returns empty for null', () => {
    expect(getScoreLabel(null)).toBe('');
  });
});

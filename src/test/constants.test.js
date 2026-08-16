import { describe, it, expect } from 'vitest';
import { DEFAULT_SCHOOL_NAME, normalizeSchoolName, normalizeSchoolNameDeep } from '../lib/constants';

describe('normalizeSchoolName', () => {
  it('replaces all legacy school-name variants', () => {
    expect(normalizeSchoolName('مدرسه الاخلاء الخاصه')).toBe(DEFAULT_SCHOOL_NAME);
    expect(normalizeSchoolName('مدرسة الاخلاء الخاصه')).toBe(DEFAULT_SCHOOL_NAME);
    expect(normalizeSchoolName('مدرسه الاخلاء')).toBe(DEFAULT_SCHOOL_NAME);
    expect(normalizeSchoolName('مدرسة الاخلاء')).toBe(DEFAULT_SCHOOL_NAME);
    expect(normalizeSchoolName('الاخلاء')).toBe(DEFAULT_SCHOOL_NAME);
  });
  it('trims surrounding whitespace before matching', () => {
    expect(normalizeSchoolName('  مدرسة الاخلاء  ')).toBe(DEFAULT_SCHOOL_NAME);
  });
  it('leaves the correct name unchanged', () => {
    expect(normalizeSchoolName('مدرسه العامريه')).toBe('مدرسه العامريه');
  });
  it('leaves other strings unchanged', () => {
    expect(normalizeSchoolName('ثانوية النيل')).toBe('ثانوية النيل');
    expect(normalizeSchoolName('')).toBe('');
  });
  it('returns non-string values as-is', () => {
    expect(normalizeSchoolName(null)).toBe(null);
    expect(normalizeSchoolName(42)).toBe(42);
    expect(normalizeSchoolName(undefined)).toBe(undefined);
  });
});

describe('normalizeSchoolNameDeep', () => {
  it('normalizes nested object string values', () => {
    const input = { title: { ar: 'مدرسه الاخلاء', en: 'Al-Amiriya School' }, subtitle: { ar: 'مرحبا', en: 'Hi' } };
    const out = normalizeSchoolNameDeep(input);
    expect(out.title.ar).toBe(DEFAULT_SCHOOL_NAME);
    expect(out.title.en).toBe('Al-Amiriya School');
    expect(out.subtitle.ar).toBe('مرحبا');
  });
  it('normalizes arrays recursively', () => {
    const out = normalizeSchoolNameDeep(['مدرسه الاخلاء', { name: 'الاخلاء' }]);
    expect(out[0]).toBe(DEFAULT_SCHOOL_NAME);
    expect(out[1].name).toBe(DEFAULT_SCHOOL_NAME);
  });
  it('does not mutate the input object', () => {
    const input = { name: 'مدرسه الاخلاء' };
    normalizeSchoolNameDeep(input);
    expect(input.name).toBe('مدرسه الاخلاء');
  });
  it('preserves non-string primitives', () => {
    const out = normalizeSchoolNameDeep({ n: 5, ok: true, nil: null, tags: ['x', 7] });
    expect(out).toEqual({ n: 5, ok: true, nil: null, tags: ['x', 7] });
  });
  it('handles null/undefined/string top-level values', () => {
    expect(normalizeSchoolNameDeep(null)).toBe(null);
    expect(normalizeSchoolNameDeep('مدرسة الاخلاء')).toBe(DEFAULT_SCHOOL_NAME);
    expect(normalizeSchoolNameDeep(undefined)).toBe(undefined);
  });
});

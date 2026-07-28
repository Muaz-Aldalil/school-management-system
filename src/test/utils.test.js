import { describe, it, expect } from 'vitest';
import { getArabicScore, getArabicNumber, getGradeLabel, getGradeStage, SUDANESE_GRADES } from '../lib/utils';
import { localized, getLocalized, setLocalized, isLocalizedField } from '../lib/localized';

describe('getArabicScore', () => {
  it('returns ممتاز for scores >= 85', () => {
    expect(getArabicScore(85)).toBe('ممتاز');
    expect(getArabicScore(100)).toBe('ممتاز');
  });
  it('returns جيد جداً for scores 75-84', () => {
    expect(getArabicScore(75)).toBe('جيد جداً');
    expect(getArabicScore(84)).toBe('جيد جداً');
  });
  it('returns جيد for scores 65-74', () => {
    expect(getArabicScore(65)).toBe('جيد');
    expect(getArabicScore(74)).toBe('جيد');
  });
  it('returns مقبول for scores 50-64', () => {
    expect(getArabicScore(50)).toBe('مقبول');
    expect(getArabicScore(64)).toBe('مقبول');
  });
  it('returns راسب for scores < 50', () => {
    expect(getArabicScore(0)).toBe('راسب');
    expect(getArabicScore(49)).toBe('راسب');
  });
  it('returns empty string for null/undefined', () => {
    expect(getArabicScore(null)).toBe('');
    expect(getArabicScore(undefined)).toBe('');
  });
});

describe('getArabicNumber', () => {
  it('converts digits to Arabic numerals', () => {
    expect(getArabicNumber(123)).toBe('١٢٣');
    expect(getArabicNumber(0)).toBe('٠');
  });
});

describe('getGradeLabel', () => {
  it('returns correct label for known grade', () => {
    expect(getGradeLabel('1')).toBe('الصف الأول');
    expect(getGradeLabel('6')).toBe('الصف السادس');
  });
  it('returns fallback for unknown grade', () => {
    expect(getGradeLabel('99')).toBe('الصف 99');
  });
});

describe('getGradeStage', () => {
  it('returns stage for known grades', () => {
    expect(getGradeStage('1')).toBe('الأساسي');
    expect(getGradeStage('7')).toBe('المتوسط');
  });
  it('returns empty for unknown', () => {
    expect(getGradeStage('99')).toBe('');
  });
});

describe('localized', () => {
  it('returns empty for falsy values', () => {
    expect(localized(null, 'ar')).toBe('');
    expect(localized(undefined, 'en')).toBe('');
  });
  it('returns string as-is', () => {
    expect(localized('hello', 'ar')).toBe('hello');
  });
  it('returns correct language value', () => {
    expect(localized({ ar: 'مرحبا', en: 'Hello' }, 'ar')).toBe('مرحبا');
    expect(localized({ ar: 'مرحبا', en: 'Hello' }, 'en')).toBe('Hello');
  });
  it('falls back to ar then en', () => {
    expect(localized({ en: 'Hello' }, 'fr')).toBe('Hello');
    expect(localized({ ar: 'مرحبا' }, 'fr')).toBe('مرحبا');
  });
});

describe('getLocalized', () => {
  it('returns empty for falsy', () => {
    expect(getLocalized(null, 'ar')).toBe('');
  });
  it('returns string as-is', () => {
    expect(getLocalized('text', 'en')).toBe('text');
  });
  it('returns correct language value', () => {
    expect(getLocalized({ ar: 'عربي', en: 'EN' }, 'en')).toBe('EN');
  });
  it('returns undefined for missing lang key (strict)', () => {
    expect(getLocalized({ ar: 'عربي' }, 'en')).toBe('عربي');
  });
});

describe('setLocalized', () => {
  it('creates new bilingual object from string field', () => {
    const result = setLocalized('old', 'new', 'en');
    expect(result).toEqual({ ar: '', en: 'new' });
  });
  it('updates existing bilingual object', () => {
    const result = setLocalized({ ar: 'عربي', en: 'old' }, 'new', 'en');
    expect(result).toEqual({ ar: 'عربي', en: 'new' });
  });
  it('preserves other language', () => {
    const result = setLocalized({ ar: 'عربي', en: 'EN' }, 'جديد', 'ar');
    expect(result).toEqual({ ar: 'جديد', en: 'EN' });
  });
});

describe('isLocalizedField', () => {
  it('returns true for bilingual objects', () => {
    expect(isLocalizedField({ ar: '', en: '' })).toBe(true);
    expect(isLocalizedField({ ar: 'text' })).toBe(true);
  });
  it('returns false for strings', () => {
    expect(isLocalizedField('hello')).toBe(false);
  });
  it('returns false for arrays', () => {
    expect(isLocalizedField([1, 2])).toBe(false);
  });
  it('returns false for null', () => {
    expect(isLocalizedField(null)).toBe(false);
  });
});

describe('SUDANESE_GRADES', () => {
  it('has 9 grades', () => {
    expect(SUDANESE_GRADES).toHaveLength(9);
  });
  it('each grade has value, label, stage, stageEn', () => {
    SUDANESE_GRADES.forEach(g => {
      expect(g).toHaveProperty('value');
      expect(g).toHaveProperty('label');
      expect(g).toHaveProperty('stage');
      expect(g).toHaveProperty('stageEn');
    });
  });
});

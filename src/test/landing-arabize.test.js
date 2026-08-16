import { describe, it, expect } from 'vitest';
import { arabize } from '../context/LandingContext';

const HERO = {
  title: { ar: 'مدرسه العامريه', en: 'Al-Amiriya School' },
  subtitle: { ar: 'نرعى العقول، نبني المستقبل', en: 'Nurturing minds, building futures' },
  cta_link: '#about',
  stats: [
    { value: 1245, label: { ar: 'الطلاب', en: 'Students' } },
    { value: 85, label: { ar: 'المعلمين', en: 'Teachers' } },
  ],
};

describe('arabize', () => {
  it('keeps Arabic default when stored value is a plain English string', () => {
    const out = arabize(HERO, { title: 'Al-Amiriya School', subtitle: 'Nurturing minds' });
    expect(out.title).toEqual({ ar: 'مدرسه العامريه', en: 'Al-Amiriya School' });
    expect(out.subtitle.ar).toBe('نرعى العقول، نبني المستقبل');
  });

  it('preserves an existing bilingual object', () => {
    const out = arabize(HERO, { title: { ar: 'مدرستي', en: 'My School' } });
    expect(out.title).toEqual({ ar: 'مدرستي', en: 'My School' });
  });

  it('falls back to defaults for missing keys', () => {
    const out = arabize(HERO, {});
    expect(out.title).toEqual(HERO.title);
    expect(out.cta_link).toBe('#about');
  });

  it('wraps plain-string array entries against the default structure', () => {
    const out = arabize(HERO, { stats: [{ value: 100, label: 'Students' }] });
    expect(out.stats[0].label).toEqual({ ar: 'الطلاب', en: 'Students' });
    expect(out.stats[0].value).toBe(100);
  });

  it('returns plain-string defaults unchanged', () => {
    const out = arabize(HERO, { cta_link: '#contact' });
    expect(out.cta_link).toBe('#contact');
  });

  it('returns the default when loaded is null/undefined', () => {
    expect(arabize(HERO, null)).toEqual(HERO);
    expect(arabize(HERO, undefined)).toEqual(HERO);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../context/LandingContext', () => ({
  useLanding: () => ({ hero: mockHero }),
}));
vi.mock('../context/LanguageContext', () => ({
  useLanguage: () => ({ lang: 'ar', t: (k) => ({ 'hero.contactUs': 'اتصل بنا' }[k] || '') }),
}));

let mockHero;

import Hero from '../components/landing/Hero';

describe('Hero', () => {
  beforeEach(() => {
    mockHero = {
      title: { ar: 'مدرسه العامريه', en: 'Al-Amiriya School' },
      subtitle: { ar: 'نرعى العقول، نبني المستقبل', en: 'Nurturing minds, building futures' },
      cta_text: { ar: 'اعرف المزيد', en: 'Learn More' },
      cta_link: '#about',
      video_url: '',
      image_url: '',
      stats: [
        { value: 1245, label: { ar: 'الطلاب', en: 'Students' } },
        { value: 85, label: { ar: 'المعلمين', en: 'Teachers' } },
        { value: 28, label: { ar: 'الجوائز', en: 'Awards' } },
        { value: 52, label: { ar: 'سنوات', en: 'Years' } },
      ],
    };
  });

  it('renders the school title, subtitle, CTA and Contact Us link', () => {
    render(<Hero />);
    expect(screen.getAllByText('مدرسه العامريه').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('نرعى العقول، نبني المستقبل').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('link', { name: 'اعرف المزيد' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('link', { name: 'اتصل بنا' }).length).toBeGreaterThanOrEqual(1);
  });

  it('renders the hero images as background layers', () => {
    const { container } = render(<Hero />);
    for (const src of ['/images/hero-1.jpg', '/images/hero-2.jpg', '/images/hero-3.jpg']) {
      const layer = container.querySelector(`[style*="${src}"]`);
      expect(layer).not.toBeNull();
      expect(layer.style.backgroundImage).toContain(src);
    }
  });

  it('renders the stats row with formatted values', () => {
    render(<Hero />);
    expect(screen.getAllByText('1,245').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('الطلاب').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('85').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('المعلمين').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('28').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('الجوائز').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('52').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('سنوات').length).toBeGreaterThanOrEqual(1);
  });

  it('does not render a CTA or stats when their data is empty', () => {
    mockHero = { ...mockHero, cta_text: { ar: '', en: '' }, stats: [] };
    render(<Hero />);
    expect(screen.queryByRole('link', { name: 'اعرف المزيد' })).toBeNull();
    expect(screen.queryByText('الطلاب')).toBeNull();
    expect(screen.getAllByRole('link', { name: 'اتصل بنا' }).length).toBeGreaterThanOrEqual(1);
  });
});

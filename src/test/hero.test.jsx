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
    expect(screen.getByText('مدرسه العامريه')).toBeInTheDocument();
    expect(screen.getByText('نرعى العقول، نبني المستقبل')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'اعرف المزيد' })).toHaveAttribute('href', '#about');
    expect(screen.getByRole('link', { name: 'اتصل بنا' })).toHaveAttribute('href', '#contact');
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
    expect(screen.getByText('1,245')).toBeInTheDocument();
    expect(screen.getByText('الطلاب')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getByText('المعلمين')).toBeInTheDocument();
    expect(screen.getByText('28')).toBeInTheDocument();
    expect(screen.getByText('الجوائز')).toBeInTheDocument();
    expect(screen.getByText('52')).toBeInTheDocument();
    expect(screen.getByText('سنوات')).toBeInTheDocument();
  });

  it('does not render a CTA or stats when their data is empty', () => {
    mockHero = { ...mockHero, cta_text: { ar: '', en: '' }, stats: [] };
    render(<Hero />);
    expect(screen.queryByRole('link', { name: 'اعرف المزيد' })).toBeNull();
    expect(screen.queryByText('الطلاب')).toBeNull();
    expect(screen.getByRole('link', { name: 'اتصل بنا' })).toBeInTheDocument();
  });
});

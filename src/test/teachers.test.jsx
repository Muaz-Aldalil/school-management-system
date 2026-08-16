import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../context/LandingContext', () => ({
  useLanding: () => ({ teachers: mockTeachers }),
}));
vi.mock('../context/LanguageContext', () => ({
  useLanguage: () => ({ lang: 'ar', t: (k) => ({ 'teachers.title': 'المعلمون', 'teachers.subtitle': 'نخبة المعلمين', 'teachers.loadMore': 'عرض المزيد', 'teachers.showLess': 'عرض أقل' }[k] || '') }),
}));

let mockTeachers;

import Teachers from '../components/landing/Teachers';

describe('Teachers', () => {
  beforeEach(() => {
    mockTeachers = [
      { id: 't1', name: { ar: 'علاء الدين مسعود خلف الله', en: 'Alaa' }, subject: { ar: '', en: '' }, bio: { ar: '', en: '' }, image: '/teachers/a.jpeg' },
      { id: 't2', name: { ar: 'هاجر', en: 'Hagar' }, subject: { ar: '', en: '' }, bio: { ar: '', en: '' }, image: '' },
      { id: 't3', name: { ar: 'إيمان', en: 'Iman' }, subject: { ar: '', en: '' }, bio: { ar: '', en: '' }, image: '/teachers/i.jpeg' },
      { id: 't4', name: { ar: 'حسين', en: 'Hussein' }, subject: { ar: '', en: '' }, bio: { ar: '', en: '' }, image: '' },
      { id: 't5', name: { ar: 'حليمه يوسف', en: 'Halima' }, subject: { ar: 'علوم اتصالات', en: 'Comms' }, bio: { ar: '', en: '' }, image: '/teachers/h.jpeg' },
      { id: 't6', name: { ar: 'كوثر', en: 'Kawthar' }, subject: { ar: '', en: '' }, bio: { ar: '', en: '' }, image: '/teachers/k.jpeg' },
    ];
  });

  it('renders only the first 5 teachers initially', () => {
    render(<Teachers />);
    const cards = screen.getAllByRole('heading', { level: 3 });
    expect(cards).toHaveLength(5);
    expect(screen.getByText('علاء الدين مسعود خلف الله')).toBeInTheDocument();
  });

  it('shows all teachers after clicking load more', () => {
    render(<Teachers />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(6);
  });

  it('renders an image when image is set', () => {
    render(<Teachers />);
    const img = screen.getAllByRole('img')[0];
    expect(img).toHaveAttribute('src', '/teachers/a.jpeg');
    expect(img).toHaveAttribute('loading', 'lazy');
  });

  it('renders initials when image is empty', () => {
    render(<Teachers />);
    expect(screen.getByText('هاجر')).toBeInTheDocument();
  });

  it('renders nothing when there are no teachers', () => {
    mockTeachers = [];
    const { container } = render(<Teachers />);
    expect(container.innerHTML).toBe('');
  });
});

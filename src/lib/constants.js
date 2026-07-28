export const APP_VERSION = '1.0.0';
export const DEFAULT_SCHOOL_NAME = 'مدرسه العامريه';

export const ACADEMIC_TERMS = [
  { value: 'الفصل الأول', en: '1st Term' },
  { value: 'الفصل الثاني', en: '2nd Term' },
  { value: 'الفصل الثالث', en: '3rd Term' },
];

const TERM_KEYS = ['first', 'second', 'third'];

export function getLocalizedTerms(t) {
  if (!t) return ACADEMIC_TERMS;
  return ACADEMIC_TERMS.map((term, i) => ({
    ...term,
    label: t(`terms.${TERM_KEYS[i]}`),
  }));
}

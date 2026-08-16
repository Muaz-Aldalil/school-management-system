export const APP_VERSION = '1.0.0';
export const DEFAULT_SCHOOL_NAME = 'مدرسه العامريه';

const OLD_SCHOOL_NAMES = [
  'مدرسه الاخلاء الخاصه',
  'مدرسة الاخلاء الخاصه',
  'مدرسه الاخلاء',
  'مدرسة الاخلاء',
  'الاخلاء',
];

export function normalizeSchoolName(value) {
  if (typeof value !== 'string') return value;
  return OLD_SCHOOL_NAMES.includes(value.trim()) ? DEFAULT_SCHOOL_NAME : value;
}

export function normalizeSchoolNameDeep(value) {
  if (typeof value !== 'object' || value === null) return normalizeSchoolName(value);
  if (Array.isArray(value)) return value.map(normalizeSchoolNameDeep);
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normalizeSchoolNameDeep(v)]));
}

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

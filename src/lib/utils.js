export const SUDANESE_GRADES = [
  { value: '1', label: 'الصف الأول', stage: 'الأساسي', stageEn: 'Primary' },
  { value: '2', label: 'الصف الثاني', stage: 'الأساسي', stageEn: 'Primary' },
  { value: '3', label: 'الصف الثالث', stage: 'الأساسي', stageEn: 'Primary' },
  { value: '4', label: 'الصف الرابع', stage: 'الأساسي', stageEn: 'Primary' },
  { value: '5', label: 'الصف الخامس', stage: 'الأساسي', stageEn: 'Primary' },
  { value: '6', label: 'الصف السادس', stage: 'الأساسي', stageEn: 'Primary' },
  { value: '7', label: 'الصف السابع', stage: 'المتوسط', stageEn: 'Intermediate' },
  { value: '8', label: 'الصف الثامن', stage: 'المتوسط', stageEn: 'Intermediate' },
  { value: '9', label: 'الصف التاسع', stage: 'المتوسط', stageEn: 'Intermediate' },
];

export function getGradeLabel(value) {
  return SUDANESE_GRADES.find(g => g.value === value)?.label || `الصف ${value}`;
}

export function getGradeStage(value) {
  return SUDANESE_GRADES.find(g => g.value === value)?.stage || '';
}

export function getArabicScore(score) {
  if (score == null) return '';
  if (score >= 85) return 'ممتاز';
  if (score >= 75) return 'جيد جداً';
  if (score >= 65) return 'جيد';
  if (score >= 50) return 'مقبول';
  return 'راسب';
}

export function getScoreLabel(score, t) {
  if (score == null) return '';
  if (!t) return getArabicScore(score);
  if (score >= 85) return t('grades.excellent');
  if (score >= 75) return t('grades.veryGood');
  if (score >= 65) return t('grades.good');
  if (score >= 50) return t('grades.pass');
  return t('grades.fail');
}

export function getArabicNumber(num) {
  const arabicNums = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).replace(/\d/g, d => arabicNums[d]);
}

export function formatDateSD(date, lang = 'ar') {
  const d = date instanceof Date ? date : new Date(date);
  if (lang === 'ar') {
    return d.toLocaleDateString('ar-SD', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatTime(date, lang = 'ar') {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleTimeString(lang === 'ar' ? 'ar-SD' : undefined, { hour: '2-digit', minute: '2-digit' });
}

export function formatCurrency(amount, currency = 'SDG', t) {
  if (amount == null) return '';
  if (currency === 'SDG') {
    const formatted = Number(amount).toLocaleString('ar-SD');
    const suffix = t ? t('common.currencySDG') : 'ج.س';
    return `${formatted} ${suffix}`;
  }
  return `$${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

export const PHONE_REGEX = /^(?:\+?249|0)?[1-9]\d{8}$/;

export function validatePhone(phone) {
  return PHONE_REGEX.test(phone?.replace(/[\s\-()]/g, ''));
}

export function formatPhoneSD(phone) {
  if (!phone) return '';
  const cleaned = phone.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+249')) return cleaned;
  if (cleaned.startsWith('249')) return `+${cleaned}`;
  if (cleaned.startsWith('0')) return `+249${cleaned.slice(1)}`;
  return `+249${cleaned}`;
}

export function formatDate(date, lang) {
  return formatDateSD(date, lang);
}

export const SUDANESE_CURRICULUM = {
  'default': ['الرياضيات', 'اللغة العربية', 'اللغة الإنجليزية', 'العلوم', 'التربية الإسلامية', 'التاريخ', 'الجغرافيا', 'التربية الوطنية', 'التربية الرياضية', 'التربية الفنية'],
};

const SUBJECT_KEYS = ['math', 'arabic', 'english', 'science', 'islamicStudies', 'history', 'geography', 'civics', 'pe', 'art'];

export function getSubjectsForGrade(grade) {
  return SUDANESE_CURRICULUM['default'];
}

export function getLocalizedSubjects(t) {
  if (!t) return SUDANESE_CURRICULUM['default'];
  return SUBJECT_KEYS.map(k => t(`subjects.${k}`));
}

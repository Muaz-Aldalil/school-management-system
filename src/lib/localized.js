export function localized(field, lang) {
  if (!field) return '';
  if (typeof field === 'string') return field;
  if (typeof field === 'object' && field[lang]) return field[lang];
  return field.ar || field.en || '';
}

export function getLocalized(field, lang) {
  if (!field) return '';
  if (typeof field === 'string') return field;
  if (typeof field === 'object' && field[lang] !== undefined) return field[lang];
  return field.ar || field.en || '';
}

export function setLocalized(field, value, lang) {
  const current = (typeof field === 'object' && field !== null && !Array.isArray(field)) ? field : { ar: '', en: '' };
  return { ...current, [lang]: value };
}

export function isLocalizedField(field) {
  return typeof field === 'object' && field !== null && !Array.isArray(field) && ('ar' in field || 'en' in field);
}

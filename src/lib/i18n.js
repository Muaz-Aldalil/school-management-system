import { en, ar } from '../i18n/translations';

const langs = { en, ar };

function getLang() {
  return 'ar';
}

export function t(key) {
  const dict = langs[getLang()] || langs.en;
  return key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : key), dict);
}

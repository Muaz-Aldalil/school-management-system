const lang = localStorage.getItem('lang') || 'ar';
document.documentElement.lang = lang;
document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
document.documentElement.setAttribute('data-theme', localStorage.getItem('theme') || 'light');

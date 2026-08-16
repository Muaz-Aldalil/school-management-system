localStorage.removeItem('lang');
document.documentElement.lang = 'ar';
document.documentElement.dir = 'rtl';
document.documentElement.setAttribute('data-theme', localStorage.getItem('theme') || 'light');

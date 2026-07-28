import { useState } from 'react';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import { useLanding } from '../../context/LandingContext';
import { useLanguage } from '../../context/LanguageContext';
import { localized } from '../../lib/localized';

export default function Contact() {
  const { contact } = useLanding();
  const { t, lang } = useLanguage();
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  };

  return (
    <section id="contact" className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display text-on-background mb-3">{t('contact.title')}</h2>
          <p className="text-lg text-secondary max-w-2xl mx-auto">{t('contact.subtitle')}</p>
        </div>
        <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
          <div className="space-y-6">
            <ContactInfo icon={Phone} title={t('contact.phone')} content={contact.phone} />
            <ContactInfo icon={Mail} title={t('contact.email')} content={contact.email} />
            <ContactInfo icon={MapPin} title={t('contact.address')} content={localized(contact.address, lang)} />
          </div>
          <form onSubmit={handleSubmit} className="bg-gradient-to-br from-primary/10 via-tertiary/10 to-primary-fixed-dim/10 border border-outline-variant rounded-xl p-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <input className="w-full h-11 rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors" placeholder={t('contact.namePlaceholder')} required />
              <input className="w-full h-11 rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors" type="email" placeholder={t('contact.emailPlaceholder')} required />
            </div>
            <input className="w-full h-11 rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors" placeholder={t('contact.subjectPlaceholder')} required />
            <textarea className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors" rows="4" placeholder={t('contact.messagePlaceholder')} required />
            <button type="submit" className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors shadow-sm disabled:opacity-50" disabled={sent}>
              {sent ? t('contact.sent') : <>{t('contact.send')} <Send className="w-4 h-4" /></>}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

function ContactInfo({ icon: Icon, title, content }) {
  return (
    <div className="flex items-start gap-4 bg-gradient-to-br from-primary/10 via-tertiary/10 to-primary-fixed-dim/10 border border-outline-variant rounded-xl p-5">
      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="font-bold text-on-background">{title}</p>
        <p className="text-sm text-secondary">{content}</p>
      </div>
    </div>
  );
}

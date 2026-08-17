import { School, Mail, MapPin, MessageCircle } from 'lucide-react';
import { useLanding } from '../../context/LandingContext';
import { useLanguage } from '../../context/LanguageContext';
import { localized } from '../../lib/localized';

export default function Footer() {
  const { t, lang } = useLanguage();
  const { contact, hero } = useLanding();
  return (
    <footer className="bg-surface-container-low border-t border-outline-variant text-on-surface py-12">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
                <School className="w-4 h-4 text-on-primary" />
              </div>
              <span className="font-bold text-lg">{localized(hero.title, lang)}</span>
            </div>
            <p className="text-sm text-secondary">{t('footer.tagline')}</p>
          </div>
          <div>
            <h4 className="font-semibold mb-3">{t('footer.quickLinks')}</h4>
            <ul className="space-y-2 text-sm text-secondary">
              <li><a href="#hero" className="hover:text-primary transition-colors">{t('footer.home')}</a></li>
              <li><a href="#about" className="hover:text-primary transition-colors">{t('footer.about')}</a></li>
              <li><a href="#events" className="hover:text-primary transition-colors">{t('footer.events')}</a></li>
              <li><a href="#contact" className="hover:text-primary transition-colors">{t('footer.contactLink')}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">{t('footer.programs')}</h4>
            <ul className="space-y-2 text-sm text-secondary">
              <li>{t('footer.programScience')}</li>
              <li>{t('footer.programArts')}</li>
              <li>{t('footer.programSports')}</li>
              <li>{t('footer.programCommunity')}</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">{t('footer.contact')}</h4>
            <ul className="space-y-2 text-sm text-secondary">
              <li>
                <a href="https://wa.me/249912345678" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary transition-colors">
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>مشرف المنصه, أ. علاء الدين — {contact.phone}</span>
                </a>
              </li>
              <li className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> {contact.email}</li>
              <li className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> {localized(contact.address, lang)}</li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-outline text-center text-sm text-secondary">
          &copy; {new Date().getFullYear()} {localized(hero.title, lang)}. {t('footer.rights')}<br />{t('footer.builtBy')} <span className="text-primary font-semibold">Muaz Aldalil</span><br /><span className="text-xs">muazaldalil@gmail.com</span>
        </div>
      </div>
    </footer>
  );
}

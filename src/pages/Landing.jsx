import Navbar from '../components/landing/Navbar';
import Hero from '../components/landing/Hero';
import About from '../components/landing/About';
import HonorBoard from '../components/landing/HonorBoard';
import Events from '../components/landing/Events';
import Achievements from '../components/landing/Achievements';
import Teachers from '../components/landing/Teachers';
import Contact from '../components/landing/Contact';
import Registration from '../components/landing/Registration';
import Footer from '../components/landing/Footer';
import Reveal from '../components/Reveal';
import SEO from '../components/SEO';
import { useLanding } from '../context/LandingContext';
import { useLanguage } from '../context/LanguageContext';
import { localized } from '../lib/localized';
import { DEFAULT_SCHOOL_NAME } from '../lib/constants';

export default function Landing() {
  const { hero, about, contact } = useLanding();
  const { t, lang } = useLanguage();

  const schoolJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'School',
    name: localized(hero.title, lang),
    alternateName: DEFAULT_SCHOOL_NAME,
    url: 'https://al-amiriya-school.netlify.app',
    logo: 'https://al-amiriya-school.netlify.app/favicon.svg',
    image: 'https://al-amiriya-school.netlify.app/og-image.png',
    telephone: contact.phone,
    email: contact.email,
    address: { '@type': 'PostalAddress', streetAddress: localized(contact.address, lang) },
    description: localized(about.content, lang),
    sameAs: [],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: t('footer.programs'),
      itemListElement: [
        { '@type': 'Offer', itemOffered: { '@type': 'Course', name: t('footer.programScience') } },
        { '@type': 'Offer', itemOffered: { '@type': 'Course', name: t('footer.programArts') } },
        { '@type': 'Offer', itemOffered: { '@type': 'Course', name: t('footer.programSports') } },
      ],
    },
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        description={localized(about.content, lang)?.slice(0, 160)}
        canonical="/"
        jsonLd={schoolJsonLd}
        hreflang={[
          { lang: 'ar', href: '/' },
        ]}
      />
      <Navbar />
      <Reveal><Hero /></Reveal>
      <Reveal><About /></Reveal>
      <Reveal><HonorBoard /></Reveal>
      <Reveal><Events /></Reveal>
      <Reveal><Achievements /></Reveal>
      <Reveal><Teachers /></Reveal>
      <Reveal><Contact /></Reveal>
      <Reveal><Registration /></Reveal>
      <Footer />
    </div>
  );
}

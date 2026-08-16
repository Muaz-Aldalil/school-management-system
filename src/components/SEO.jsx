import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'مدرسه العامريه';
const DOMAIN = 'https://al-amiriya-school.netlify.app';
const DEFAULT_OG_IMAGE = `${DOMAIN}/og-image.png`;

export default function SEO({
  title,
  description,
  canonical,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
  noindex = false,
  jsonLd,
  hreflang,
}) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {canonical && <link rel="canonical" href={`${DOMAIN}${canonical}`} />}

      <meta property="og:title" content={fullTitle} />
      <meta property="og:type" content={ogType} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:image" content={ogImage} />
      {canonical && <meta property="og:url" content={`${DOMAIN}${canonical}`} />}
      <meta property="og:site_name" content={SITE_NAME} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={ogImage} />

      {hreflang?.map(({ lang, href }) => (
        <link key={lang} rel="alternate" hrefLang={lang} href={`${DOMAIN}${href}`} />
      ))}

      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
}

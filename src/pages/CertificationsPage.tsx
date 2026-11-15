import { PentestLabSection } from '../components/sections/PentestLabSection';
import { CertificationsSection } from '../components/sections/CertificationsSection';
import { Seo, breadcrumbLd, SITE } from '../features/seo/Seo';
import { certifications } from '../data/pentest';

// Each certification as a Course with an online instance and a USD price, so it can show for searches anywhere.
const courseLd = certifications.map((c) => ({
  '@context': 'https://schema.org',
  '@type': 'Course',
  name: `${c.code}: ${c.title}`,
  description: `${c.tagline} ${c.includes.join('. ')}.`,
  url: `${SITE}/certifications`,
  image: `${SITE}${c.badge}`,
  educationalCredentialAwarded: `${c.code} (${c.title})`,
  provider: { '@type': 'Organization', name: 'CyberHx', url: SITE },
  inLanguage: 'en',
  offers: { '@type': 'Offer', category: 'Paid', price: c.usd, priceCurrency: 'USD', availability: 'https://schema.org/InStock', url: c.href },
  hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'Online', courseWorkload: 'P14D', location: { '@type': 'VirtualLocation', url: c.href } },
}));

/** /certifications: CAPT and CPPT. The courses and exams run on the Pentest Lab (pentestlab.cyberhx.com). */
export const CertificationsPage = () => (
  <>
    <Seo
      title="CAPT & CPPT Pentest Certifications — CyberHx Pentest Lab"
      description="Earn the CAPT ($149) or CPPT ($199) penetration-testing certification on the CyberHx Pentest Lab: hands-on machines, MITRE ATT&CK mapped practice and a credential anyone can verify."
      path="/certifications"
      keywords="penetration testing certification, practical pentest certification, CAPT, CPPT, hands-on pentest exam, OSCP alternative"
      jsonLd={[...courseLd, breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'Certifications', path: '/certifications' }])]}
    />
    <h1 className="sr-only">CAPT and CPPT hands-on penetration testing certifications by CyberHx</h1>
    <div className="pt-16 sm:pt-20" />
    <PentestLabSection />
    <CertificationsSection />
  </>
);

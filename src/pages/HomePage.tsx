import { HeroSection } from '../components/sections/HeroSection';
import { TrustedBySection } from '../components/sections/TrustedBySection';
import { WhatWeDoSection } from '../components/sections/WhatWeDoSection';
import { PentestLabSection } from '../components/sections/PentestLabSection';
import { CertificationsSection } from '../components/sections/CertificationsSection';
import { PlatformsSection } from '../components/sections/PlatformsSection';
import { CallToActionSection } from '../components/sections/CallToActionSection';
import { Seo } from '../features/seo/Seo';

export const HomePage = () => (
  <>
    <Seo
      title="CyberHx — Global Cybersecurity Community | CTF, Pentest Lab, Scam Alerts"
      description="CyberHx runs capture-the-flag events for the global security community, builds custom CTFs for universities and companies worldwide from $49, and trains you on the Pentest Lab with the CAPT ($149) and CPPT ($199) certifications."
      path="/"
    />
    <HeroSection />
    <TrustedBySection compact />
    <WhatWeDoSection />
    <PentestLabSection />
    <CertificationsSection />
    <PlatformsSection />
    <CallToActionSection />
  </>
);

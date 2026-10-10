import { HeroSection } from '../components/sections/HeroSection';
import { WhatWeDoSection } from '../components/sections/WhatWeDoSection';
import { PentestLabSection } from '../components/sections/PentestLabSection';
import { PlatformsSection } from '../components/sections/PlatformsSection';
import { CallToActionSection } from '../components/sections/CallToActionSection';
import { Seo } from '../features/seo/Seo';

export const HomePage = () => (
  <>
    <Seo
      title="CyberHx — India's Cybersecurity Community | CTF, Pentest Lab, Scam Alerts"
      description="CyberHx runs capture-the-flag events for India's security crowd, builds custom CTFs for colleges and companies from $49, and trains you on the Pentest Lab with the CPPT certification."
      path="/"
    />
    <HeroSection />
    <WhatWeDoSection />
    <PentestLabSection />
    <PlatformsSection />
    <CallToActionSection />
  </>
);

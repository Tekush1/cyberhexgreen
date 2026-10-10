import { HeroSection } from '../components/sections/HeroSection';
import { HostingSection } from '../components/sections/HostingSection';
import { PentestSection } from '../components/sections/PentestSection';
import { PlatformsSection } from '../components/sections/PlatformsSection';
import { CollaborationsSection } from '../components/sections/CollaborationsSection';
import { CallToActionSection } from '../components/sections/CallToActionSection';

export const HomePage = () => (
  <>
    <HeroSection />
    <HostingSection />
    <PentestSection />
    <PlatformsSection />
    <CollaborationsSection />
    <CallToActionSection />
  </>
);

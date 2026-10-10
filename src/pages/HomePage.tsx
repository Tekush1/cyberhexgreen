import React from 'react';
import { HeroSection } from '../components/sections/HeroSection';
import { FeaturesSection } from '../components/sections/FeaturesSection';
import { CollaborationsSection } from '../components/sections/CollaborationsSection';
import { CallToActionSection } from '../components/sections/CallToActionSection';

export const HomePage = () => {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <CollaborationsSection />
      <CallToActionSection />
    </>
  );
};
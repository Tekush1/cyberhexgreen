import React from 'react';
import { HeroSection } from '../components/sections/HeroSection';
import { FeaturesSection } from '../components/sections/FeaturesSection';
import { CollaborationsSection } from '../components/sections/CollaborationsSection';
import { CallToActionSection } from '../components/sections/CallToActionSection';
import { Mentors } from '../components/Mentors';

export const HomePage = () => {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <CollaborationsSection />
      <Mentors />
      <CallToActionSection />
    </>
  );
};
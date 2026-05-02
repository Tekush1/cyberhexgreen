import React from 'react';
import { HeroSection } from '../components/sections/HeroSection';
import { FeaturesSection } from '../components/sections/FeaturesSection';
import { CallToActionSection } from '../components/sections/CallToActionSection';
import { Mentors } from '../components/Mentors';
import { HallOfFame } from '../components/HallOfFame';

export const HomePage = () => {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <Mentors />
      <HallOfFame />
      <CallToActionSection />
    </>
  );
};

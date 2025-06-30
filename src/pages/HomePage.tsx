import React from 'react';
import { HeroSection } from '../components/sections/HeroSection';
import { ImpactSection } from '../components/sections/ImpactSection';
import { FeaturesSection } from '../components/sections/FeaturesSection';
import { TimelineSection } from '../components/sections/TimelineSection';
import { CallToActionSection } from '../components/sections/CallToActionSection';
import { TechStack } from '../components/TechStack';

import { Mentors } from '../components/Mentors';
import { HallOfFame } from '../components/HallOfFame';


export const HomePage = () => {
  return (
    <>
      <HeroSection />
      <ImpactSection />
      <TechStack />
      <FeaturesSection />
      <TimelineSection />
      
      <Mentors />
      <HallOfFame />
      
      <CallToActionSection />
    </>
  );
};
import React from 'react';
import { About } from '../components/About';
import { HallOfFame } from '../components/HallOfFame';
import { Seo } from '../features/seo/Seo';

export const AboutPage = () => {
  return (
    <>
      <Seo
        title="About CyberHx — India's Cybersecurity Community"
        description="Who we are: the team behind Null Origin and ZeroDay Heist. CyberHx runs CTFs, a pentest lab and security research for India's security community, from Bhopal."
        path="/about"
      />
      <About />
      <HallOfFame />
    </>
  );
};
import { PentestLabSection } from '../components/sections/PentestLabSection';
import { CertificationsSection } from '../components/sections/CertificationsSection';
import { Seo } from '../features/seo/Seo';

/** /certifications: CAPT and CPPT. The courses and exams run on the Pentest Lab (pentestlab.cyberhx.com). */
export const CertificationsPage = () => (
  <>
    <Seo
      title="CAPT & CPPT Pentest Certifications — CyberHx Pentest Lab"
      description="Earn the CAPT ($149) or CPPT ($199) penetration-testing certification on the CyberHx Pentest Lab: hands-on machines, MITRE ATT&CK mapped practice and a credential anyone can verify."
      path="/certifications"
    />
    <h1 className="sr-only">CAPT and CPPT hands-on penetration testing certifications by CyberHx</h1>
    <div className="pt-16 sm:pt-20" />
    <PentestLabSection />
    <CertificationsSection />
  </>
);

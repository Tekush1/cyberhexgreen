import { Gallery } from '../components/Gallery';
import { Seo } from '../features/seo/Seo';

export const GalleryPage = () => (
  <>
    <Seo
      title="CTF Events by CyberHx — Null Origin, ZeroDay Heist & more"
      description="Every capture-the-flag event CyberHx has run, with leaderboards, certificates and photos. 7,400+ hackers across 90+ countries."
      path="/gallery"
    />
    <Gallery />
  </>
);

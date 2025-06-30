import React, { Suspense, lazy, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { Footer } from './components/Footer';
import { LoadingSpinner } from './components/shared/LoadingSpinner';
import { HiringPopup } from './components/HiringPopup';
import { HiringBanner } from './components/HiringBanner';
import { FloatingHiringButton } from './components/FloatingHiringButton';

// Lazy load pages
const HomePage = lazy(() => import('./pages/HomePage').then(module => ({ default: module.HomePage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then(module => ({ default: module.AboutPage })));
const TimelinePage = lazy(() => import('./pages/TimelinePage').then(module => ({ default: module.TimelinePage })));
const ThemesPage = lazy(() => import('./pages/ThemesPage').then(module => ({ default: module.default })));
const PrizesPage = lazy(() => import('./pages/PrizesPage').then(module => ({ default: module.PrizesPage })));
const GalleryPage = lazy(() => import('./pages/GalleryPage').then(module => ({ default: module.GalleryPage })));
const ContactPage = lazy(() => import('./pages/ContactPage').then(module => ({ default: module.ContactPage })));
const BecomeMentorPage = lazy(() => import('./pages/BecomeMentorPage').then(module => ({ default: module.BecomeMentorPage })));
const BookSessionPage = lazy(() => import('./pages/BookSessionPage').then(module => ({ default: module.BookSessionPage })));
const RegistrationPage = lazy(() => import('./pages/RegistrationPage').then(module => ({ default: module.default })));
const BlogPage = lazy(() => import('./pages/BlogPage').then(module => ({ default: module.default })));

// Theme Pages
const AIThemePage = lazy(() => import('./pages/themes/AIThemePage').then(module => ({ default: module.AIThemePage })));
const BlockchainThemePage = lazy(() => import('./pages/themes/BlockchainThemePage').then(module => ({ default: module.BlockchainThemePage })));
const CybersecurityThemePage = lazy(() => import('./pages/themes/CybersecurityThemePage').then(module => ({ default: module.CybersecurityThemePage })));
const EdTechThemePage = lazy(() => import('./pages/themes/EdTechThemePage').then(module => ({ default: module.default })));
const SustainabilityThemePage = lazy(() => import('./pages/themes/SustainabilityThemePage').then(module => ({ default: module.SustainabilityThemePage })));
const IoTThemePage = lazy(() => import('./pages/themes/IoTThemePage').then(module => ({ default: module.IoTThemePage })));
const OpenInnovationThemePage = lazy(() => import('./pages/themes/OpenInnovationThemePage').then(module => ({ default: module.OpenInnovationThemePage })));
const HealthcarePage = lazy(() => import('./pages/themes/HealthcarePage').then(module => ({ default: module.default })));
const BookStorePage = lazy(() => import('./pages/themes/BookStorePage').then(module => ({ default: module.BookStorePage })));
const GroceryPage = lazy(() => import('./pages/themes/GroceryPage').then(module => ({ default: module.GroceryPage })));
const MagicTalkPage = lazy(() => import('./pages/themes/MagicTalkPage').then(module => ({ default: module.MagicTalkPage })));
const InternshipPage = lazy(() => import('./pages/themes/InternshipPage').then(module => ({ default: module.InternshipPage })));
const SafeRidePage = lazy(() => import('./pages/themes/SafeRidePage').then(module => ({ default: module.SafeRidePage })));

function App() {
  const [isHiringPopupOpen, setIsHiringPopupOpen] = useState(false);

  const openHiringPopup = () => setIsHiringPopupOpen(true);
  const closeHiringPopup = () => setIsHiringPopupOpen(false);

  return (
    <Router>
      <div className="min-h-screen bg-dark-300 flex flex-col">
        <Navigation />
        <main className="flex-grow">
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/timeline" element={<TimelinePage />} />
              <Route path="/themes" element={<ThemesPage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/prizes" element={<PrizesPage />} />
              <Route path="/gallery" element={<GalleryPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/become-mentor" element={<BecomeMentorPage />} />
              <Route path="/book-session" element={<BookSessionPage />} />
              <Route path="/register" element={<RegistrationPage />} />
              
              {/* Theme Routes */}
              <Route path="/themes/ai" element={<AIThemePage />} />
              <Route path="/themes/blockchain" element={<BlockchainThemePage />} />
              <Route path="/themes/cybersecurity" element={<CybersecurityThemePage />} />
              <Route path="/themes/edtech" element={<EdTechThemePage />} />
              <Route path="/themes/sustainability" element={<SustainabilityThemePage />} />
              <Route path="/themes/iot" element={<IoTThemePage />} />
              <Route path="/themes/open-innovation" element={<OpenInnovationThemePage />} />
              <Route path="/themes/safe-ride" element={<SafeRidePage />} />
              <Route path="/themes/book-store" element={<BookStorePage />} />
              <Route path="/themes/grocery" element={<GroceryPage />} />
              <Route path="/themes/magic-talk" element={<MagicTalkPage />} />
              <Route path="/themes/internship" element={<InternshipPage />} />
              <Route path="/themes/healthcarepage" element={<HealthcarePage />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
        
        {/* Hiring Components */}
        <HiringBanner onOpenPopup={openHiringPopup} />
        <FloatingHiringButton onClick={openHiringPopup} />
        <HiringPopup isOpen={isHiringPopupOpen} onClose={closeHiringPopup} />
      </div>
    </Router>
  );
}

export default App;
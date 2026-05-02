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
const PrizesPage = lazy(() => import('./pages/PrizesPage').then(module => ({ default: module.PrizesPage })));
const GalleryPage = lazy(() => import('./pages/GalleryPage').then(module => ({ default: module.GalleryPage })));
const ContactPage = lazy(() => import('./pages/ContactPage').then(module => ({ default: module.ContactPage })));
const BecomeMentorPage = lazy(() => import('./pages/BecomeMentorPage').then(module => ({ default: module.BecomeMentorPage })));
const BookSessionPage = lazy(() => import('./pages/BookSessionPage').then(module => ({ default: module.BookSessionPage })));
const RegistrationPage = lazy(() => import('./pages/RegistrationPage').then(module => ({ default: module.default })));
const BlogPage = lazy(() => import('./pages/BlogPage').then(module => ({ default: module.default })));
const AdminPage = lazy(() => import('./pages/AdminPage').then(module => ({ default: module.default })));

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
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/prizes" element={<PrizesPage />} />
              <Route path="/gallery" element={<GalleryPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/become-mentor" element={<BecomeMentorPage />} />
              <Route path="/book-session" element={<BookSessionPage />} />
              <Route path="/register" element={<RegistrationPage />} />
              <Route path="/admin" element={<AdminPage />} />
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
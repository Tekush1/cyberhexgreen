import { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { Footer } from './components/Footer';
import { LoadingSpinner } from './components/shared/LoadingSpinner';
import { HiringPopup } from './components/HiringPopup';
import { HiringBanner } from './components/HiringBanner';
import HostYourCTF from "./pages/HostYourCTF";

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
const BlogPostPage = lazy(() => import('./pages/BlogPostPage').then(module => ({ default: module.default })));
const AdminPage = lazy(() => import('./pages/AdminPage').then(module => ({ default: module.default })));
const EventsPage = lazy(() => import('./pages/EventsPage').then(module => ({ default: module.default })));
const ResponsibleDisclosurePage = lazy(() => import('./pages/ResponsibleDisclosurePage'));
const HallOfFamePage = lazy(() => import('./pages/HallOfFamePage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const TermsOfServicePage = lazy(() => import('./pages/TermsOfServicePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const CollaborationsPage = lazy(() => import('./pages/CollaborationsPage'));
const BookInterviewPage = lazy(() => import('./pages/BookInterviewPage'));

// Scroll to top on page change, or to #section when the link carries a hash.
function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    let tries = 0;
    const id = hash.slice(1);
    const timer = window.setInterval(() => {
      const el = document.getElementById(id);
      if (el || ++tries > 30) {
        window.clearInterval(timer);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [pathname, hash]);
  return null;
}

function App() {
  const [isHiringPopupOpen, setIsHiringPopupOpen] = useState(false);

  const openHiringPopup = () => setIsHiringPopupOpen(true);
  const closeHiringPopup = () => setIsHiringPopupOpen(false);

  return (
    <Router>
      <ScrollManager />
      <div className="min-h-screen bg-dark-300 flex flex-col">
        <Navigation />
        <main className="flex-grow">
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
              {/* Blog list page */}
              <Route path="/blog" element={<BlogPage />} />
              {/* Individual blog post — THIS was missing! */}
              <Route path="/blog/:slug" element={<BlogPostPage />} />
              <Route path="/prizes" element={<PrizesPage />} />
              <Route path="/collaborations" element={<CollaborationsPage />} />
              <Route path="/gallery" element={<GalleryPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/become-mentor" element={<BecomeMentorPage />} />
              <Route path="/book-session" element={<BookSessionPage />} />
              <Route path="/register" element={<RegistrationPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/book-interview" element={<BookInterviewPage />} />
              <Route path="/meet/:code" element={<BookInterviewPage />} />
              {/* Security pages */}
              <Route path="/responsible-disclosure" element={<ResponsibleDisclosurePage />} />
              <Route path="/hall-of-fame" element={<HallOfFamePage />} />
              {/* Legal pages */}
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/terms" element={<TermsOfServicePage />} />
              {/* 404 */}
              <Route path="/host-your-ctf" element={<HostYourCTF />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
        
        {/* Hiring Components */}
        <HiringBanner />
        <HiringPopup isOpen={isHiringPopupOpen} onClose={closeHiringPopup} />
      </div>
    </Router>
  );
}

export default App;
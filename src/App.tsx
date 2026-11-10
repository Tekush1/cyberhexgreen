import { Suspense, lazy, useEffect, useState } from 'react';
import { BLOG_SECTIONS } from '../shared/blogSections';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { Footer } from './components/Footer';
import { LoadingSpinner } from './components/shared/LoadingSpinner';
import { HiringBanner } from './components/HiringBanner';
import { retryImport } from './lib/chunkReload';

// Lazy load pages
const HomePage = lazy(retryImport(() => import('./pages/HomePage').then(module => ({ default: module.HomePage }))));
const AboutPage = lazy(retryImport(() => import('./pages/AboutPage').then(module => ({ default: module.AboutPage }))));
const PrizesPage = lazy(retryImport(() => import('./pages/PrizesPage').then(module => ({ default: module.PrizesPage }))));
const EventsPage = lazy(retryImport(() => import('./pages/EventsPage')));
const CompaniesPage = lazy(retryImport(() => import('./pages/CompaniesPage')));
const ReviewsPage = lazy(retryImport(() => import('./pages/ReviewsPage')));
const AmbassadorsPage = lazy(retryImport(() => import('./pages/AmbassadorsPage')));
const UniversitiesPage = lazy(retryImport(() => import('./pages/UniversitiesPage')));
const PricingPage = lazy(retryImport(() => import('./pages/PricingPage')));
const AcademyPage = lazy(retryImport(() => import('./pages/AcademyPage')));
const ContactPage = lazy(retryImport(() => import('./pages/ContactPage').then(module => ({ default: module.ContactPage }))));
const BecomeMentorPage = lazy(retryImport(() => import('./pages/BecomeMentorPage').then(module => ({ default: module.BecomeMentorPage }))));
const BookSessionPage = lazy(retryImport(() => import('./pages/BookSessionPage').then(module => ({ default: module.BookSessionPage }))));
const RegistrationPage = lazy(retryImport(() => import('./pages/RegistrationPage').then(module => ({ default: module.default }))));
const BlogPage = lazy(retryImport(() => import('./features/blog/BlogListPage')));
const BlogPostPage = lazy(retryImport(() => import('./features/blog/BlogPostPage')));
const BlogEditorPage = lazy(retryImport(() => import('./features/blog/EditorPage')));
const BlogAuthorPage = lazy(retryImport(() => import('./features/blog/AuthorPage')));
const BlogFeedbackPage = lazy(retryImport(() => import('./features/blog/FeedbackPage')));
const BlogWritersPage = lazy(retryImport(() => import('./features/blog/WritersPage')));
const AdminPage = lazy(retryImport(() => import('./pages/AdminPage').then(module => ({ default: module.default }))));
const EventDetailPage = lazy(retryImport(() => import('./pages/EventDetailPage').then(module => ({ default: module.default }))));
const CertificationsPage = lazy(retryImport(() => import('./pages/CertificationsPage').then(module => ({ default: module.CertificationsPage }))));
const ResponsibleDisclosurePage = lazy(retryImport(() => import('./pages/ResponsibleDisclosurePage')));
const HallOfFamePage = lazy(retryImport(() => import('./pages/HallOfFamePage')));
const PrivacyPolicyPage = lazy(retryImport(() => import('./pages/PrivacyPolicyPage')));
const TermsOfServicePage = lazy(retryImport(() => import('./pages/TermsOfServicePage')));
const NotFoundPage = lazy(retryImport(() => import('./pages/NotFoundPage')));
const CollaborationsPage = lazy(retryImport(() => import('./pages/CollaborationsPage')));
const BookInterviewPage = lazy(retryImport(() => import('./pages/BookInterviewPage')));
const UnsubscribePage = lazy(retryImport(() => import('./pages/UnsubscribePage')));
const HostYourCTF = lazy(retryImport(() => import('./pages/HostYourCTF')));
const HiringPopup = lazy(retryImport(() => import('./components/HiringPopup').then(m => ({ default: m.HiringPopup }))));

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

/** Everything inside the router. The browser wraps it in BrowserRouter (App below);
    the build-time prerender (src/entry-server.tsx) wraps it in StaticRouter. */
export function AppShell() {
  const [isHiringPopupOpen, setIsHiringPopupOpen] = useState(false);

  const closeHiringPopup = () => setIsHiringPopupOpen(false);

  return (
    <>
      <ScrollManager />
      <div className="min-h-screen bg-dark-300 flex flex-col">
        <Navigation />
        <main className="flex-grow">
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
              {/* Blog */}
              <Route path="/blog" element={<BlogPage />} />
              {/* Sections are pages of their own (shared/blogSections.ts); they must come before /blog/:slug. */}
              {BLOG_SECTIONS.map((s) => (
                <Route key={s.slug} path={`/blog/${s.slug}`} element={<BlogPage section={s.slug} />} />
              ))}
              <Route path="/blog/writers" element={<BlogWritersPage />} />
              <Route path="/blog/write" element={<BlogEditorPage />} />
              <Route path="/blog/edit/:id" element={<BlogEditorPage />} />
              <Route path="/blog/author/:slug" element={<BlogAuthorPage />} />
              <Route path="/blog/feedback" element={<BlogFeedbackPage />} />
              <Route path="/blog/:slug" element={<BlogPostPage />} />
              <Route path="/prizes" element={<PrizesPage />} />
              <Route path="/collaborations" element={<CollaborationsPage />} />
              <Route path="/gallery" element={<EventsPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/companies" element={<CompaniesPage />} />
              <Route path="/reviews" element={<ReviewsPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/academy" element={<AcademyPage />} />
              <Route path="/universities" element={<UniversitiesPage />} />
              <Route path="/colleges" element={<UniversitiesPage />} />
              <Route path="/university" element={<UniversitiesPage />} />
              <Route path="/ambassadors" element={<AmbassadorsPage />} />
              <Route path="/ambassador" element={<AmbassadorsPage />} />
              <Route path="/campus-ambassador" element={<AmbassadorsPage />} />
              <Route path="/become-mentor" element={<BecomeMentorPage />} />
              <Route path="/book-session" element={<BookSessionPage />} />
              <Route path="/register" element={<RegistrationPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/events/:slug" element={<EventDetailPage />} />
              <Route path="/certifications" element={<CertificationsPage />} />
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
              <Route path="/unsubscribe" element={<UnsubscribePage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
        
        {/* Hiring Components */}
        <HiringBanner />
        {isHiringPopupOpen && (
          <Suspense fallback={null}>
            <HiringPopup isOpen={isHiringPopupOpen} onClose={closeHiringPopup} />
          </Suspense>
        )}
      </div>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppShell />
    </Router>
  );
}

export default App;
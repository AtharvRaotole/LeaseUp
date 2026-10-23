import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
<<<<<<< HEAD
import { NotFoundPage } from './pages/NotFoundPage';
import { ReportPage } from './pages/ReportPage';
import { BrandPage } from './pages/BrandPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { PitchPage } from './pages/PitchPage';
import { ProspectingPage } from './pages/ProspectingPage';
=======
import { MapRouteStyles } from './components/layout/MapRouteStyles';
import { RouteFallback } from './components/layout/RouteFallback';
import { SkipToContent } from './components/layout/SkipToContent';

const ReportPage = lazy(() => import('./pages/ReportPage').then((m) => ({ default: m.ReportPage })));
const BrandPage = lazy(() => import('./pages/BrandPage').then((m) => ({ default: m.BrandPage })));
const PortfolioPage = lazy(() =>
  import('./pages/PortfolioPage').then((m) => ({ default: m.PortfolioPage }))
);
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))
);
>>>>>>> eda79a0 (Production readiness: Lighthouse CI, a11y, SEO, and perf shell)

export default function App() {
  return (
    <BrowserRouter>
<<<<<<< HEAD
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/brand" element={<BrandPage />} />
        <Route path="/brand/:id" element={<BrandPage />} />
        <Route path="/portfolio" element={<PortfolioPage />} />
        <Route path="/portfolio/:id" element={<PortfolioPage />} />
        <Route path="/r/:slug" element={<ReportPage />} />
        <Route path="/pitch/:id" element={<PitchPage />} />
        <Route path="/prospect/:id" element={<ProspectingPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
=======
      <SkipToContent />
      <MapRouteStyles />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/brand" element={<BrandPage />} />
          <Route path="/brand/:id" element={<BrandPage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/portfolio/:id" element={<PortfolioPage />} />
          <Route path="/r/:slug" element={<ReportPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
>>>>>>> eda79a0 (Production readiness: Lighthouse CI, a11y, SEO, and perf shell)
    </BrowserRouter>
  );
}

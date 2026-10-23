import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { MapRouteStyles } from './components/layout/MapRouteStyles';
import { RouteFallback } from './components/layout/RouteFallback';
import { SkipToContent } from './components/layout/SkipToContent';

const ReportPage = lazy(() => import('./pages/ReportPage').then((m) => ({ default: m.ReportPage })));
const BrandPage = lazy(() => import('./pages/BrandPage').then((m) => ({ default: m.BrandPage })));
const PortfolioPage = lazy(() =>
  import('./pages/PortfolioPage').then((m) => ({ default: m.PortfolioPage }))
);
const PitchPage = lazy(() => import('./pages/PitchPage').then((m) => ({ default: m.PitchPage })));
const ProspectingPage = lazy(() =>
  import('./pages/ProspectingPage').then((m) => ({ default: m.ProspectingPage }))
);
const PipelinePage = lazy(() =>
  import('./pages/PipelinePage').then((m) => ({ default: m.PipelinePage }))
);
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))
);
const MethodologyPage = lazy(() =>
  import('./pages/MethodologyPage').then((m) => ({ default: m.MethodologyPage }))
);

export default function App() {
  return (
    <BrowserRouter>
      <SkipToContent />
      <MapRouteStyles />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/methodology" element={<MethodologyPage />} />
          <Route path="/brand" element={<BrandPage />} />
          <Route path="/brand/:id" element={<BrandPage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/portfolio/:id" element={<PortfolioPage />} />
          <Route path="/r/:slug" element={<ReportPage />} />
          <Route path="/pitch/:id" element={<PitchPage />} />
          <Route path="/p/:id" element={<PitchPage />} />
          <Route path="/prospect/:id" element={<ProspectingPage />} />
          <Route path="/pipeline" element={<PipelinePage />} />
          <Route path="/pipeline/view/:shareId" element={<PipelinePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

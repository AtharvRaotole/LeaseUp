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
const OwnerUpdatePage = lazy(() =>
  import('./pages/OwnerUpdatePage').then((m) => ({ default: m.OwnerUpdatePage }))
);
const WatchlistPage = lazy(() =>
  import('./pages/WatchlistPage').then((m) => ({ default: m.WatchlistPage }))
);
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))
);
const MethodologyPage = lazy(() =>
  import('./pages/MethodologyPage').then((m) => ({ default: m.MethodologyPage }))
);
const HowLeaseUpUsesQlooPage = lazy(() =>
  import('./pages/HowLeaseUpUsesQlooPage').then((m) => ({ default: m.HowLeaseUpUsesQlooPage }))
);
const LandingHeroPreviewCapturePage = lazy(() =>
  import('./pages/LandingHeroPreviewCapturePage').then((m) => ({
    default: m.LandingHeroPreviewCapturePage,
  }))
);
const WatchlistDiffPreviewPage = lazy(() =>
  import('./pages/WatchlistDiffPreviewPage').then((m) => ({
    default: m.WatchlistDiffPreviewPage,
  }))
);
const WickerWhyCardCapturePage = lazy(() =>
  import('./pages/WickerWhyCardCapturePage').then((m) => ({
    default: m.WickerWhyCardCapturePage,
  }))
);

export default function App() {
  return (
    <BrowserRouter>
      <SkipToContent />
      <MapRouteStyles />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/__preview/landing-hero" element={<LandingHeroPreviewCapturePage />} />
          <Route path="/__preview/watchlist-diff" element={<WatchlistDiffPreviewPage />} />
          <Route path="/__preview/wicker-why-card" element={<WickerWhyCardCapturePage />} />
          <Route path="/methodology" element={<MethodologyPage />} />
          <Route path="/methodology/qloo" element={<HowLeaseUpUsesQlooPage />} />
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
          <Route path="/watchlist" element={<WatchlistPage />} />
          <Route path="/watchlist/:watchId" element={<WatchlistPage />} />
          <Route path="/owner-update/:id" element={<OwnerUpdatePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

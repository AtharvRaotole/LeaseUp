import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ReportPage } from './pages/ReportPage';
import { BrandPage } from './pages/BrandPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { PitchPage } from './pages/PitchPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/brand" element={<BrandPage />} />
        <Route path="/brand/:id" element={<BrandPage />} />
        <Route path="/portfolio" element={<PortfolioPage />} />
        <Route path="/portfolio/:id" element={<PortfolioPage />} />
        <Route path="/r/:slug" element={<ReportPage />} />
        <Route path="/pitch/:id" element={<PitchPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

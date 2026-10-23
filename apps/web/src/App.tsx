import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { ReportPage } from './pages/ReportPage';
import { BrandPage } from './pages/BrandPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/brand" element={<BrandPage />} />
        <Route path="/brand/:id" element={<BrandPage />} />
        <Route path="/r/:slug" element={<ReportPage />} />
      </Routes>
    </BrowserRouter>
  );
}

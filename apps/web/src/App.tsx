import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { ReportPage } from './pages/ReportPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/r/:slug" element={<ReportPage />} />
      </Routes>
    </BrowserRouter>
  );
}

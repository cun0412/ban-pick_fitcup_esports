import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Home from './pages/Home';

const LQControl = lazy(() => import('./pages/lq/LQControl'));
const LQOverlay = lazy(() => import('./pages/lq/LQOverlay'));
const LQLivestreamOverlay = lazy(() => import('./pages/lq/LQLivestreamOverlay'));
const LQAdmin = lazy(() => import('./pages/lq/LQAdmin'));
const ValorantControl = lazy(() => import('./pages/valorant/ValorantControl'));
const ValorantOverlay = lazy(() => import('./pages/valorant/ValorantOverlay'));
const Matches = lazy(() => import('./pages/Matches'));
const FootballReportPage = lazy(() => import('./pages/football/FootballReportPage'));

const Loading = () => (
  <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-3 text-gray-300">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
    <span className="text-sm font-display tracking-widest">ĐANG TẢI...</span>
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/lq/control" element={<LQControl />} />
          <Route path="/lq/overlay" element={<LQOverlay />} />
          <Route path="/lq/overlay/stream" element={<LQLivestreamOverlay />} />
          <Route path="/lq/admin" element={<LQAdmin />} />
          <Route path="/valorant/control" element={<ValorantControl />} />
          <Route path="/valorant/overlay" element={<ValorantOverlay />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/football" element={<FootballReportPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

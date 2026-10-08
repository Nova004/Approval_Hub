import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import MatrixListPage from './pages/MatrixListPage';
import SimulatorPage from './pages/SimulatorPage';

export default function App() {
  return (
    <BrowserRouter basename="/approval_hub">
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar />
        <main style={{ flex: 1, minWidth: 0, overflowX: 'hidden' }}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/matrix" element={<MatrixListPage />} />
            <Route path="/simulator" element={<SimulatorPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

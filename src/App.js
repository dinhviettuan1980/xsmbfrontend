import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { HeaderSlotProvider, useHeaderSlot } from './HeaderSlotContext';
import Home from './Home';
import StatisticPage from './StatisticPage';
import FullStatisticPage from './FullStatisticPage';
import LongestAbsentPage from './LongestAbsentPage';
import CombinationAdvancedPage from './CombinationAdvancedPage';
import ClassifyPage from './ClassifyPage';
import SpecialsPage from './SpecialsPage';
import CombinationGeneratorPage from './CombinationGeneratorPage';
import CauLoPage from './CauLoPage';
import ServerInfo from './ServerInfo';
import Logs from './Logs';
import LogsByDevicePage from './LogsByDevicePage';
import ChatPage from './ChatPage';
import './index.css';

function HeaderSlot() {
  const { slot } = useHeaderSlot();
  return slot ? <div className="ml-auto">{slot}</div> : null;
}

const PAGE_TITLES = {
  '/': 'Kết quả hôm nay',
  '/statistic': 'Thống kê lô theo số',
  '/full-statistic': 'Thống kê tổng quát',
  '/longest-absent': 'Số lâu vắng mặt',
  '/combination-advanced': 'Tổ hợp đề 5 số',
  '/classify': 'Phân loại 2 chữ số',
  '/generate-combinations': 'Sinh tổ hợp nhóm',
  '/specials': 'Giải đặc biệt',
  '/cau-lo': 'Cầu Lô',
  '/chat': 'Chat',
  '/server-info': 'Server Info',
  '/logs': 'Logs',
  '/logsbydevice': 'Logs by Device',
};

const NAV_ITEMS = [
  { label: '📅 Tra cứu theo ngày', path: '/' },
  { label: '📊 Thống kê lô theo số', path: '/statistic' },
  { label: '🔢 Thống kê lô tổng quát', path: '/full-statistic' },
  { label: '🕵️ Số lâu chưa xuất hiện', path: '/longest-absent' },
  { label: '🧪 Tổ hợp đề 5 số', path: '/combination-advanced' },
  { label: '🎯 Sinh tổ hợp nhóm', path: '/generate-combinations' },
  { label: '🔎 Phân loại số 2 chữ số', path: '/classify' },
  { label: '🏆 Giải đặc biệt 2 tháng', path: '/specials' },
  { label: '🃏 Cầu Lô', path: '/cau-lo' },
  { label: '💬 Chat', path: '/chat' },
  { label: '🖥️ Server Info', path: '/server-info' },
  { label: '📋 Logs', path: '/logs' },
  { label: '📱 Logs by Device', path: '/logsbydevice' },
];

function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const pageTitle = PAGE_TITLES[location.pathname] || 'XSMB';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-red-700 text-white shadow-lg">
        <div className="marquee-wrapper" style={{ background: 'rgba(0,0,0,0.15)' }}>
          <div className="marquee-track">
            {[...Array(20)].map((_, i) => (
              <img key={i} src="/co1.jpg" alt="" />
            ))}
          </div>
        </div>
        <div className="flex items-center px-3 h-12 gap-2">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-lg hover:bg-red-600 active:bg-red-800 transition-colors flex-shrink-0"
            aria-label="Mở menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <span className="font-extrabold text-base tracking-wide flex-shrink-0">XSMB</span>
          <span className="text-red-200 text-xs truncate hidden sm:block">· {pageTitle}</span>
          <HeaderSlot />
        </div>
      </header>

      {/* Sidebar overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-72 bg-gray-900 z-50 transform transition-transform duration-300 flex flex-col shadow-2xl
        ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-5 py-4 bg-red-700 flex-shrink-0">
          <div>
            <div className="font-extrabold text-white text-xl tracking-wider">XSMB</div>
            <div className="text-red-200 text-xs mt-0.5">Xổ số Miền Bắc</div>
          </div>
          <button
            onClick={() => setMenuOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-600 text-white transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {NAV_ITEMS.map(({ label, path }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center px-5 py-3 text-sm font-medium transition-colors border-l-[3px] ${
                  active
                    ? 'bg-red-900/40 text-white border-red-400'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white border-transparent'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="px-3 py-4">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/statistic" element={<StatisticPage />} />
          <Route path="/full-statistic" element={<FullStatisticPage />} />
          <Route path="/longest-absent" element={<LongestAbsentPage />} />
          <Route path="/combination-advanced" element={<CombinationAdvancedPage />} />
          <Route path="/classify" element={<ClassifyPage />} />
          <Route path="/generate-combinations" element={<CombinationGeneratorPage />} />
          <Route path="/specials" element={<SpecialsPage />} />
          <Route path="/cau-lo" element={<CauLoPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/server-info" element={<ServerInfo />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/logsbydevice" element={<LogsByDevicePage />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <HeaderSlotProvider>
        <AppLayout />
      </HeaderSlotProvider>
    </Router>
  );
}

export default App;

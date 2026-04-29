// src/App.js
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
  '/': 'Kết quả XSMB',
  '/statistic': 'Thống kê lô theo số',
  '/full-statistic': 'Thống kê lô tổng quát',
  '/longest-absent': 'Số lâu chưa xuất hiện',
  '/combination-advanced': 'Tổ hợp đề 5 số',
  '/classify': 'Phân loại số 2 chữ số',
  '/generate-combinations': 'Sinh tổ hợp nhóm',
  '/specials': 'Giải đặc biệt 2 tháng',
  '/cau-lo': 'Cầu Lô',
  '/chat': 'Chat',
  '/server-info': 'Server Info',
  '/logs': 'Logs',
  '/logsbydevice': 'Logs by Device',
};

function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const pageTitle = PAGE_TITLES[location.pathname] || 'XSMB';

  return (
    <div className="app-container text-base">
      <div className="marquee-wrapper">
        <div className="marquee-track">
          {[...Array(20)].map((_, i) => (
            <img key={i} src="/co1.jpg" alt="" />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3 px-2 pb-1">
        <button className="menu-toggle text-6xl" onClick={() => setMenuOpen(!menuOpen)}>
          ☰
        </button>
        <h1 className="text-lg font-bold">{pageTitle}</h1>
        <HeaderSlot />
      </div>

      {menuOpen && (
        <div className="menu-overlay" onClick={() => setMenuOpen(false)} />
      )}
      <div className={`sidebar ${menuOpen ? 'open1' : 'close1'}`}>
        <ul>
          <li><Link to="/" onClick={() => setMenuOpen(false)}>📅 Tra cứu theo ngày</Link></li>
          <li><Link to="/statistic" onClick={() => setMenuOpen(false)}>📊 Thống kê lô theo số</Link></li>
          <li><Link to="/full-statistic" onClick={() => setMenuOpen(false)}>🔢 Thống kê lô tổng quát</Link></li>
          <li><Link to="/longest-absent" onClick={() => setMenuOpen(false)}>🕵️ Số lâu chưa xuất hiện</Link></li>
          <li><Link to="/combination-advanced" onClick={() => setMenuOpen(false)}>🧪 Tổ hợp đề 5 số</Link></li>
          <li><Link to="/classify" onClick={() => setMenuOpen(false)}>🔎 Phân loại số 2 chữ số</Link></li>
          <li><Link to="/generate-combinations" onClick={() => setMenuOpen(false)}>🎯 Sinh tổ hợp nhóm</Link></li>
          <li><Link to="/specials" onClick={() => setMenuOpen(false)}>🎯 Giải đặc biệt 2 tháng</Link></li>
          <li><Link to="/cau-lo" onClick={() => setMenuOpen(false)}>🎯 Cầu Lô</Link></li>
          <li><Link to="/chat" onClick={() => setMenuOpen(false)}>🎯 Chat</Link></li>
          <li><Link to="/server-info" onClick={() => setMenuOpen(false)}>🎯 Server Info</Link></li>
          <li><Link to="/logs" onClick={() => setMenuOpen(false)}>🎯 Logs</Link></li>
          <li><Link to="/logsbydevice" onClick={() => setMenuOpen(false)}>🎯 Logs by Device</Link></li>
        </ul>
      </div>

      <div className="main-content">
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
      </div>
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

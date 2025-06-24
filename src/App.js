// src/App.js
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './Home';
import StatisticPage from './StatisticPage';
import FullStatisticPage from './FullStatisticPage';
import LongestAbsentPage from './LongestAbsentPage';
import CombinationAdvancedPage from './CombinationAdvancedPage';
import ClassifyPage from './ClassifyPage';
import SpecialsPage from './SpecialsPage';
import CombinationGeneratorPage from './CombinationGeneratorPage';
import CauLoPage from './CauLoPage';
import CauDePage from './CauDePage';
import GoogleLogin from './GoogleLogin';
import LogoutPage from './LogoutPage';
import './index.css';

function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Router>
      <div className="app-container text-base">
        <button
          className="menu-toggle text-1xl"  // Tăng kích thước icon hamburger
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>

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
            <li><Link to="/cau-de" onClick={() => setMenuOpen(false)}>🎯 Cầu Đề</Link></li>
            <li><Link to="/login" onClick={() => setMenuOpen(false)}>🎯 Login Google</Link></li>
            <li><Link to="/logout" onClick={() => setMenuOpen(false)}>🎯 Logout</Link></li>
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
            <Route path="/cau-de" element={<CauDePage />} />
            <Route path="/login" element={<GoogleLogin />} />
            <Route path="/logout" element={<LogoutPage />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
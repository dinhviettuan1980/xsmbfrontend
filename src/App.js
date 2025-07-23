// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import apiClient from './utils/apiClient';
import { isTokenExpired } from './utils/tokenUtil';
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
import ServerInfo from './ServerInfo';
import Logs from './Logs';
import './index.css';

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState('');

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const token = localStorage.getItem('google_id_token');
        if (token) {
          const res = await apiClient.get('/api/me');
          setUsername(res.data.name || res.data.email); // tuỳ backend trả về
          setAvatar(res.data.picture);
        }
      } catch (err) {
        console.error('Lỗi lấy user info:', err);
      }
    };

    fetchUserInfo();
  }, []);

  return (
    <Router>
      <div className="app-container text-base">
        <button
          className="menu-toggle text-6xl"  // Tăng kích thước icon hamburger
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰ 
        </button>
        <div className="inline-flex items-center gap-2">
          <img src={avatar} alt="avatar" className="w-8 h-8 rounded-full" />
          <span>{username}</span>
        </div>

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
            <li><Link to="/server-info" onClick={() => setMenuOpen(false)}>🎯 Server Info</Link></li>
            <li><Link to="/logs" onClick={() => setMenuOpen(false)}>🎯 Logs</Link></li>
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
            <Route path="/server-info" element={<ServerInfo />} />
            <Route path="/logs" element={<Logs />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
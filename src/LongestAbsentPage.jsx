import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import apiClient from './utils/apiClient';

function LongestAbsentPage() {
  const [days, setDays] = useState(30);
  const [result, setResult] = useState([]);

  // 👇 Tự động fetch khi load trang
  useEffect(() => {
    fetchData();
  }, [days]); // Có thể chỉ dùng [] nếu không muốn tự load khi days thay đổi

  const fetchData = async () => {
    try {
      const baseUrl = process.env.REACT_APP_API_BASE;
      const res = await apiClient.get(`${baseUrl}/api/statistics/longest-absent`, {
        params: { days }
      });
      setResult(res.data);
    } catch (error) {
      console.error('Error fetching longest absent numbers:', error);
      alert('Không thể lấy dữ liệu.');
    }
  };

  return (
    <div>
      <Helmet>
        <title>Số lâu chưa xuất hiện - XSMB</title>
        <meta name="description" content="Tra cứu những con số lâu chưa xuất hiện trong xổ số miền Bắc theo số ngày tuỳ chọn." />
      </Helmet>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button onClick={fetchData} className="bg-blue-500 text-white px-3 py-1 rounded">Lấy danh sách</button>
        <input
          type="number"
          value={days}
          onChange={e => setDays(e.target.value)}
          style={{ width: 30 }}
        />
        ngày
      </div>

      {result.length > 0 && (
        <table border="1" cellPadding="6" cellSpacing="0" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Số</th>
              <th>Ngày xuất hiện gần nhất</th>
              <th>Số ngày vắng mặt</th>
            </tr>
          </thead>
          <tbody>
            {result.map(({ number, last_seen, days_absent }) => (
              <tr key={number}>
                <td>{number}</td>
                <td>{last_seen ? new Date(last_seen).toLocaleDateString('vi-VN') : 'Chưa xuất hiện'}</td>
                <td>{days_absent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default LongestAbsentPage;

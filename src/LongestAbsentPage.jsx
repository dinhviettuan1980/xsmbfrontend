import React, { useState, useEffect } from 'react';
import axios from 'axios';

function LongestAbsentPage() {
  const [days, setDays] = useState(30);
  const [result, setResult] = useState([]);

  // 👇 Tự động fetch khi load trang
  useEffect(() => {
    fetchData();
  }, [days]); // Có thể chỉ dùng [] nếu không muốn tự load khi days thay đổi

  const fetchData = async () => {
    try {
      const res = await axios.get('http://13.55.124.215:8001/api/statistics/longest-absent', {
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
      <h2 className="text-lg font-bold mb-4">Những số lâu chưa xuất hiện trong {days} ngày</h2>
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

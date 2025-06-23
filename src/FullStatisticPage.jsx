import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function FullStatisticPage() {
  const [days, setDays] = useState(30);
  const [result, setResult] = useState(null);
  const [sortType, setSortType] = useState('frequency');
  const [showAll, setShowAll] = useState(false);

  // 👇 Gọi API khi vào trang
  useEffect(() => {
    fetchFullStats();
  }, [days]); // Có thể thêm [days] để tự động refresh khi người dùng sửa số ngày

  const fetchFullStats = async () => {
    try {
      const baseUrl = process.env.REACT_APP_API_BASE;
      const response = await axios.get(`${baseUrl}/api/statistics/frequency-full`, {
        params: { days }
      });
      setResult(response.data);
    } catch (error) {
      console.error('Error fetching full stats:', error);
      alert('Không thể lấy dữ liệu thống kê.');
    }
  };

  const getColor = (value, max) => {
    const intensity = Math.floor((value / max) * 255);
    return `rgb(255, ${255 - intensity}, ${255 - intensity})`;
  };

  const entries = result
    ? Object.entries(result).map(([num, count]) => ({ num, count }))
    : [];

  const sortedEntries = [...entries].sort((a, b) => {
    return sortType === 'number'
      ? parseInt(a.num) - parseInt(b.num)
      : b.count - a.count;
  });

  const maxValue = sortedEntries.length > 0 ? sortedEntries[0].count : 1;
  const total = sortedEntries.length;
  const hotThreshold = Math.floor(total * 0.1);
  const coldThreshold = Math.floor(total * 0.9);

  const markHotCold = (index) => {
    if (index < hotThreshold) return " 🔥";
    if (index >= coldThreshold) return " ❄️";
    return "";
  };

  const filteredEntries = showAll
    ? sortedEntries
    : sortedEntries.filter((_, idx) => idx < hotThreshold || idx >= coldThreshold);

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">Thống kê lô trong {days} ngày</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
        <select value={sortType} onChange={e => setSortType(e.target.value)}>
          <option value="frequency">Sắp theo tần suất giảm</option>
          <option value="number">Sắp theo số tăng</option>
        </select>
        <input
          type="number"
          placeholder="Số ngày"
          value={days}
          onChange={e => setDays(e.target.value)}
          style={{ width: 30 }}
        />
        ngày
        <button onClick={fetchFullStats} className="bg-blue-500 text-white px-3 py-1 rounded">Thống kê</button>
        <label>
          <input
            type="checkbox"
            checked={showAll}
            onChange={() => setShowAll(!showAll)}
          /> Hiện tất cả 00–99
        </label>
      </div>

      {result && (
        <>
          <table border="1" cellPadding="6" cellSpacing="0" style={{ width: '100%', marginBottom: 30 }}>
            <thead>
              <tr>
                <th>Số</th>
                <th>Số lần xuất hiện</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map(({ num, count }, idx) => (
                <tr key={num}>
                  <td>{num + markHotCold(idx)}</td>
                  <td style={{ backgroundColor: getColor(count, maxValue) }}>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>📈 Biểu đồ tần suất</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={filteredEntries}>
              <XAxis dataKey="num" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#ff4d4f" />
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
}

export default FullStatisticPage;

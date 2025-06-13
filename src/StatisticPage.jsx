import React, { useState } from 'react';
import axios from 'axios';

function StatisticPage() {
  const [numbers, setNumbers] = useState('');
  const [days, setDays] = useState(30);
  const [result, setResult] = useState(null);
  const [expandedNumbers, setExpandedNumbers] = useState([]);
  const [missingStreaks, setMissingStreaks] = useState({});

  const expandInputNumbers = (raw) => {
    const rawList = raw.split(',').map(s => s.trim()).filter(Boolean);
    const resultSet = new Set();

    rawList.forEach(n => {
      if (n.length === 2) {
        resultSet.add(n);
      } else if (n.length === 3) {
        resultSet.add(n.slice(0, 2));
        resultSet.add(n.slice(1));
      }
    });

    return Array.from(resultSet);
  };

  const computeMissingStreaks = (data, nums) => {
    const streaks = {};
    nums.forEach(num => {
      let streak = 0;
      for (const date of Object.keys(data)) {
        const val = data[date][num] ?? 0;
        if (val === 0) {
          streak += 1;
        } else {
          break; // dừng khi gặp số xuất hiện
        }
      }
      streaks[num] = streak;
    });
    return streaks;
  };

  const fetchStats = async () => {
    if (!numbers || !days) return;
    try {
      const response = await axios.get(`https://api.tuandv.asia/api/statistics/frequency`, {
        params: {
          days,
          numbers
        }
      });

      const expanded = expandInputNumbers(numbers);
      setExpandedNumbers(expanded);

      // Sắp xếp theo ngày giảm dần (mới nhất trước)
      const sortedResult = Object.fromEntries(
        Object.entries(response.data).sort((a, b) => new Date(b[0]) - new Date(a[0]))
      );

      setResult(sortedResult);
      const streaks = computeMissingStreaks(sortedResult, expanded);
      setMissingStreaks(streaks);
    } catch (error) {
      console.error('Error fetching stats:', error);
      alert('Không thể lấy dữ liệu');
    }
  };

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">Thống kê lô theo số</h2>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Nhập các số, ví dụ: 121,565,17"
          value={numbers}
          onChange={e => setNumbers(e.target.value)}
          style={{ flex: 1 }}
        />
        <input
          type="number"
          placeholder="Số ngày"
          value={days}
          onChange={e => setDays(e.target.value)}
          style={{ width: 60 }}
        />
        <button onClick={fetchStats} className="bg-blue-500 text-white px-3 py-1 rounded">Tìm kiếm</button>
      </div>

      {result && (
        <table border="1" cellPadding="6" cellSpacing="0">
          <thead>
            <tr>
              <th>Ngày</th>
              {expandedNumbers.map(num => (
                <th key={num} style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', top: -5, right: -3, color: 'red', fontSize: '0.7em' }}>
                    {missingStreaks[num]}
                  </span>
                  {num}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(result).map(([date, data]) => (
              <tr key={date}>
                <td>{new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</td>
                {expandedNumbers.map(num => (
                  <td key={num}>{data[num] ?? 0}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default StatisticPage;

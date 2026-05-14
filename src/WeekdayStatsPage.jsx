import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import apiClient from './utils/apiClient';

const VN_DAYS = [
  { key: 2, label: 'Thứ 2' },
  { key: 3, label: 'Thứ 3' },
  { key: 4, label: 'Thứ 4' },
  { key: 5, label: 'Thứ 5' },
  { key: 6, label: 'Thứ 6' },
  { key: 7, label: 'Thứ 7' },
  { key: 8, label: 'CN' },
];

export default function WeekdayStatsPage() {
  const [days, setDays] = useState(90);
  const [data, setData] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchData(); }, [days]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const baseUrl = process.env.REACT_APP_API_BASE;
      const res = await apiClient.get(`${baseUrl}/api/statistics/by-weekday`, { params: { days } });
      setData(res.data);
      // Auto-select today's weekday
      const jsDay = new Date().getDay();
      setSelectedDay(jsDay === 0 ? 8 : jsDay + 1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const topNumbers = useMemo(() => {
    if (!data || !selectedDay) return [];
    const dayData = data[selectedDay] || {};
    return Object.entries(dayData)
      .map(([number, count]) => ({ number, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }, [data, selectedDay]);

  const maxCount = topNumbers[0]?.count || 1;

  return (
    <div>
      <Helmet>
        <title>Thống kê theo thứ - XSMB</title>
      </Helmet>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          type="number"
          value={days}
          onChange={e => setDays(e.target.value)}
          className="w-16 border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-center bg-white"
        />
        <span className="text-sm text-gray-500">ngày gần nhất</span>
        <button onClick={fetchData} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
          Lấy dữ liệu
        </button>
      </div>

      {data && (
        <>
          <div className="flex gap-1.5 mb-4 flex-wrap">
            {VN_DAYS.map(d => (
              <button
                key={d.key}
                onClick={() => setSelectedDay(d.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  selectedDay === d.key
                    ? 'bg-red-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-red-400'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-sm text-gray-400">Đang tải...</p>
          ) : topNumbers.length === 0 ? (
            <p className="text-sm text-gray-400">Không có dữ liệu.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-red-700 text-white">
                    <th className="px-4 py-2 text-center font-semibold w-10">#</th>
                    <th className="px-4 py-2 text-center font-semibold w-16">Số</th>
                    <th className="px-4 py-2 text-left font-semibold">Tần suất</th>
                    <th className="px-4 py-2 text-center font-semibold w-16">Số lần</th>
                  </tr>
                </thead>
                <tbody>
                  {topNumbers.map(({ number, count }, idx) => (
                    <tr key={number} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2 text-center text-gray-400 text-xs">{idx + 1}</td>
                      <td className="px-4 py-2 text-center font-bold text-gray-800">{number}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                            <div
                              className="bg-red-500 h-2 rounded-full"
                              style={{ width: `${(count / maxCount) * 100}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-center font-semibold text-red-600">{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import apiClient from './utils/apiClient';

const VN_DAYS = ['', '', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];

function vnWeekday(ymd) {
  const js = new Date(ymd + 'T12:00:00Z').getUTCDay();
  return js === 0 ? 8 : js + 1;
}
function fmtMoney(v) {
  if (v == null) return '—';
  const n = Math.round(v);
  return `${n > 0 ? '+' : ''}${n.toLocaleString('vi-VN')}k`;
}
function fmtDate(ymd) {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y.slice(2)}`;
}

export default function BetSimPage() {
  const [summary, setSummary] = useState(null);
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(false);

  const baseUrl = process.env.REACT_APP_API_BASE;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sumRes, betsRes] = await Promise.all([
        apiClient.get(`${baseUrl}/api/sim/summary`),
        apiClient.get(`${baseUrl}/api/sim/bets`, { params: { limit: 1000 } }),
      ]);
      setSummary(sumRes.data);
      setBets(betsRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Lãi/lỗ luỹ kế theo thời gian (cũ → mới), gắn vào từng dòng để hiển thị
  const rows = (() => {
    const asc = [...bets].filter(b => b.status === 'settled').sort((a, b) => (a.bet_date < b.bet_date ? -1 : 1));
    let run = 0;
    const cum = {};
    for (const b of asc) { run += b.profit || 0; cum[b.bet_date] = run; }
    return [...bets].sort((a, b) => (a.bet_date < b.bet_date ? 1 : -1)).map(b => ({ ...b, cumulative: cum[b.bet_date] }));
  })();

  const profitColor = (v) => (v == null ? 'text-gray-400' : v > 0 ? 'text-green-600' : v < 0 ? 'text-red-600' : 'text-gray-600');

  return (
    <div>
      <Helmet><title>Giả lập đánh 3 số đầu - XSMB</title></Helmet>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-gray-800">🎲 Giả lập đánh "3 số đầu" theo thứ</h1>
          <p className="text-xs text-gray-500 mt-0.5">Mỗi ngày 3 số · 5 điểm/số · 1 điểm 22.5k · ăn 80k/điểm/nháy · đánh 337.5k/ngày</p>
        </div>
        <button onClick={fetchData} className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex-shrink-0">
          ↻ Tải lại
        </button>
      </div>

      {/* Thẻ tổng kết */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-3">
            <div className="text-[11px] text-gray-500 mb-1">Tổng lãi/lỗ</div>
            <div className={`text-xl font-extrabold ${profitColor(summary.total_profit)}`}>{fmtMoney(summary.total_profit)}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-3">
            <div className="text-[11px] text-gray-500 mb-1">ROI</div>
            <div className={`text-xl font-extrabold ${profitColor(summary.roi)}`}>{summary.roi > 0 ? '+' : ''}{summary.roi}%</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-3">
            <div className="text-[11px] text-gray-500 mb-1">Tỉ lệ ngày thắng</div>
            <div className="text-xl font-extrabold text-gray-800">{summary.win_rate}%</div>
            <div className="text-[10px] text-gray-400">{summary.win_days}/{summary.settled_bets} ngày</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-3">
            <div className="text-[11px] text-gray-500 mb-1">Đã đánh / chốt</div>
            <div className="text-xl font-extrabold text-gray-800">{summary.total_bets}<span className="text-sm text-gray-400"> / {summary.settled_bets}</span></div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-3">
            <div className="text-[11px] text-gray-500 mb-1">Tổng tiền đánh</div>
            <div className="text-base font-bold text-gray-700">{Math.round(summary.total_stake).toLocaleString('vi-VN')}k</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-3">
            <div className="text-[11px] text-gray-500 mb-1">Tổng tiền ăn</div>
            <div className="text-base font-bold text-gray-700">{Math.round(summary.total_payout).toLocaleString('vi-VN')}k</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-3">
            <div className="text-[11px] text-gray-500 mb-1">Ngày lãi nhất</div>
            <div className="text-base font-bold text-green-600">{fmtMoney(summary.best_day)}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-3">
            <div className="text-[11px] text-gray-500 mb-1">Ngày lỗ nhất</div>
            <div className="text-base font-bold text-red-600">{fmtMoney(summary.worst_day)}</div>
          </div>
        </div>
      )}

      {/* Bảng lịch sử */}
      {loading ? (
        <p className="text-sm text-gray-400">Đang tải...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-400">Chưa có dữ liệu giả lập.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-red-700 text-white">
                <th className="px-3 py-2 text-left font-semibold">Ngày</th>
                <th className="px-3 py-2 text-center font-semibold">Thứ</th>
                <th className="px-3 py-2 text-center font-semibold">3 số (nháy về)</th>
                <th className="px-3 py-2 text-right font-semibold">Đánh</th>
                <th className="px-3 py-2 text-right font-semibold">Ăn</th>
                <th className="px-3 py-2 text-right font-semibold">Kết quả</th>
                <th className="px-3 py-2 text-right font-semibold">Luỹ kế</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id} className={b.status !== 'settled' ? 'bg-amber-50' : 'odd:bg-white even:bg-gray-50'}>
                  <td className="px-3 py-2 font-medium text-gray-700">{fmtDate(b.bet_date)}</td>
                  <td className="px-3 py-2 text-center text-gray-500 text-xs">{VN_DAYS[vnWeekday(b.bet_date)]}</td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex gap-1.5 justify-center flex-wrap">
                      {b.numbers.map((n) => {
                        const nhay = b.hits ? (b.hits[n] || 0) : null;
                        const win = nhay > 0;
                        return (
                          <span key={n} className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-bold ${win ? 'bg-green-100 text-green-700' : b.status === 'settled' ? 'bg-gray-100 text-gray-500' : 'bg-white border border-gray-200 text-gray-600'}`}>
                            {n}{nhay != null && <sup className={win ? 'text-green-600' : 'text-gray-400'}>{nhay}</sup>}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-gray-500">{Math.round(b.stake).toLocaleString('vi-VN')}k</td>
                  <td className="px-3 py-2 text-right text-gray-700">{b.payout == null ? '—' : `${Math.round(b.payout).toLocaleString('vi-VN')}k`}</td>
                  <td className={`px-3 py-2 text-right font-bold ${profitColor(b.profit)}`}>{b.status === 'settled' ? fmtMoney(b.profit) : <span className="text-amber-600 text-xs font-semibold">chờ</span>}</td>
                  <td className={`px-3 py-2 text-right font-semibold ${profitColor(b.cumulative)}`}>{b.cumulative == null ? '—' : fmtMoney(b.cumulative)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

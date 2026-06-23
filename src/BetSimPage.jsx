import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import apiClient from './utils/apiClient';

const VN_DAYS = ['', '', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function vnWeekday(ymd) {
  const js = new Date(ymd + 'T12:00:00Z').getUTCDay();
  return js === 0 ? 8 : js + 1;
}
// Thứ 2 của tuần chứa ngày ymd (YYYY-MM-DD), trả về YYYY-MM-DD
function mondayOf(ymd) {
  const d = new Date(ymd + 'T12:00:00Z');
  const day = d.getUTCDay(); // 0=CN..6=T7
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().slice(0, 10);
}
function addDays(ymd, n) {
  const d = new Date(ymd + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function fmtDay(ymd) {
  if (!ymd) return '';
  const [, m, d] = ymd.split('-');
  return `${d}/${m}`;
}
function fmtK(v) {
  if (v == null) return '—';
  return `${v > 0 ? '+' : ''}${v.toLocaleString('vi-VN')}k`;
}
function fmtKplain(v) {
  return `${(v || 0).toLocaleString('vi-VN')}k`;
}
const profitColor = (v) =>
  v == null ? 'text-gray-400' : v > 0 ? 'text-green-600' : v < 0 ? 'text-red-600' : 'text-gray-600';

export default function BetSimPage({ apiPrefix = '/api/sim', soCount = 3, stakePerDay = 337.5 }) {
  const [summary, setSummary] = useState(null);
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(new Set());

  const baseUrl = process.env.REACT_APP_API_BASE;
  const todayVN = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sumRes, betsRes] = await Promise.all([
        apiClient.get(`${baseUrl}${apiPrefix}/summary`),
        apiClient.get(`${baseUrl}${apiPrefix}/bets`, { params: { limit: 1000 } }),
      ]);
      setSummary(sumRes.data);
      setBets(betsRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [apiPrefix]);

  // Gom các kỳ thành tuần (Thứ 2 → CN), tính luỹ kế trong tuần & luỹ kế qua các tuần
  const weeks = useMemo(() => {
    const map = new Map();
    for (const b of bets) {
      const wk = mondayOf(b.bet_date);
      if (!map.has(wk)) map.set(wk, []);
      map.get(wk).push(b);
    }
    const arr = [];
    for (const [weekStart, items] of map) {
      items.sort((a, b) => (a.bet_date < b.bet_date ? -1 : 1));
      let run = 0;
      const days = items.map((b) => {
        if (b.status === 'settled') run += b.profit || 0;
        return { ...b, weekCum: b.status === 'settled' ? run : null };
      });
      const settled = items.filter((b) => b.status === 'settled');
      arr.push({
        weekStart,
        weekEnd: addDays(weekStart, 6),
        days,
        count: items.length,
        pending: items.length - settled.length,
        winDays: settled.filter((b) => b.profit > 0).length,
        loseDays: settled.filter((b) => b.profit < 0).length,
        profit: settled.reduce((s, b) => s + (b.profit || 0), 0),
        stake: settled.reduce((s, b) => s + (b.stake || 0), 0),
        payout: settled.reduce((s, b) => s + (b.payout || 0), 0),
      });
    }
    arr.sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1)); // mới nhất trước
    // luỹ kế qua các tuần (cũ → mới)
    let c = 0;
    const cum = {};
    [...arr].reverse().forEach((w) => { c += w.profit; cum[w.weekStart] = c; });
    arr.forEach((w) => { w.cumulative = cum[w.weekStart]; });
    return arr;
  }, [bets]);

  const todayWeekStart = mondayOf(todayVN);
  const currentWeek =
    weeks.find((w) => w.weekStart === todayWeekStart) ||
    { weekStart: todayWeekStart, weekEnd: addDays(todayWeekStart, 6), days: [], count: 0, pending: 0, winDays: 0, loseDays: 0, profit: 0, stake: 0, payout: 0, cumulative: weeks[0]?.cumulative || 0 };
  const pastWeeks = weeks.filter((w) => w.weekStart !== todayWeekStart);
  const winningWeeks = weeks.filter((w) => w.profit > 0).length;

  const toggle = (wk) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(wk)) next.delete(wk); else next.add(wk);
      return next;
    });

  const weekLabel = (w) => `${fmtDay(w.weekStart)} – ${fmtDay(w.weekEnd)}`;

  const DayTable = ({ days }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100 text-gray-600">
            <th className="px-2.5 py-1.5 text-left font-semibold">Ngày</th>
            <th className="px-2 py-1.5 text-center font-semibold">Thứ</th>
            <th className="px-2 py-1.5 text-center font-semibold">3 số (nháy về)</th>
            <th className="px-2.5 py-1.5 text-right font-semibold">Đánh</th>
            <th className="px-2.5 py-1.5 text-right font-semibold">Ăn</th>
            <th className="px-2.5 py-1.5 text-right font-semibold">Kết quả</th>
            <th className="px-2.5 py-1.5 text-right font-semibold">Luỹ kế tuần</th>
          </tr>
        </thead>
        <tbody>
          {[...days].reverse().map((b) => {
            const isToday = b.bet_date === todayVN;
            return (
              <tr key={b.id || b.bet_date} className={isToday ? 'bg-amber-50' : 'odd:bg-white even:bg-gray-50'}>
                <td className="px-2.5 py-1.5 font-medium text-gray-700 whitespace-nowrap">
                  {fmtDay(b.bet_date)}{isToday && <span className="ml-1 text-[9px] text-amber-600 font-bold">hôm nay</span>}
                </td>
                <td className="px-2 py-1.5 text-center text-gray-500 text-xs">{VN_DAYS[vnWeekday(b.bet_date)]}</td>
                <td className="px-2 py-1.5 text-center">
                  <div className="flex gap-1 justify-center flex-wrap">
                    {b.numbers.map((n) => {
                      const nhay = b.hits ? (b.hits[n] || 0) : null;
                      const win = nhay > 0;
                      return (
                        <span key={n} className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold ${
                          win ? 'bg-green-100 text-green-700'
                            : b.status === 'settled' ? 'bg-gray-100 text-gray-500'
                            : 'bg-white border border-gray-200 text-gray-600'}`}>
                          {n}{nhay != null && <sup className={win ? 'text-green-600' : 'text-gray-400'}>{nhay}</sup>}
                        </span>
                      );
                    })}
                  </div>
                </td>
                <td className="px-2.5 py-1.5 text-right text-gray-500 whitespace-nowrap">{fmtKplain(b.stake)}</td>
                <td className="px-2.5 py-1.5 text-right text-gray-700 whitespace-nowrap">{b.payout == null ? '—' : fmtKplain(b.payout)}</td>
                <td className={`px-2.5 py-1.5 text-right font-bold whitespace-nowrap ${profitColor(b.profit)}`}>
                  {b.status === 'settled' ? fmtK(b.profit) : <span className="text-amber-600 text-xs font-semibold">chờ</span>}
                </td>
                <td className={`px-2.5 py-1.5 text-right font-semibold whitespace-nowrap ${profitColor(b.weekCum)}`}>
                  {b.weekCum == null ? '—' : fmtK(b.weekCum)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <Helmet><title>{`Giả lập đánh ${soCount} số đầu - XSMB`}</title></Helmet>

      <div className="flex items-start justify-between mb-4 gap-2">
        <div>
          <h1 className="text-lg font-bold text-gray-800">🎲 Giả lập đánh "{soCount} số đầu" theo thứ</h1>
          <p className="text-xs text-gray-500 mt-0.5">Mỗi ngày {soCount} số · 5 điểm/số · 1 điểm 22.5k · ăn 80k/điểm/nháy · đánh {stakePerDay}k/ngày · tổng kết theo tuần (T2→CN)</p>
        </div>
        <button onClick={fetchData} className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex-shrink-0">↻</button>
      </div>

      {/* Tổng quan từ đầu */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-5">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-3">
            <div className="text-[11px] text-gray-500 mb-1">Tổng lãi/lỗ</div>
            <div className={`text-xl font-extrabold ${profitColor(summary.total_profit)}`}>{fmtK(summary.total_profit)}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-3">
            <div className="text-[11px] text-gray-500 mb-1">ROI</div>
            <div className={`text-xl font-extrabold ${profitColor(summary.roi)}`}>{summary.roi > 0 ? '+' : ''}{summary.roi}%</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-3">
            <div className="text-[11px] text-gray-500 mb-1">Tuần thắng</div>
            <div className="text-xl font-extrabold text-gray-800">{winningWeeks}<span className="text-sm text-gray-400">/{weeks.length}</span></div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-3">
            <div className="text-[11px] text-gray-500 mb-1">Ngày thắng</div>
            <div className="text-xl font-extrabold text-gray-800">{summary.win_rate}%</div>
            <div className="text-[10px] text-gray-400">{summary.win_days}/{summary.settled_bets} ngày</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-3">
            <div className="text-[11px] text-gray-500 mb-1">Tốt / xấu nhất</div>
            <div className="text-sm font-bold text-green-600">{fmtK(summary.best_day)}</div>
            <div className="text-sm font-bold text-red-600">{fmtK(summary.worst_day)}</div>
          </div>
        </div>
      )}

      {loading && <p className="text-sm text-gray-400 mb-3">Đang tải...</p>}

      {/* Tuần này */}
      <div className="rounded-2xl border-2 border-red-200 bg-white shadow-sm mb-5 overflow-hidden">
        <div className="bg-red-50 px-4 py-3 flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-800">Tuần này · {weekLabel(currentWeek)}</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-100 rounded-full px-2 py-0.5">● đang chạy</span>
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {currentWeek.winDays}T / {currentWeek.loseDays}B · đã đánh {currentWeek.count}/7 ngày · ăn {fmtKplain(currentWeek.payout)} − đánh {fmtKplain(currentWeek.stake)}
            </div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-extrabold ${profitColor(currentWeek.profit)}`}>{fmtK(currentWeek.profit)}</div>
            <div className="text-[10px] text-gray-400">luỹ kế tổng {fmtK(currentWeek.cumulative)}</div>
          </div>
        </div>
        {currentWeek.days.length === 0
          ? <p className="text-sm text-gray-400 px-4 py-4">Chưa có kỳ nào trong tuần này. Cược đầu tiên tạo lúc 17h.</p>
          : <DayTable days={currentWeek.days} />}
      </div>

      {/* Các tuần trước */}
      {pastWeeks.length > 0 && (
        <>
          <h2 className="text-sm font-bold text-gray-600 mb-2">Các tuần trước</h2>
          <div className="space-y-2">
            {pastWeeks.map((w) => {
              const open = expanded.has(w.weekStart);
              return (
                <div key={w.weekStart} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <button
                    onClick={() => toggle(w.weekStart)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
                  >
                    <span className={`text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`}>▸</span>
                    <span className="font-semibold text-gray-700 whitespace-nowrap">{weekLabel(w)}</span>
                    <span className="text-xs text-gray-400 hidden sm:inline">{w.count} ngày</span>
                    <span className="text-xs text-gray-500 hidden sm:inline">{w.winDays}T/{w.loseDays}B</span>
                    <span className="text-xs text-gray-400 ml-auto hidden md:inline">ăn {fmtKplain(w.payout)} − đánh {fmtKplain(w.stake)}</span>
                    <span className={`font-bold whitespace-nowrap ml-auto md:ml-3 ${profitColor(w.profit)}`}>{fmtK(w.profit)}</span>
                    <span className={`text-xs font-semibold whitespace-nowrap ${profitColor(w.cumulative)}`}>⟶ {fmtK(w.cumulative)}</span>
                  </button>
                  {open && (
                    <div className="border-t border-gray-100">
                      <DayTable days={w.days} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {!loading && weeks.length === 0 && (
        <p className="text-sm text-gray-400">Chưa có dữ liệu giả lập.</p>
      )}
    </div>
  );
}

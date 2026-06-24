import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import apiClient from './utils/apiClient';

const VARIANTS = [
  { key: 2, apiPrefix: '/api/sim2', label: '2 số', stakePerDay: 225 },
  { key: 3, apiPrefix: '/api/sim', label: '3 số', stakePerDay: 337.5 },
  { key: 4, apiPrefix: '/api/sim4', label: '4 số', stakePerDay: 450 },
];
const MIN_DATE = '2026-01-01';
const START_REAL = '2026-06-24'; // ngày bắt đầu đánh thật — mốc thống kê mặc định, cố định
const VN_DAYS = ['', '', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function todayVNStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
}

function vnWeekday(ymd) {
  const js = new Date(ymd + 'T12:00:00Z').getUTCDay();
  return js === 0 ? 8 : js + 1;
}
function mondayOf(ymd) {
  const d = new Date(ymd + 'T12:00:00Z');
  const day = d.getUTCDay();
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

// Gom kỳ thành tuần (T2→CN), tính luỹ kế trong tuần & qua các tuần.
function computeWeeks(bets) {
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
      winDays: settled.filter((b) => b.profit > 0).length,
      loseDays: settled.filter((b) => b.profit < 0).length,
      profit: settled.reduce((s, b) => s + (b.profit || 0), 0),
      stake: settled.reduce((s, b) => s + (b.stake || 0), 0),
      payout: settled.reduce((s, b) => s + (b.payout || 0), 0),
    });
  }
  arr.sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1));
  let c = 0;
  const cum = {};
  [...arr].reverse().forEach((w) => { c += w.profit; cum[w.weekStart] = c; });
  arr.forEach((w) => { w.cumulative = cum[w.weekStart]; });
  return arr;
}

function computeSummary(bets, weeks) {
  const settled = bets.filter((b) => b.status === 'settled');
  const total_profit = settled.reduce((s, b) => s + (b.profit || 0), 0);
  const settled_stake = settled.reduce((s, b) => s + (b.stake || 0), 0);
  const total_payout = settled.reduce((s, b) => s + (b.payout || 0), 0);
  const win_days = settled.filter((b) => b.profit > 0).length;
  return {
    total_bets: bets.length,
    settled: settled.length,
    total_profit: +total_profit.toFixed(2),
    total_stake: +settled_stake.toFixed(2),
    total_payout: +total_payout.toFixed(2),
    win_days,
    win_rate: settled.length ? +((win_days / settled.length) * 100).toFixed(1) : 0,
    roi: settled_stake ? +((total_profit / settled_stake) * 100).toFixed(1) : 0,
    best_day: settled.length ? Math.max(...settled.map((b) => b.profit)) : null,
    worst_day: settled.length ? Math.min(...settled.map((b) => b.profit)) : null,
    winningWeeks: weeks.filter((w) => w.profit > 0).length,
    totalWeeks: weeks.length,
  };
}

function DayTable({ days, todayVN }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100 text-gray-600">
            <th className="px-2.5 py-1.5 text-left font-semibold">Ngày</th>
            <th className="px-2 py-1.5 text-center font-semibold">Thứ</th>
            <th className="px-2 py-1.5 text-center font-semibold">Số (nháy về)</th>
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
}

// Chi tiết theo tuần của 1 biến thể: tuần này luôn mở + các tuần cũ collapse.
function WeeklyDetail({ weeks, todayVN, expanded, toggle }) {
  const todayWeekStart = mondayOf(todayVN);
  const currentWeek =
    weeks.find((w) => w.weekStart === todayWeekStart) ||
    { weekStart: todayWeekStart, weekEnd: addDays(todayWeekStart, 6), days: [], count: 0, winDays: 0, loseDays: 0, profit: 0, stake: 0, payout: 0, cumulative: weeks[0]?.cumulative || 0 };
  const pastWeeks = weeks.filter((w) => w.weekStart !== todayWeekStart);
  const weekLabel = (w) => `${fmtDay(w.weekStart)} – ${fmtDay(w.weekEnd)}`;

  return (
    <>
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
          ? <p className="text-sm text-gray-400 px-4 py-4">Chưa có kỳ nào trong tuần này.</p>
          : <DayTable days={currentWeek.days} todayVN={todayVN} />}
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
                  <button onClick={() => toggle(w.weekStart)} className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left">
                    <span className={`text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`}>▸</span>
                    <span className="font-semibold text-gray-700 whitespace-nowrap">{weekLabel(w)}</span>
                    <span className="text-xs text-gray-400 hidden sm:inline">{w.count} ngày</span>
                    <span className="text-xs text-gray-500 hidden sm:inline">{w.winDays}T/{w.loseDays}B</span>
                    <span className="text-xs text-gray-400 ml-auto hidden md:inline">ăn {fmtKplain(w.payout)} − đánh {fmtKplain(w.stake)}</span>
                    <span className={`font-bold whitespace-nowrap ml-auto md:ml-3 ${profitColor(w.profit)}`}>{fmtK(w.profit)}</span>
                    <span className={`text-xs font-semibold whitespace-nowrap ${profitColor(w.cumulative)}`}>⟶ {fmtK(w.cumulative)}</span>
                  </button>
                  {open && <div className="border-t border-gray-100"><DayTable days={w.days} todayVN={todayVN} /></div>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

export default function BetSimPage() {
  const todayVN = todayVNStr();
  const [data, setData] = useState({ 2: [], 3: [], 4: [] });
  const [startDate, setStartDate] = useState(START_REAL);
  const [activeTab, setActiveTab] = useState(3);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(new Set());

  const baseUrl = process.env.REACT_APP_API_BASE;

  const fetchData = async () => {
    setLoading(true);
    try {
      // Chốt ngay các kỳ đã đủ kết quả (không chờ cron 19h), rồi mới lấy dữ liệu
      await Promise.all(VARIANTS.map((v) => apiClient.post(`${baseUrl}${v.apiPrefix}/settle`).catch(() => {})));
      const results = await Promise.all(
        VARIANTS.map((v) => apiClient.get(`${baseUrl}${v.apiPrefix}/bets`, { params: { limit: 2000 } }))
      );
      const next = {};
      VARIANTS.forEach((v, i) => { next[v.key] = results[i].data || []; });
      setData(next);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Lọc theo ngày bắt đầu + gom tuần + tổng kết cho từng biến thể
  const perVariant = useMemo(() => {
    const out = {};
    for (const v of VARIANTS) {
      const bets = (data[v.key] || []).filter((b) => b.bet_date >= startDate);
      const weeks = computeWeeks(bets);
      out[v.key] = { bets, weeks, summary: computeSummary(bets, weeks) };
    }
    return out;
  }, [data, startDate]);

  const toggle = (wk) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(wk)) next.delete(wk); else next.add(wk);
      return next;
    });

  const active = perVariant[activeTab];
  const activeVariant = VARIANTS.find((v) => v.key === activeTab);

  return (
    <div>
      <Helmet><title>Giả lập đánh lô theo thứ - XSMB</title></Helmet>

      <div className="mb-4">
        <h1 className="text-lg font-bold text-gray-800">🎲 Giả lập đánh lô "top số đầu" theo thứ</h1>
        <p className="text-xs text-gray-500 mt-0.5">5 điểm/số · 1 điểm 22.5k · ăn 80k/điểm/nháy · tổng kết theo tuần (T2→CN)</p>
      </div>

      {/* Tham số ngày bắt đầu */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-sm text-gray-600 font-medium">Từ ngày:</span>
        <input
          type="date"
          value={startDate}
          min={MIN_DATE}
          max={todayVN}
          onChange={(e) => setStartDate(e.target.value < MIN_DATE ? MIN_DATE : e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
        />
        <button onClick={() => setStartDate(START_REAL)} className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold ${startDate === START_REAL ? 'bg-red-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>Từ 24/6</button>
        <button onClick={() => setStartDate(todayVN)} className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold ${startDate === todayVN ? 'bg-red-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>Hôm nay</button>
        <button onClick={() => setStartDate(MIN_DATE)} className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold ${startDate === MIN_DATE ? 'bg-red-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>Đầu năm</button>
        <button onClick={fetchData} className="ml-auto bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors">↻</button>
      </div>

      {loading && <p className="text-sm text-gray-400 mb-3">Đang tải...</p>}

      {/* So sánh 3 biến thể — bấm để chọn xem chi tiết */}
      <div className="grid grid-cols-3 gap-2.5 mb-5">
        {VARIANTS.map((v) => {
          const s = perVariant[v.key].summary;
          const on = activeTab === v.key;
          return (
            <button
              key={v.key}
              onClick={() => setActiveTab(v.key)}
              className={`text-left rounded-xl border-2 shadow-sm p-3 transition-colors ${on ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-white hover:border-red-300'}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-gray-800">{v.label}</span>
                <span className="text-[10px] text-gray-400">{v.stakePerDay}k/ngày</span>
              </div>
              <div className={`text-xl font-extrabold ${profitColor(s.total_profit)}`}>{fmtK(s.total_profit)}</div>
              <div className="text-[11px] text-gray-500 mt-1 space-y-0.5">
                <div>ROI <span className={`font-semibold ${profitColor(s.roi)}`}>{s.roi > 0 ? '+' : ''}{s.roi}%</span></div>
                <div>Ngày thắng {s.win_rate}% <span className="text-gray-400">({s.win_days}/{s.settled})</span></div>
                <div>Tuần thắng {s.winningWeeks}/{s.totalWeeks}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Chi tiết biến thể đang chọn */}
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-base font-bold text-gray-800">Chi tiết: đánh {activeVariant.label}</h2>
        <span className="text-xs text-gray-400">({activeVariant.stakePerDay}k/ngày)</span>
      </div>
      {active.weeks.length === 0
        ? <p className="text-sm text-gray-400">Không có dữ liệu từ ngày đã chọn.</p>
        : <WeeklyDetail weeks={active.weeks} todayVN={todayVN} expanded={expanded} toggle={toggle} />}
    </div>
  );
}

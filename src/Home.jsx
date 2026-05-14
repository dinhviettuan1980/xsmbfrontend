import React, { useState, useEffect } from "react";
import { Helmet } from 'react-helmet-async';
import { useHeaderSlot } from './HeaderSlotContext';
import apiClient from './utils/apiClient';

function HeadTailTable({ headToTail, tailToHead }) {
  const renderTable = (map, label1, label2) => (
    <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
      <table className="table-auto w-full text-sm border-collapse">
        <thead>
          <tr className="bg-red-700 text-white">
            <th className="px-3 py-2 text-center font-semibold">{label1}</th>
            <th className="px-3 py-2 text-center font-semibold">{label2}</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(map).map(([k, v], idx) => (
            <tr key={label1 + k} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="text-red-600 font-bold px-3 py-1.5 text-center border-b border-gray-100">{k}</td>
              <td className="px-3 py-1.5 text-center border-b border-gray-100 text-gray-700">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="mt-4">
      <div className="grid grid-cols-2 gap-3">
        {renderTable(headToTail, "Đầu", "Đuôi")}
        {renderTable(tailToHead, "Đuôi", "Đầu")}
      </div>
    </div>
  );
}

function Home() {
  const [date, setDate] = useState("");
  const [data, setData] = useState(null);
  const [ongPhongResult, setOngPhongResult] = useState(null);
  const [pascalPredictions, setPascalPredictions] = useState([]);
  const [longestAbsent, setLongestAbsent] = useState([]);
  const [ganThreshold, setGanThreshold] = useState(10);
  const { setSlot } = useHeaderSlot();

  const getYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  };

  useEffect(() => {
    const yesterday = getYesterday();
    setDate(yesterday);
    fetchData(yesterday);
  }, []);

  useEffect(() => {
    setSlot(
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="bg-white text-red-700 rounded-lg px-2 py-1 text-sm font-semibold focus:outline-none border-0 cursor-pointer"
      />
    );
    return () => setSlot(null);
  }, [date]);

  useEffect(() => {
    if (date) fetchData(date);
  }, [date]);

  const fetchData = async (targetDate) => {
    try {
      const baseUrl = process.env.REACT_APP_API_BASE;
      if (!targetDate) return;

      const phongRes = await apiClient.get(`${baseUrl}/api/cau-ong-phong`);
      setOngPhongResult(phongRes.data || null);

      const pascalRes = await apiClient.get(`${baseUrl}/api/cau-lo-pascal`);
      setPascalPredictions(pascalRes.data.predictions || []);

      const res = await apiClient.get(`/api/history?date=${targetDate}`);
      setData(res.data);

      const absentRes = await apiClient.get(`${baseUrl}/api/statistics/longest-absent?days=60`);
      setLongestAbsent(absentRes.data || []);
    } catch (err) {
      console.error("Lỗi lấy dữ liệu:", err);
    }
  };

  const renderCenteredRow = (label, numbers, perRow = null) => {
    if (!numbers || numbers.length === 0) return null;
    const split = perRow ? [numbers.slice(0, perRow), numbers.slice(perRow)] : [numbers];

    return split.map((row, rowIndex) => (
      <tr key={label + rowIndex} className="border-b border-gray-100">
        {rowIndex === 0 && (
          <td
            rowSpan={split.length}
            className="font-bold px-2 py-1.5 text-center align-middle bg-gray-50 border-r border-gray-200 text-gray-600 text-xs w-8"
          >
            {label}
          </td>
        )}
        <td colSpan="6" className="py-1.5 px-2">
          <div className="flex justify-center gap-1.5 flex-wrap">
            {row.map((num, idx) => (
              <div
                key={idx}
                className="min-w-[52px] text-center px-1.5 py-0.5 border border-gray-100 rounded-lg bg-white shadow-sm"
              >
                <span className="font-medium text-gray-600 text-sm">{num.slice(0, -2)}</span>
                <span className="text-red-600 font-bold text-sm">{num.slice(-2)}</span>
              </div>
            ))}
          </div>
        </td>
      </tr>
    ));
  };

  const getList = (str) => (str ? str.split(",") : []);

  return (
    <div>
      <Helmet>
        <title>XSMB - Tra cứu kết quả xổ số miền Bắc hôm nay</title>
        <meta name="description" content="Tra cứu kết quả xổ số miền Bắc (XSMB) hôm nay nhanh nhất, chính xác nhất." />
      </Helmet>

      {/* Cầu prediction cards */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">Cầu Ông Phong</div>
          {ongPhongResult ? (
            <div className="font-bold text-emerald-800">
              {ongPhongResult.predictions?.join(", ") || "—"}
            </div>
          ) : (
            <div className="text-gray-400 text-xs">Đang tải...</div>
          )}
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <div className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Cầu Pascal</div>
          {pascalPredictions.length > 0 ? (
            <div className="font-bold text-red-700">
              {pascalPredictions.join(", ")}
            </div>
          ) : (
            <div className="text-gray-400 text-xs">Chưa có</div>
          )}
        </div>
      </div>

      {/* Lô Gan */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="text-xs font-bold text-gray-600 uppercase tracking-wide">LÔ Gan ≥</div>
          <select
            value={ganThreshold}
            onChange={e => setGanThreshold(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-2 py-0.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-700"
          >
            {[5, 7, 10, 14, 20, 25, 30].map(v => (
              <option key={v} value={v}>{v} ngày</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {longestAbsent.filter(item => item.days_absent >= ganThreshold).map((item, idx) => (
            <span
              key={idx}
              className="inline-flex items-baseline gap-0.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-full px-2 py-0.5 text-sm font-semibold"
            >
              {item.number}
              <sup className="text-red-500 text-xs font-bold">{item.days_absent}</sup>
            </span>
          ))}
          {longestAbsent.filter(item => item.days_absent >= ganThreshold).length === 0 && (
            <span className="text-xs text-gray-400">Không có số nào vắng ≥ {ganThreshold} ngày</span>
          )}
        </div>
      </div>

      {/* Lottery results table */}
      {data && (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="table-auto text-sm w-full bg-white border-collapse mx-auto">
              <tbody>
                {/* Special prize */}
                <tr className="border-b border-gray-100">
                  <td className="font-bold px-2 py-2 text-center bg-amber-50 border-r border-gray-200 text-amber-700 text-xs w-8">ĐB</td>
                  <td colSpan="6" className="text-center bg-amber-50 py-3">
                    <div className="inline-block bg-red-600 text-white text-2xl font-black px-5 py-1.5 rounded-xl shadow-md tracking-widest ring-2 ring-red-200">
                      {data.g0}
                    </div>
                  </td>
                </tr>
                {renderCenteredRow("1", getList(data.g1))}
                {renderCenteredRow("2", getList(data.g2))}
                {renderCenteredRow("3", getList(data.g3), 3)}
                {renderCenteredRow("4", getList(data.g4))}
                {renderCenteredRow("5", getList(data.g5), 3)}
                {renderCenteredRow("6", getList(data.g6))}
                {renderCenteredRow("7", getList(data.g7))}
              </tbody>
            </table>
          </div>

          {data.headToTail && data.tailToHead && (
            <HeadTailTable headToTail={data.headToTail} tailToHead={data.tailToHead} />
          )}
        </>
      )}
    </div>
  );
}

export default Home;

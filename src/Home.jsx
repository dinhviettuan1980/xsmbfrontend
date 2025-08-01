import React, { useState, useEffect } from "react";
import apiClient from './utils/apiClient';

function HeadTailTable({ headToTail, tailToHead }) {
  const renderTable = (map, label1, label2) => (
    <table className="table-auto w-full text-sm border-collapse border">
      <thead className="bg-blue-100 text-center">
        <tr>
          <th className="border p-1">{label1}</th>
          <th className="border p-1">{label2}</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(map).map(([k, v]) => (
          <tr key={label1 + k} className="text-center even:bg-blue-50">
            <td className="text-red-600 font-medium border p-1">{k}</td>
            <td className="border p-1">{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="mt-6">
      <div className="grid grid-cols-2 gap-6">
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

      const absentRes = await apiClient.get(`${baseUrl}/api/statistics/longest-absent?days=30`);
      const filtered = (absentRes.data || []).filter(item => item.days_absent >= 5);
      setLongestAbsent(filtered);
    } catch (err) {
      console.error("Lỗi lấy dữ liệu:", err);
    }
  };

  const renderCenteredRow = (label, numbers, perRow = null) => {
    if (!numbers || numbers.length === 0) return null;
    const split = perRow ? [numbers.slice(0, perRow), numbers.slice(perRow)] : [numbers];
    
    return split.map((row, rowIndex) => (
      <tr key={label + rowIndex}>
        {rowIndex === 0 && (
          <td
            rowSpan={split.length}
            className="font-bold px-2 py-1 text-center align-middle bg-gray-100 border p-1"
          >
            {label}
          </td>
        )}
        <td colSpan="6" className="text-center py-1 border p-1">
          <div className="flex justify-center gap-6 flex-wrap">
            {row.map((num, idx) => (
              <div
                key={idx}
                className="min-w-[64px] text-center px-2 border border-gray-200 rounded bg-white"
              >
                <span className="font-semibold">{num.slice(0, -2)}</span>
                <span className="text-red-600 font-bold">{num.slice(-2)}</span>
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
      <div className="flex items-center justify-between mb-4 gap-2">
        <h2 className="text-sm font-bold whitespace-nowrap">Tra cứu kết quả XSMB</h2>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border p-1 text-sm"
        />
      </div>

      {ongPhongResult ? (
        <div className="mt-4 text-lg font-semibold">
          <p className="mt-2 text-lg">
            Cầu Ông Phong:{" "}
            <span className="font-bold text-green-600">
              {ongPhongResult.predictions?.join(", ") || "Không có"}
            </span>
          </p>
        </div>
      ) : (
        <p>Đang tải dữ liệu cầu ông Phong...</p>
      )}

      <div className="mt-4 text-lg font-semibold">
        Cầu Pascal:{" "}
        {pascalPredictions.length > 0 ? (
          <span className="text-red-600">
            {pascalPredictions.join(", ")}
          </span>
        ) : (
          <span>Chưa có dữ liệu</span>
        )}
      </div>

      {longestAbsent.length > 0 && (
        <div className="mt-4 text-sm">
          <div className="flex flex-wrap gap-3 mt-1 text-blue-800">
            {longestAbsent.map((item, idx) => (
              <span key={idx}>
                {item.number}
                <sup className="text-red-500 text-xs ml-0.5">{item.days_absent}</sup>
              </span>
            ))}
          </div>
        </div>
      )}

      {data && (
        <>
          <div className="overflow-x-auto">
            <table className="table-auto border text-sm w-full max-w-lg bg-white">
              <tbody>
                <tr className="bg-blue-50">
                  <td className="font-bold px-2 py-1 text-center bg-gray-100 border p-1">ĐB</td>
                  <td colSpan="6" className="text-center text-red-600 font-extrabold text-lg border p-1">
                    {data.g0}
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

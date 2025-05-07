import React, { useEffect, useState } from "react";
import axios from "axios";

function CauLoPage() {
  const [pascalTriangle, setPascalTriangle] = useState([]);
  const [pascalPredictions, setPascalPredictions] = useState([]);
  const [ongPhongResult, setOngPhongResult] = useState(null);
  const [ongPhongStats, setOngPhongStats] = useState([]);
  const [pascalStats, setPascalStats] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const pascalRes = await axios.get("https://api.tuandv.asia/api/cau-lo-pascal");
        setPascalTriangle(pascalRes.data.triangle || []);
        setPascalPredictions(pascalRes.data.predictions || []);

        const phongRes = await axios.get("https://api.tuandv.asia/api/cau-ong-phong");
        setOngPhongResult(phongRes.data || null);

        const phongStatsRes = await axios.get("https://api.tuandv.asia/api/tk-cau-ong-phong");
        setOngPhongStats(phongStatsRes.data["tk-cau-ong-phong-short"] || []);

        const pascalStatsRes = await axios.get("https://api.tuandv.asia/api/tk-cau-lo-pascal");
        setPascalStats(pascalStatsRes.data["tk-cau-lo-pascal-short"] || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="p-4">
      {/* Cầu Ông Phong */}
      <h2 className="text-2xl font-bold mb-4">🎯 Cầu Ông Phong</h2>

      {ongPhongResult ? (
        <div className="text-center mb-4">
          <p className="text-lg">
            Giải đặc biệt hôm trước:{" "}
            <span className="font-bold text-red-600">{ongPhongResult.specialPrize}</span>
          </p>
          <p className="mt-2 text-lg">
            Dự đoán:{" "}
            <span className="font-bold text-green-600">
              {ongPhongResult.predictions?.join(", ") || "Không có"}
            </span>
          </p>
        </div>
      ) : (
        <p>Đang tải dữ liệu cầu ông Phong...</p>
      )}

      {/* Biểu đồ tk-cau-ong-phong-short */}
      {ongPhongStats.length > 0 && (
        <div className="mt-2">
          <h3 className="text-lg font-semibold mb-1">Chuỗi thống kê cầu Ông Phong:</h3>
          <div className="flex items-end space-x-2 overflow-x-auto">
            {ongPhongStats.map((value, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className="text-xs mb-1 text-gray-700">{Math.abs(value)}</div>
                <div
                  className={`w-3 rounded-t ${value > 0 ? "bg-green-500" : "bg-red-500"}`}
                  style={{ height: `${Math.abs(value) * 10}px` }}
                  title={`Chuỗi ${value > 0 ? "trúng" : "trượt"}: ${Math.abs(value)} ngày`}
                ></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cầu Pascal */}
      <h2 className="text-2xl font-bold mt-8 mb-6">🎯 Cầu Pascal</h2>

      {pascalTriangle.length > 0 ? (
        <div className="flex flex-col items-center space-y-2">
          {/* {pascalTriangle.map((row, rowIndex) => (
            <div key={rowIndex} className="flex justify-center space-x-1">
              {row.map((num, idx) => (
                <div
                  key={idx}
                  className="w-6 h-6 flex items-center justify-center rounded-full bg-white border border-gray-400 text-red-600 text-xs"
                >
                  {num}
                </div>
              ))}
            </div>
          ))} */}

          <div className="mt-4 text-lg font-semibold">
            Dự đoán:{" "}
            {pascalPredictions.length > 0 ? (
              <span className="text-red-600">
                {pascalPredictions.join(", ")}
              </span>
            ) : (
              <span>Chưa có dữ liệu</span>
            )}
          </div>
        </div>
      ) : (
        <p>Đang tải dữ liệu cầu Pascal...</p>
      )}

      {/* Thống kê cầu Pascal */}
      {pascalStats.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-1">Chuỗi thống kê cầu Pascal:</h3>
          <div className="flex items-end space-x-2 overflow-x-auto">
            {pascalStats.map((value, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className="text-xs mb-1 text-gray-700">{Math.abs(value)}</div>
                <div
                  className={`w-3 rounded-t ${value > 0 ? "bg-green-500" : "bg-red-500"}`}
                  style={{ height: `${Math.abs(value) * 10}px` }}
                  title={`Chuỗi ${value > 0 ? "trúng" : "trượt"}: ${Math.abs(value)} ngày`}
                ></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CauLoPage;

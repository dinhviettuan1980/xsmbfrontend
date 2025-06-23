
import React, { useEffect, useState } from "react";
import axios from "axios";

const weekdays = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN"];

function SpecialsPage() {
  const [grouped, setGrouped] = useState([]);

  useEffect(() => {
    const baseUrl = process.env.REACT_APP_API_BASE;
    axios.get(`${baseUrl}/api/specials/recent`).then(res => {
      const data = res.data;

      if (!data.length) return;

      const dateMap = new Map();
      data.forEach(item => dateMap.set(item.date, item));

      const dates = data.map(item => new Date(item.date));
      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));

      const startDate = new Date(minDate);
      const day = startDate.getDay();
      const offset = day === 0 ? -6 : 1 - day;
      startDate.setDate(startDate.getDate() + offset);

      const weeks = [];
      let current = new Date(startDate);

      while (current <= maxDate) {
        const week = [];
        for (let i = 0; i < 7; i++) {
          const dateStr = current.toISOString().split('T')[0];
          week.push(dateMap.get(dateStr) || null);
          current.setDate(current.getDate() + 1);
        }
        weeks.push(week);
      }

      setGrouped(weeks);
    });
  }, []);

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">Thống kê giải đặc biệt 2 tháng gần nhất</h2>
      <div className="overflow-x-auto">
        <table className="table-auto border text-[13px]">
          <thead>
            <tr className="bg-yellow-100 text-center">
              {weekdays.map(day => (
                <th key={day} className="border px-1.5 py-1 whitespace-nowrap">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grouped.map((week, i) => (
              <tr key={i}>
                {week.map((item, j) => (
                  <td key={j} className="border px-1.5 py-0.5 text-center align-top">
                    {item ? (
                      <div className="leading-snug">
                        <div className="font-bold tracking-wide">
                          <span>{item.number.slice(0, 3)}</span>
                          <span className="text-red-600">{item.number.slice(3)}</span>
                        </div>
                      </div>
                    ) : <div className="text-gray-300">—</div>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SpecialsPage;

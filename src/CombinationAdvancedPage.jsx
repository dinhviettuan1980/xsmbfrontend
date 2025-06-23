import React, { useState } from "react";
import axios from "axios";
import { CopyToClipboard } from "react-copy-to-clipboard";

function CombinationAdvancedPage() {
  const [input, setInput] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [result, setResult] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    const digits = input.trim();
    if (digits.length < 3 || digits.length > 5) {
      setResult(null);
      setError("Vui lòng nhập từ 3 đến 5 chữ số.");
      return;
    }

    setError("");

    const base = "http://13.55.124.215:8001/api";
    let url = from && to ? `${base}/combination-advanced` : `${base}/combination`;
    let params = { number: digits };
    if (from && to) {
      params.swapFrom = from;
      params.swapTo = to;
    }

    try {
      const res = await axios.get(url, { params });
      setResult(res.data);
    } catch (err) {
      setError("Lỗi khi gọi API.");
      console.error(err);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">Tổ hợp đề 5 số</h2>
      <div className="space-x-2 mb-4">
        <input
          value={input}
          style={{ width: 100 }}
          onChange={e => setInput(e.target.value)}
          placeholder="Nhập số"
          className="border p-1"
        />
        <input
          value={from}
          onChange={e => setFrom(e.target.value)}
          placeholder="Từ"
          className="border p-1 w-12"
        />
        <input
          value={to}
          onChange={e => setTo(e.target.value)}
          placeholder="Thành"
          className="border p-1 w-12"
        />
        <button
          onClick={handleSubmit}
          className="bg-blue-500 text-white px-3 py-1 rounded"
        >
          Tạo tổ hợp
        </button>
      </div>

      {error && <div className="text-red-500 mb-2">{error}</div>}

      {result && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          {["2_digit_combinations", "3_digit_combinations", "4_digit_combinations"].map((key) => {
            const list = result[key];
            if (!Array.isArray(list)) return null;

            const label =
              key === "2_digit_combinations" ? "2 chữ số" :
              key === "3_digit_combinations" ? "3 chữ số" :
              "4 chữ số";

            return (
              <div key={key} className="border rounded p-2">
                <div className="font-semibold mb-1">{label}</div>
                <div className="mb-1 break-words">{list.join(", ")}</div>
                <CopyToClipboard text={list.join(", ")} onCopy={() => setCopiedKey(key)}>
                  <button className="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-xs">
                    📋 Copy
                  </button>
                </CopyToClipboard>
                {copiedKey === key && <span className="text-green-600 ml-2 text-xs">Đã sao chép!</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CombinationAdvancedPage;

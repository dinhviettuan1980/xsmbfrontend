import React, { useState } from "react";
import { Helmet } from 'react-helmet-async';
import { CopyToClipboard } from "react-copy-to-clipboard";
import apiClient from './utils/apiClient';

function CombinationGeneratorPage() {
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [cang3, setCang3] = useState("");
  const [cang4, setCang4] = useState("");
  const [additionalNumbers, setAdditionalNumbers] = useState("");
  const [results, setResults] = useState([]);
  const [copied, setCopied] = useState(false);

  const groups = [
    "chan_chan", "le_le", "chan_le", "le_chan", "kep_bang",
    "to_to", "be_be", "to_be", "be_to",
    "tong_0", "tong_1", "tong_2", "tong_3", "tong_4",
    "tong_5", "tong_6", "tong_7", "tong_8", "tong_9"
  ];

  const handleGenerate = async () => {
    let allResults = [];

    // Sinh từ nhóm đã chọn
    for (const group of selectedGroups) {
      try {
        const payload = { group };
        if (cang3 !== "") payload.cang3 = parseInt(cang3);
        if (cang4 !== "") payload.cang4 = parseInt(cang4);

        const baseUrl = process.env.REACT_APP_API_BASE;
        const res = await apiClient.post(`${baseUrl}/api/generate-combinations`, payload);
        const groupResults = res.data.map(r => r.fourDigit || r.threeDigit || r.twoDigit);
        allResults = allResults.concat(groupResults);
      } catch (error) {
        console.error(`Error generating for group ${group}:`, error);
      }
    }

    // Sinh từ dãy số nhập tay
    if (additionalNumbers.trim() !== "") {
      const manualNumbers = additionalNumbers.split(",").map(x => x.trim()).filter(Boolean);

      manualNumbers.forEach(num => {
        if (cang4 !== "") {
          allResults.push(`${cang4}${cang3}${num}`);
        } else if (cang3 !== "") {
          allResults.push(`${cang3}${num}`);
        } else {
          allResults.push(num);
        }
      });
    }

    // Lọc trùng
    const uniqueResults = Array.from(new Set(allResults));

    setResults(uniqueResults);
  };

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="p-4">
      <Helmet>
        <title>Sinh tổ hợp nhóm - XSMB</title>
        <meta name="description" content="Công cụ sinh tổ hợp theo nhóm số cho xổ số miền Bắc." />
      </Helmet>

      <div className="mb-4">
        <label className="block mb-2 font-semibold">Chọn nhóm:</label>
        <select
          multiple
          size={10}
          value={selectedGroups}
          onChange={(e) => {
            const options = Array.from(e.target.selectedOptions, (option) => option.value);
            setSelectedGroups(options);
          }}
          className="w-full border rounded p-2"
        >
          {groups.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4">
        <div>
          <label className="block mb-2 font-semibold">Càng 3 (không bắt buộc):</label>
          <input
            type="number"
            value={cang3}
            onChange={(e) => setCang3(e.target.value)}
            className="w-full border rounded p-2"
            placeholder="Nhập số càng 3"
          />
        </div>
        <div>
          <label className="block mb-2 font-semibold">Càng 4 (không bắt buộc):</label>
          <input
            type="number"
            value={cang4}
            onChange={(e) => setCang4(e.target.value)}
            className="w-full border rounded p-2"
            placeholder="Nhập số càng 4"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block mb-2 font-semibold">Nhập thêm dãy số (phân cách bằng dấu phẩy):</label>
        <input
          type="text"
          value={additionalNumbers}
          onChange={(e) => setAdditionalNumbers(e.target.value)}
          className="w-full border rounded p-2"
          placeholder="VD: 01,34,68"
        />
      </div>

      <button
        onClick={handleGenerate}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
      >
        🎯 Sinh kết quả
      </button>

      {results.length > 0 && (
        <div className="mt-6">
          <h3 className="text-md font-semibold mb-2">Kết quả ({results.length} số):</h3>
          <textarea
            className="w-full border rounded p-2 text-sm"
            rows={5}  // ← đã chỉnh ngắn
            readOnly
            value={results.join(", ")}
          />

          <div className="mt-2 flex items-center">
            <CopyToClipboard
              text={results.join(", ")}
              onCopy={handleCopy}
            >
              <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">
                📋 Copy kết quả
              </button>
            </CopyToClipboard>

            {copied && <span className="text-green-600 ml-4 text-sm">Đã sao chép!</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export default CombinationGeneratorPage;

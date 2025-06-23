import React, { useEffect, useState } from "react";
import axios from "axios";
import { CopyToClipboard } from "react-copy-to-clipboard";

function ClassifyPage() {
  const [data, setData] = useState({});
  const [copiedKey, setCopiedKey] = useState(null);

  useEffect(() => {
    axios.get("http://13.55.124.215:8001/api/classify-two-digit").then(res => setData(res.data));
  }, []);

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">Phân loại số 2 chữ số</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        {Object.entries(data)
          .filter(([key]) => !key.endsWith("_missing")) // chỉ hiển thị nhóm chính, không hiển thị missing riêng lẻ
          .map(([key, values]) => {
            const joined = values.join(", ");
            const missingKey = `${key}_missing`;
            const missingDays = data[missingKey];

            return (
              <div key={key} className="border rounded p-2">
                <div className="font-semibold mb-1">
                  {key}
                  {missingDays !== undefined && (
                    <span className="text-red-500 text-xs ml-2">({missingDays} ngày)</span>
                  )}
                </div>
                <div className="mb-1 break-words">{joined}</div>
                <CopyToClipboard text={joined} onCopy={() => setCopiedKey(key)}>
                  <button className="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-xs">
                    📋 Copy
                  </button>
                </CopyToClipboard>
                {copiedKey === key && (
                  <span className="text-green-600 ml-2 text-xs">Đã sao chép!</span>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}

export default ClassifyPage;

import React, { useState, useRef } from "react";
import axios from "axios";

function CauDePage() {
  const [numbers, setNumbers] = useState("");
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    setUploading(true);
    setNumbers("");

    try {
      const response = await axios.post("http://13.55.124.215:8001/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setNumbers(response.data.numbers || "Không tìm thấy số nào");

    } catch (err) {
      setNumbers("Lỗi khi xử lý ảnh.");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">🎯 Trang Cầu Đề</h2>

      <div className="flex gap-2 mb-4">
        {/* Nút upload từ thư viện */}
        <button
          onClick={() => fileInputRef.current.click()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          📁 Upload ảnh
        </button>

        {/* Nút chụp ảnh */}
        <button
          onClick={() => cameraInputRef.current.click()}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          📷 Chụp ảnh
        </button>
      </div>

      {/* Input ẩn để chọn ảnh từ thư viện */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Input ẩn để bật camera chụp ảnh */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {uploading && <p className="text-blue-600">Đang xử lý ảnh...</p>}

      {numbers && (
        <div className="mt-2 p-2 bg-gray-100 rounded">
          <p className="font-semibold">📌 Các số nhận diện được:</p>
          <p className="text-green-700">{numbers}</p>
        </div>
      )}
    </div>
  );
}

export default CauDePage;

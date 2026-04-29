import React, { useState, useRef } from "react";
import { Helmet } from 'react-helmet-async';
import apiClient from './utils/apiClient';

function CauDePage() {
  const [numbers, setNumbers] = useState("");
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null); // <== thêm state ảnh

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Hiển thị ảnh preview
    const imageURL = URL.createObjectURL(file);
    setPreviewImage(imageURL); // <== set ảnh hiển thị

    const formData = new FormData();
    formData.append("image", file);

    setUploading(true);
    setNumbers("");

    try {
      const response = await apiClient.post(`${process.env.REACT_APP_API_BASE}/upload`, formData, {
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
      <Helmet>
        <title>Nhận Dạng số - XSMB</title>
        <meta name="description" content="Công cụ nhận dạng và phân tích số trong xổ số miền Bắc." />
      </Helmet>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => fileInputRef.current.click()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          📁 Upload ảnh
        </button>

        <button
          onClick={() => cameraInputRef.current.click()}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          📷 Chụp ảnh
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

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
        <div className="mt-4 p-3 bg-gray-100 rounded shadow">
          <p className="font-semibold mb-1">📌 Các số nhận diện được:</p>
          <p className="text-green-700">{numbers}</p>
        </div>
      )}
      
      {previewImage && (
        <div className="mt-4">
          <p className="text-sm text-gray-500 mb-1">Ảnh bạn vừa gửi:</p>
          <img src={previewImage} alt="Preview" className="max-w-full h-auto rounded shadow" />
        </div>
      )}

    </div>
  );
}

export default CauDePage;

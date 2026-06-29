import { useState, useRef } from 'react';

// Service OCR (Hugging Face Space). Có thể override bằng REACT_APP_OCR_API.
const OCR_API = process.env.REACT_APP_OCR_API || 'https://tuandv80-ocr-numbers.hf.space';

const TYPE_COLOR = {
  number: 'bg-sky-100 text-sky-700',
  date: 'bg-pink-100 text-pink-700',
  time: 'bg-amber-100 text-amber-700',
  address_number: 'bg-emerald-100 text-emerald-700',
  phone: 'bg-violet-100 text-violet-700',
  age: 'bg-rose-100 text-rose-700',
  unknown: 'bg-gray-100 text-gray-600',
};

export default function OcrNumbersPage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [numbers, setNumbers] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const inputRef = useRef();

  const pick = (f) => {
    if (!f) return;
    setFile(f);
    setNumbers(null);
    setError('');
    setPreview(URL.createObjectURL(f));
  };

  const onDrop = (e) => {
    e.preventDefault();
    pick(e.dataTransfer.files?.[0]);
  };

  const run = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    setNumbers(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch(`${OCR_API}/ocr`, { method: 'POST', body: fd });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || `HTTP ${r.status}`);
      setNumbers(data.numbers || []);
    } catch (e) {
      setError(e.message || 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  const copyAll = () => {
    if (!numbers?.length) return;
    navigator.clipboard.writeText(numbers.map((n) => n.value).join(', '));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const counts = (numbers || []).reduce((m, n) => ((m[n.type] = (m[n.type] || 0) + 1), m), {});

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-bold mb-1">🔢 OCR — trích số trong ảnh</h1>
      <p className="text-sm text-gray-500 mb-4">
        Tải ảnh lên, hệ thống đọc và trả về <b>tất cả con số</b> kèm loại (năm, ngày, giờ, số nhà, tuổi…).
        Đọc được cả chữ viết tay.
      </p>

      {/* Upload */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center text-gray-500 cursor-pointer hover:border-blue-500 hover:text-blue-600"
      >
        📁 Bấm hoặc kéo-thả ảnh vào đây
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => pick(e.target.files?.[0])}
        />
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={run}
          disabled={!file || loading}
          className="bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {loading ? 'Đang nhận diện…' : 'Nhận diện'}
        </button>
        {file && <span className="text-sm text-gray-500 truncate">{file.name}</span>}
      </div>

      {loading && (
        <p className="text-sm text-gray-400 mt-2">
          Lần đầu gọi sau khi service ngủ có thể chậm ~30s, vui lòng đợi…
        </p>
      )}
      {error && <p className="text-sm text-red-600 mt-2">Lỗi: {error}</p>}

      <div className="mt-4 grid md:grid-cols-2 gap-4">
        {/* Ảnh xem trước */}
        {preview && (
          <div>
            <img src={preview} alt="preview" className="w-full rounded-lg border" />
          </div>
        )}

        {/* Kết quả */}
        {numbers && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm">
                Tìm thấy <b>{numbers.length}</b> số
              </div>
              <button
                onClick={copyAll}
                className="text-sm text-blue-600 hover:underline"
                disabled={!numbers.length}
              >
                {copied ? '✓ Đã copy' : 'Copy tất cả'}
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3">
              {Object.entries(counts).map(([t, c]) => (
                <span key={t} className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLOR[t] || TYPE_COLOR.unknown}`}>
                  {t}: {c}
                </span>
              ))}
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Giá trị</th>
                    <th className="text-left px-3 py-2 font-medium">Loại</th>
                    <th className="text-left px-3 py-2 font-medium">Độ tin</th>
                  </tr>
                </thead>
                <tbody>
                  {numbers.map((n, i) => (
                    <tr key={i} className="border-t" title={n.context || ''}>
                      <td className="px-3 py-1.5 font-semibold tabular-nums">{n.value}</td>
                      <td className="px-3 py-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLOR[n.type] || TYPE_COLOR.unknown}`}>
                          {n.type}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-gray-500">{Math.round((n.confidence || 0) * 100)}%</td>
                    </tr>
                  ))}
                  {numbers.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-3 py-3 text-center text-gray-400">
                        Không tìm thấy số nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

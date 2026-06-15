import { useState, useEffect, useRef, useMemo } from 'react';

const API = process.env.REACT_APP_API_BASE;
const PAGE_SIZE = 10;

function fmtSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

export default function ConvertPage() {
  const [data, setData] = useState({ sourceFiles: [], mp3Files: [], jobs: {} });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [email, setEmail] = useState('');
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const fileInputRef = useRef();
  const imageInputRef = useRef();

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/convert/files`);
      setData(await r.json());
    } catch (e) {
      showToast('Lỗi tải danh sách: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const showToast = (msg, type = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) return showToast('Chọn file trước', 'error');
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('email', email);
    try {
      const r = await fetch(`${API}/convert/upload`, { method: 'POST', body: fd });
      const res = await r.json();
      if (res.ok) {
        showToast(`Đã tải lên "${res.filename}" — đang chuyển đổi nền`);
        fileInputRef.current.value = '';
        setTimeout(load, 1500);
      } else {
        showToast(res.error || 'Lỗi', 'error');
      }
    } catch (e) {
      showToast('Lỗi upload: ' + e.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleUploadImages = async (e) => {
    e.preventDefault();
    const files = imageInputRef.current?.files;
    if (!files || files.length === 0) return showToast('Chọn ít nhất 1 ảnh', 'error');
    setUploadingImages(true);
    const fd = new FormData();
    Array.from(files).forEach(f => fd.append('files', f));
    fd.append('email', email);
    try {
      const r = await fetch(`${API}/convert/upload-images`, { method: 'POST', body: fd });
      const res = await r.json();
      if (res.ok) {
        showToast(`Đã gửi ${res.count} ảnh — đang OCR và chuyển đổi nền`);
        imageInputRef.current.value = '';
        setTimeout(load, 1500);
      } else {
        showToast(res.error || 'Lỗi', 'error');
      }
    } catch (e) {
      showToast('Lỗi: ' + e.message, 'error');
    } finally {
      setUploadingImages(false);
    }
  };

  const startConvert = async (filename) => {
    try {
      const r = await fetch(`${API}/convert/start/${encodeURIComponent(filename)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const res = await r.json();
      if (res.ok) {
        showToast(`Đang chuyển đổi "${filename}" — thông báo qua Telegram khi xong`);
        setTimeout(load, 800);
      } else {
        showToast(res.error || 'Lỗi', 'error');
      }
    } catch (e) {
      showToast('Lỗi: ' + e.message, 'error');
    }
  };

  // Build unified list: source files + orphan MP3s (no source)
  const unified = useMemo(() => {
    const mp3Map = {};
    (data.mp3Files || []).forEach(f => { mp3Map[f.name] = f; });

    const jobsByFile = {};
    Object.values(data.jobs || {}).forEach(j => {
      if (!jobsByFile[j.filename] || j.startedAt > jobsByFile[j.filename].startedAt) {
        jobsByFile[j.filename] = j;
      }
    });

    const rows = (data.sourceFiles || []).map(f => {
      const latestJob = jobsByFile[f.name];
      return {
        key: f.name,
        srcName: f.name,
        srcSize: f.size,
        srcMtime: f.mtime,
        mp3Name: f.hasMp3 ? f.mp3Name : null,
        mp3Size: f.hasMp3 ? (mp3Map[f.mp3Name]?.size || null) : null,
        runningJob: latestJob?.status === 'running' ? latestJob : null,
        errorJob: latestJob?.status === 'error' ? latestJob : null,
      };
    });

    // MP3s that have no source file
    const srcNames = new Set((data.sourceFiles || []).map(f => f.mp3Name));
    (data.mp3Files || []).forEach(f => {
      if (!srcNames.has(f.name)) {
        rows.push({
          key: f.name,
          srcName: null,
          srcSize: null,
          srcMtime: f.mtime,
          mp3Name: f.name,
          mp3Size: f.size,
          runningJob: null,
        });
      }
    });

    return rows;
  }, [data]);

  const filtered = useMemo(() => {
    if (!search.trim()) return unified;
    const q = search.toLowerCase();
    return unified.filter(r =>
      (r.srcName || '').toLowerCase().includes(q) ||
      (r.mp3Name || '').toLowerCase().includes(q)
    );
  }, [unified, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Reset to page 1 on search change
  useEffect(() => { setPage(1); }, [search]);

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-10">
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl shadow-lg text-sm font-medium ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Upload form */}
      <div className="bg-white rounded-2xl shadow p-5">
        <h2 className="font-bold text-gray-800 text-base mb-4">📤 Upload & Chuyển đổi</h2>
        <form onSubmit={handleUpload} className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.webp,.bmp,.tiff"
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700"
          />
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email nhận link (tuỳ chọn)"
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-red-400"
            />
            <button
              type="submit"
              disabled={uploading}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 whitespace-nowrap"
            >
              {uploading ? '...' : '🚀 Upload'}
            </button>
          </div>
          <p className="text-xs text-gray-400">Hỗ trợ: PDF, DOCX, TXT, ảnh đơn (JPG/PNG/WEBP) · Không nhập email → thông báo về Telegram</p>
        </form>
      </div>

      {/* Multi-image upload */}
      <div className="bg-white rounded-2xl shadow p-5">
        <h2 className="font-bold text-gray-800 text-base mb-1">🖼️ Nhiều ảnh → 1 MP3</h2>
        <p className="text-xs text-gray-400 mb-4">Chọn nhiều ảnh (chụp màn hình, scan...), OCR ghép lại thành 1 file âm thanh</p>
        <form onSubmit={handleUploadImages} className="space-y-3">
          <input
            ref={imageInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.bmp,.tiff"
            multiple
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700"
          />
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email nhận link (tuỳ chọn)"
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400"
            />
            <button
              type="submit"
              disabled={uploadingImages}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
            >
              {uploadingImages ? '...' : '🖼️ Convert ảnh'}
            </button>
          </div>
        </form>
      </div>

      {/* Unified file list */}
      <div className="bg-white rounded-2xl shadow p-5">
        {/* Header: search + reload */}
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm kiếm file..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-red-400"
            />
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:text-gray-700 text-base"
            title="Tải lại"
          >
            {loading ? '·' : '↻'}
          </button>
        </div>

        {/* Count */}
        <div className="text-xs text-gray-400 mb-3">
          {filtered.length} file{search ? ` (lọc từ ${unified.length})` : ''}
        </div>

        {/* Column headers */}
        {pageItems.length > 0 && (
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-1 mb-1">
            <div className="text-xs font-semibold text-gray-400">File nguồn · MP3</div>
            <div className="text-xs font-semibold text-gray-400 text-right">Dung lượng</div>
            <div className="text-xs font-semibold text-gray-400 text-right">Thao tác</div>
          </div>
        )}

        {/* Rows */}
        {pageItems.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            {search ? 'Không tìm thấy file nào' : 'Chưa có file nào'}
          </p>
        ) : (
          <div className="divide-y divide-gray-50">
            {pageItems.map(row => (
              <div key={row.key} className="py-2.5 flex items-start gap-2">
                {/* File info */}
                <div className="flex-1 min-w-0 space-y-0.5">
                  {row.srcName ? (
                    <div className="text-sm font-medium text-gray-700 truncate" title={row.srcName}>
                      📄 {row.srcName}
                    </div>
                  ) : null}
                  {row.mp3Name ? (
                    <div className="text-sm text-gray-500 truncate" title={row.mp3Name}>
                      🎵 {row.mp3Name}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-300 italic">chưa có MP3</div>
                  )}
                  <div className="text-xs text-gray-400">
                    {new Date(row.srcMtime).toLocaleDateString('vi-VN')}
                  </div>
                </div>

                {/* Size column */}
                <div className="text-right space-y-0.5 flex-shrink-0">
                  <div className="text-xs text-gray-400">{fmtSize(row.srcSize)}</div>
                  <div className="text-xs text-gray-400">{fmtSize(row.mp3Size)}</div>
                </div>

                {/* Action column */}
                <div className="flex-shrink-0 flex flex-col items-end gap-1">
                  {row.srcName && (
                    <a
                      href={`${API}/convert/data/${encodeURIComponent(row.srcName)}`}
                      download
                      className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 font-semibold hover:bg-gray-200"
                    >
                      ↓ Nguồn
                    </a>
                  )}
                  {row.mp3Name && (
                    <a
                      href={`${API}/convert/output/${encodeURIComponent(row.mp3Name)}`}
                      download
                      className="text-xs px-2.5 py-1 rounded-lg bg-green-50 text-green-700 font-semibold hover:bg-green-100"
                    >
                      ↓ MP3
                    </a>
                  )}
                  {row.runningJob ? (
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-amber-50 text-amber-600 font-medium">
                      ⏳ Đang xử lý
                    </span>
                  ) : row.errorJob ? (
                    <button
                      onClick={() => startConvert(row.srcName)}
                      title={row.errorJob.log || 'Lỗi không xác định'}
                      className="text-xs px-2.5 py-1 rounded-lg bg-red-100 text-red-700 font-semibold hover:bg-red-200"
                    >
                      ⚠️ Thử lại
                    </button>
                  ) : !row.mp3Name && row.srcName ? (
                    <button
                      onClick={() => startConvert(row.srcName)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-red-50 text-red-700 font-semibold hover:bg-red-100"
                    >
                      ▶ Convert
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40"
            >
              ← Trước
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === '…' ? (
                    <span key={`ellipsis-${i}`} className="px-1 text-xs text-gray-400">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-7 h-7 rounded-lg text-xs font-semibold ${
                        p === safePage ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
            </div>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40"
            >
              Sau →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

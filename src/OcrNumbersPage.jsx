import { useState, useRef, useMemo } from 'react';
import apiClient from './utils/apiClient';

// Service OCR cáo phó (Hugging Face Space). Override bằng REACT_APP_OCR_API.
const OCR_API = process.env.REACT_APP_OCR_API || 'https://tuandv80-ocr-numbers.hf.space';

// 2 số cuối, nếu 1 chữ số thì thêm 0 đằng trước (5 -> 05).
const last2 = (v) => {
  const s = String(v || '').replace(/\D/g, '').slice(-2);
  return s.length === 1 ? '0' + s : s;
};

const CARD_FIELDS = [
  ['person_name', 'Tên người mất'],
  ['birth_year', 'Năm sinh'],
  ['death_date', 'Ngày mất'],
  ['death_time', 'Giờ mất'],
  ['age', 'Hưởng thọ'],
  ['address', 'Địa chỉ'],
  ['visitation_date', 'Lễ viếng (ngày)'],
  ['visitation_time', 'Lễ viếng (giờ)'],
  ['funeral_date', 'Lễ truy điệu (ngày)'],
  ['funeral_time', 'Lễ truy điệu (giờ)'],
];

export default function OcrNumbersPage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null); // JSON /obituary
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Nguồn tư vấn lô (từ backend xsmb)
  const [ongPhong, setOngPhong] = useState([]);
  const [pascal, setPascal] = useState([]);
  const [weekdayTop6, setWeekdayTop6] = useState([]);
  const [absentMap, setAbsentMap] = useState({});

  // TTS
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [mp3Loading, setMp3Loading] = useState(false);

  const inputRef = useRef();
  const cameraRef = useRef();

  const pick = (f) => {
    if (!f) return;
    stopSpeak();
    setFile(f); setResult(null); setError('');
    setPreview(URL.createObjectURL(f));
    run(f); // tự nhận diện ngay, không cần bấm nút
  };
  const onDrop = (e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0]); };

  const fetchLotteryContext = async () => {
    try {
      const jsDay = new Date().getDay();
      const vnDay = jsDay === 0 ? 8 : jsDay + 1;
      const [phong, pas, wd, absent] = await Promise.all([
        apiClient.get('/api/cau-ong-phong').catch(() => ({ data: {} })),
        apiClient.get('/api/cau-lo-pascal').catch(() => ({ data: {} })),
        apiClient.get('/api/statistics/by-weekday', { params: { days: 365 } }).catch(() => ({ data: {} })),
        apiClient.get('/api/statistics/longest-absent', { params: { days: 60 } }).catch(() => ({ data: [] })),
      ]);
      setOngPhong(phong.data?.predictions || []);
      setPascal(pas.data?.predictions || []);
      const dayData = wd.data?.[vnDay] || {};
      setWeekdayTop6(Object.entries(dayData).map(([n, c]) => ({ number: n, count: c }))
        .sort((a, b) => b.count - a.count).slice(0, 6).map((x) => x.number));
      const m = {}; (absent.data || []).forEach((r) => { m[r.number] = r.days_absent; });
      setAbsentMap(m);
    } catch { /* tư vấn vẫn hiện dù thiếu nguồn */ }
  };

  const run = async (picked) => {
    const target = picked instanceof File ? picked : file; // tránh nhận nhầm event từ onClick
    if (!target) return;
    stopSpeak();
    setLoading(true); setError(''); setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', target);
      const r = await fetch(`${OCR_API}/obituary`, { method: 'POST', body: fd });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || `HTTP ${r.status}`);
      setResult(data);
      fetchLotteryContext();
    } catch (e) {
      setError(e.message || 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  // ---- Số dự đoán: 2 số cuối + dedupe ----
  const ocrNums = useMemo(() => {
    const set = new Set();
    (result?.lottery_numbers || []).forEach((n) => { const v = last2(n.value); if (v.length === 2) set.add(v); });
    return [...set];
  }, [result]);

  const phongSet = useMemo(() => new Set(ongPhong.map(last2)), [ongPhong]);
  const pascalSet = useMemo(() => new Set(pascal.map(last2)), [pascal]);
  const weekdaySet = useMemo(() => new Set(weekdayTop6.map(last2)), [weekdayTop6]);

  const tags = (num) => {
    const t = [];
    if (weekdaySet.has(num)) t.push('Thứ');
    if (phongSet.has(num)) t.push('Phong');
    if (pascalSet.has(num)) t.push('Pascal');
    return t;
  };
  const recommended = ocrNums.filter((n) => tags(n).length > 0);

  // ---- TTS Web Speech ----
  const speak = () => {
    const text = result?.speech_text;
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'vi-VN';
    u.rate = 0.95;
    u.onend = () => { setSpeaking(false); setPaused(false); };
    u.onerror = () => { setSpeaking(false); setPaused(false); };
    window.speechSynthesis.speak(u);
    setSpeaking(true); setPaused(false);
  };
  const pauseSpeak = () => { window.speechSynthesis?.pause(); setPaused(true); };
  const resumeSpeak = () => { window.speechSynthesis?.resume(); setPaused(false); };
  const stopSpeak = () => { window.speechSynthesis?.cancel(); setSpeaking(false); setPaused(false); };

  const downloadMp3 = async () => {
    if (!result?.speech_text) return;
    setMp3Loading(true);
    try {
      const r = await fetch(`${OCR_API}/tts`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: result.speech_text }),
      });
      if (!r.ok) throw new Error('TTS lỗi');
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'cao-pho.mp3'; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (e) { setError('Tải MP3 lỗi: ' + e.message); }
    finally { setMp3Loading(false); }
  };

  const Chip = ({ num }) => {
    const t = tags(num);
    const hot = t.length > 0;
    return (
      <span className={`inline-flex items-baseline px-2 py-1 rounded-lg text-sm font-bold border ${hot ? 'bg-red-50 border-red-300 text-red-700' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
        {num}
        {absentMap[num] > 0 && <sup className="text-orange-500 text-[10px] font-bold ml-0.5">{absentMap[num]}</sup>}
        {t.length > 0 && <span className="ml-1 text-[9px] font-semibold text-red-500">{t.join('·')}</span>}
      </span>
    );
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-bold mb-1">🪦 OCR cáo phó & tư vấn lô</h1>
      <p className="text-sm text-gray-500 mb-4">
        Chụp/chọn ảnh cáo phó → nhận diện thông tin, đọc bằng giọng nói, và gợi ý số đánh.
      </p>

      {/* Upload */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center text-gray-500 cursor-pointer hover:border-blue-500 hover:text-blue-600"
      >
        📁 Bấm hoặc kéo-thả ảnh vào đây
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
      </div>

      <div className="mt-2 flex items-center gap-2">
        <button type="button" onClick={() => cameraRef.current?.click()}
          className="flex-1 border border-gray-300 rounded-xl py-2.5 text-gray-600 hover:border-blue-500 hover:text-blue-600 font-medium">
          📷 Chụp ảnh
        </button>
        <button type="button" onClick={() => inputRef.current?.click()}
          className="flex-1 border border-gray-300 rounded-xl py-2.5 text-gray-600 hover:border-blue-500 hover:text-blue-600 font-medium">
          🖼️ Chọn ảnh
        </button>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => pick(e.target.files?.[0])} />
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button onClick={() => run()} disabled={!file || loading}
          className="bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg disabled:opacity-50">
          {loading ? 'Đang nhận diện…' : 'Nhận diện lại'}
        </button>
        {file && <span className="text-sm text-gray-500 truncate">{file.name}</span>}
      </div>

      {loading && <p className="text-sm text-gray-400 mt-2">Lần đầu gọi sau khi service ngủ có thể chậm ~30s…</p>}
      {error && <p className="text-sm text-red-600 mt-2">Lỗi: {error}</p>}

      {preview && <img src={preview} alt="preview" className="w-full rounded-lg border mt-4" />}

      {result && (
        <div className="mt-4 space-y-4">
          {/* TTS + Map */}
          <div className="flex flex-wrap gap-2">
            {!speaking && (
              <button onClick={speak} className="bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-semibold">▶️ Nghe cáo phó</button>
            )}
            {speaking && !paused && (
              <button onClick={pauseSpeak} className="bg-amber-500 text-white px-3 py-2 rounded-lg text-sm font-semibold">⏸ Tạm dừng</button>
            )}
            {speaking && paused && (
              <button onClick={resumeSpeak} className="bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-semibold">▶️ Tiếp tục</button>
            )}
            {speaking && (
              <button onClick={stopSpeak} className="bg-gray-500 text-white px-3 py-2 rounded-lg text-sm font-semibold">⏹ Dừng</button>
            )}
            <button onClick={downloadMp3} disabled={mp3Loading} className="border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
              {mp3Loading ? '⏳ Đang tạo…' : '⬇️ Tải MP3'}
            </button>
            {result.map_url && (
              <a href={result.map_url} target="_blank" rel="noreferrer" className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-semibold">📍 Mở bản đồ</a>
            )}
          </div>

          {/* Card thông tin */}
          <div className="border rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-600">Thông tin nhận diện</div>
            <table className="w-full text-sm">
              <tbody>
                {CARD_FIELDS.map(([k, label]) => (
                  <tr key={k} className="border-t">
                    <td className="px-3 py-1.5 text-gray-500 w-2/5">{label}</td>
                    <td className="px-3 py-1.5 font-medium text-gray-800">{result[k] || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tư vấn lô */}
          <div className="border rounded-xl p-3">
            <div className="text-sm font-semibold text-gray-700 mb-2">🔢 Số nhận từ ảnh (2 số cuối) — <span className="text-orange-500">số mũ = ngày gan</span></div>
            {ocrNums.length === 0 ? (
              <div className="text-gray-400 text-sm">Không có số.</div>
            ) : (
              <div className="flex flex-wrap gap-1.5">{ocrNums.map((n) => <Chip key={n} num={n} />)}</div>
            )}
            {recommended.length > 0 && (
              <div className="mt-3">
                <div className="text-xs font-semibold text-red-600 mb-1">⭐ Trùng cầu/thứ — nên đánh:</div>
                <div className="flex flex-wrap gap-1.5">{recommended.map((n) => <Chip key={n} num={n} />)}</div>
              </div>
            )}
            <div className="mt-3 pt-2 border-t text-xs text-gray-500 space-y-0.5">
              <div>🃏 Cầu Ông Phong: <b>{ongPhong.join(', ') || '—'}</b></div>
              <div>🧮 Cầu Pascal: <b>{pascal.join(', ') || '—'}</b></div>
              <div>📆 6 số hay ra theo thứ: <b>{weekdayTop6.join(', ') || '—'}</b></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

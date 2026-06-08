import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = process.env.REACT_APP_API_BASE || '';
const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']; // index = day number (CN=0..T7=6)

// ---- helpers gọi API (secret truyền qua query, khớp zaloAuth ở backend) ----
function useSecret() {
  const [secret, setSecret] = useState(() => localStorage.getItem('zalo_secret') || '');
  const save = (v) => { setSecret(v); localStorage.setItem('zalo_secret', v); };
  return [secret, save];
}

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  if (isNaN(diff)) return '—';
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'vừa xong';
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}

export default function ZaloAdminPage() {
  const [secret, setSecret] = useSecret();
  const [secretInput, setSecretInput] = useState(secret);
  const [status, setStatus] = useState(null);
  const [statusErr, setStatusErr] = useState('');
  const [loading, setLoading] = useState(false);

  // QR
  const [qrUrl, setQrUrl] = useState('');
  const [qrWaiting, setQrWaiting] = useState(false);
  const qrTimer = useRef(null);

  // friends
  const [friends, setFriends] = useState([]);
  const [friendsUpdatedAt, setFriendsUpdatedAt] = useState(null);
  const [friendSearch, setFriendSearch] = useState('');
  const [friendsLoading, setFriendsLoading] = useState(false);

  // schedules
  const [schedules, setSchedules] = useState([]);
  const [form, setForm] = useState(null); // {id?, targetId, message, time, days[], enabled}

  const api = useCallback(async (path, opts = {}) => {
    const sep = path.includes('?') ? '&' : '?';
    const url = `${API_BASE}${path}${sep}secret=${encodeURIComponent(secret)}`;
    const res = await fetch(url, {
      ...opts,
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    });
    if (!res.ok && res.status !== 202) {
      let msg = `HTTP ${res.status}`;
      try { const j = await res.json(); if (j.error) msg = j.error; } catch { /* noop */ }
      throw new Error(msg);
    }
    return res;
  }, [secret]);

  const loadStatus = useCallback(async () => {
    if (!secret) return;
    setLoading(true); setStatusErr('');
    try {
      const r = await api('/zalo/health');
      setStatus(await r.json());
    } catch (e) {
      setStatusErr(e.message);
      setStatus(null);
    } finally { setLoading(false); }
  }, [api, secret]);

  const loadFriends = useCallback(async (refresh = false) => {
    if (!secret) return;
    setFriendsLoading(true);
    try {
      const r = await api(`/zalo/friends${refresh ? '?refresh=1' : ''}`);
      const d = await r.json();
      setFriends(d.friends || []);
      setFriendsUpdatedAt(d.updatedAt);
    } catch { /* noop */ } finally { setFriendsLoading(false); }
  }, [api, secret]);

  const loadSchedules = useCallback(async () => {
    if (!secret) return;
    try {
      const r = await api('/zalo/schedules');
      setSchedules(await r.json());
    } catch { /* noop */ }
  }, [api, secret]);

  useEffect(() => {
    if (!secret) return;
    loadStatus(); loadFriends(); loadSchedules();
    const t = setInterval(loadStatus, 30000); // tự refresh trạng thái mỗi 30s
    return () => clearInterval(t);
  }, [secret, loadStatus, loadFriends, loadSchedules]);

  useEffect(() => () => { if (qrTimer.current) clearInterval(qrTimer.current); }, []);

  // ---- QR login ----
  const startLogin = async () => {
    try {
      await api('/zalo/login');
      setQrWaiting(true); setQrUrl('');
      let tries = 0;
      if (qrTimer.current) clearInterval(qrTimer.current);
      qrTimer.current = setInterval(async () => {
        tries++;
        try {
          const r = await api('/zalo/qr');
          if (r.status === 200) {
            const blob = await r.blob();
            setQrUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(blob); });
            setQrWaiting(false);
          }
        } catch { /* noop */ }
        loadStatus();
        // dừng khi đã đăng nhập lại thành công hoặc quá 40 lần (~100s)
        if ((status && status.sessionValid && qrUrl) || tries > 40) {
          clearInterval(qrTimer.current); qrTimer.current = null; setQrWaiting(false);
        }
      }, 2500);
    } catch (e) { alert('Lỗi tạo QR: ' + e.message); }
  };

  const verifyNow = async () => {
    try { await api('/zalo/verify'); loadStatus(); }
    catch (e) { alert('Lỗi: ' + e.message); }
  };

  // ---- schedules ----
  const emptyForm = { targetId: '', targetName: '', message: '', time: '08:00', days: [], enabled: true };
  const saveForm = async () => {
    if (!form.targetId) return alert('Hãy chọn người nhận');
    if (!form.message.trim()) return alert('Hãy nhập nội dung');
    const friend = friends.find((f) => f.userId === form.targetId);
    const body = { ...form, targetName: friend ? friend.name : form.targetName };
    try {
      if (form.id) await api(`/zalo/schedules/${form.id}`, { method: 'PUT', body: JSON.stringify(body) });
      else await api('/zalo/schedules', { method: 'POST', body: JSON.stringify(body) });
      setForm(null); loadSchedules();
    } catch (e) { alert('Lỗi lưu lịch: ' + e.message); }
  };
  const toggleEnabled = async (s) => {
    try { await api(`/zalo/schedules/${s.id}`, { method: 'PUT', body: JSON.stringify({ enabled: !s.enabled }) }); loadSchedules(); }
    catch (e) { alert(e.message); }
  };
  const delSchedule = async (s) => {
    if (!window.confirm('Xoá lịch này?')) return;
    try { await api(`/zalo/schedules/${s.id}`, { method: 'DELETE' }); loadSchedules(); }
    catch (e) { alert(e.message); }
  };
  const sendNow = async (s) => {
    try {
      const r = await api('/zalo/send', { method: 'POST', body: JSON.stringify({ targetId: s.targetId, message: s.message }) });
      const d = await r.json();
      alert(d.ok ? '✅ Đã gửi' : '❌ ' + (d.error || 'thất bại'));
    } catch (e) { alert(e.message); }
  };

  const filteredFriends = friends.filter((f) =>
    !friendSearch || (f.name || '').toLowerCase().includes(friendSearch.toLowerCase()));

  // ---- chưa có secret ----
  if (!secret) {
    return (
      <div className="max-w-md mx-auto mt-10 bg-white rounded-2xl shadow p-6">
        <h2 className="text-lg font-bold mb-3">🔐 Quản trị Zalo Bot</h2>
        <p className="text-sm text-gray-500 mb-3">Nhập mã bí mật (NOTIFY_SECRET) để truy cập.</p>
        <input className="w-full border rounded-lg px-3 py-2 mb-3" type="password"
          value={secretInput} onChange={(e) => setSecretInput(e.target.value)} placeholder="NOTIFY_SECRET" />
        <button className="w-full bg-red-600 text-white rounded-lg py-2 font-semibold hover:bg-red-700"
          onClick={() => setSecret(secretInput.trim())}>Vào</button>
      </div>
    );
  }

  const sessionOk = status?.loggedIn && status?.sessionValid;

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-10">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">🤖 Quản trị Zalo Bot</h2>
        <button className="text-xs text-gray-400 hover:text-red-600" onClick={() => setSecret('')}>Đổi mã</button>
      </div>

      {/* Trạng thái session */}
      <div className="bg-white rounded-2xl shadow p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-700">Trạng thái phiên đăng nhập</h3>
          <button className="text-sm text-blue-600 hover:underline" onClick={loadStatus} disabled={loading}>
            {loading ? '…' : '↻ Làm mới'}
          </button>
        </div>
        {statusErr && <div className="text-red-600 text-sm mb-2">⚠️ {statusErr} (kiểm tra lại mã bí mật)</div>}
        {status && (
          <>
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold mb-3 ${
              sessionOk ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              <span className={`w-2.5 h-2.5 rounded-full ${sessionOk ? 'bg-green-500' : 'bg-red-500'}`} />
              {sessionOk ? 'Session còn hiệu lực' : status.loggedIn ? 'Session đã HẾT HẠN' : 'Chưa đăng nhập'}
            </div>
            <div className="grid grid-cols-2 gap-y-1.5 text-sm">
              <div className="text-gray-400">Tài khoản</div><div className="text-gray-800">{status.accountName || '—'}</div>
              <div className="text-gray-400">Đăng nhập lúc</div><div className="text-gray-800">{timeAgo(status.loggedInAt)}</div>
              <div className="text-gray-400">Xác minh cuối</div><div className="text-gray-800">{timeAgo(status.lastVerifiedAt)}</div>
              <div className="text-gray-400">Người nhận mặc định</div><div className="text-gray-800">{status.targetId}</div>
              {status.lastLoginError && (<><div className="text-gray-400">Lỗi gần nhất</div><div className="text-red-500 break-all">{status.lastLoginError}</div></>)}
            </div>
            <div className="flex gap-2 mt-4">
              <button className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium" onClick={verifyNow}>Xác minh ngay</button>
              <button className="px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm font-medium" onClick={startLogin}>
                {sessionOk ? 'Đăng nhập lại (QR)' : 'Đăng nhập (QR)'}
              </button>
            </div>
          </>
        )}

        {(qrWaiting || qrUrl) && (
          <div className="mt-4 flex flex-col items-center border-t pt-4">
            {qrUrl ? (
              <>
                <img src={qrUrl} alt="QR đăng nhập Zalo" className="w-56 h-56 object-contain border rounded-lg" />
                <p className="text-sm text-gray-500 mt-2">Mở app Zalo → quét mã QR này để đăng nhập.</p>
              </>
            ) : (
              <p className="text-sm text-gray-500">⏳ Đang tạo mã QR, chờ vài giây…</p>
            )}
          </div>
        )}
      </div>

      {/* Lịch hẹn gửi tin */}
      <div className="bg-white rounded-2xl shadow p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-700">Lịch hẹn gửi tin</h3>
          <button className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
            onClick={() => setForm({ ...emptyForm })}>+ Thêm lịch</button>
        </div>

        {schedules.length === 0 && <p className="text-sm text-gray-400">Chưa có lịch nào.</p>}
        <div className="space-y-2">
          {schedules.map((s) => (
            <div key={s.id} className="flex items-center gap-3 border rounded-xl p-3">
              <button onClick={() => toggleEnabled(s)} className={`w-10 h-6 rounded-full flex-shrink-0 relative ${s.enabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${s.enabled ? 'translate-x-4' : ''}`} />
              </button>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-800 truncate">{s.targetName || s.targetId}</div>
                <div className="text-sm text-gray-500 truncate">{s.message}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  🕐 {s.time} · {s.days && s.days.length ? s.days.map((d) => DAY_LABELS[d]).join(', ') : 'Mỗi ngày'}
                  {s.lastSentDate ? ` · gửi lần cuối ${s.lastSentDate}` : ''}
                </div>
              </div>
              <div className="flex flex-col gap-1 flex-shrink-0">
                <button className="text-xs text-blue-600 hover:underline" onClick={() => setForm({ id: s.id, targetId: s.targetId, targetName: s.targetName, message: s.message, time: s.time, days: s.days || [], enabled: s.enabled })}>Sửa</button>
                <button className="text-xs text-green-600 hover:underline" onClick={() => sendNow(s)}>Gửi thử</button>
                <button className="text-xs text-red-500 hover:underline" onClick={() => delSchedule(s)}>Xoá</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Form thêm/sửa lịch */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setForm(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 z-10 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg mb-4">{form.id ? 'Sửa lịch' : 'Thêm lịch hẹn'}</h3>

            <label className="block text-sm font-medium text-gray-600 mb-1">Người nhận</label>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">{friends.length} bạn bè{friendsUpdatedAt ? ` · cập nhật ${timeAgo(friendsUpdatedAt)}` : ''}</span>
              <button className="text-xs text-blue-600 hover:underline" onClick={() => loadFriends(true)} disabled={friendsLoading}>
                {friendsLoading ? 'đang tải…' : '↻ Lấy lại từ Zalo'}
              </button>
            </div>
            <input className="w-full border rounded-lg px-3 py-2 mb-1 text-sm" placeholder="Tìm theo tên…"
              value={friendSearch} onChange={(e) => setFriendSearch(e.target.value)} />
            {form.targetId && !friendSearch && (
              <div className="text-xs text-green-600 mb-2 px-1">
                ✓ Đã chọn: {friends.find(f => f.userId === form.targetId)?.name || form.targetId}
              </div>
            )}
            {friendSearch && (
              <div className="border rounded-lg max-h-48 overflow-y-auto mb-4 bg-white shadow-sm">
                {filteredFriends.length === 0 && (
                  <div className="text-xs text-gray-400 px-3 py-2">Không tìm thấy</div>
                )}
                {filteredFriends.map((f) => (
                  <button key={f.userId} type="button"
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-red-50 border-b last:border-0 ${form.targetId === f.userId ? 'bg-red-50 text-red-700 font-semibold' : 'text-gray-800'}`}
                    onClick={() => { setForm((prev) => ({ ...prev, targetId: f.userId, targetName: f.name || '' })); setFriendSearch(''); }}>
                    {f.name || f.userId}
                  </button>
                ))}
              </div>
            )}
            {!friendSearch && <div className="mb-4" />}

            <label className="block text-sm font-medium text-gray-600 mb-1">Nội dung tin nhắn</label>
            <textarea className="w-full border rounded-lg px-3 py-2 mb-4 text-sm" rows={3}
              value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} />

            <label className="block text-sm font-medium text-gray-600 mb-1">Giờ gửi (giờ VN)</label>
            <input type="time" className="border rounded-lg px-3 py-2 mb-4 text-sm" value={form.time}
              onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} />

            <label className="block text-sm font-medium text-gray-600 mb-1">Ngày trong tuần (bỏ trống = mỗi ngày)</label>
            <div className="flex gap-1.5 mb-5 flex-wrap">
              {DAY_LABELS.map((lbl, d) => {
                const on = form.days.includes(d);
                return (
                  <button key={d} onClick={() => setForm((f) => ({ ...f, days: on ? f.days.filter((x) => x !== d) : [...f.days, d] }))}
                    className={`w-11 h-9 rounded-lg text-sm font-medium ${on ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{lbl}</button>
                );
              })}
            </div>

            <div className="flex gap-2 justify-end">
              <button className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm" onClick={() => setForm(null)}>Huỷ</button>
              <button className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm font-semibold" onClick={saveForm}>Lưu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleLogin } from '@react-oauth/google';

const API_BASE = process.env.REACT_APP_API_BASE || '';
const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']; // index = day number (CN=0..T7=6)

// ---- xác thực: ưu tiên đăng nhập Google (email được phép ở backend),
//      dự phòng NOTIFY_SECRET nếu chưa đăng nhập Google. ----
function useSecret() {
  const [secret, setSecret] = useState(() => localStorage.getItem('zalo_secret') || '');
  const save = (v) => { setSecret(v); localStorage.setItem('zalo_secret', v); };
  return [secret, save];
}
function decodeJwt(t) {
  try { return JSON.parse(atob(t.split('.')[1])); } catch { return null; }
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
  const [gToken, setGToken] = useState(() => localStorage.getItem('google_id_token') || '');
  const [showSecret, setShowSecret] = useState(false); // hiện ô nhập NOTIFY_SECRET dự phòng
  const [status, setStatus] = useState(null);
  const [statusErr, setStatusErr] = useState('');
  const [loading, setLoading] = useState(false);

  // QR
  const [qrUrl, setQrUrl] = useState('');
  const [qrWaiting, setQrWaiting] = useState(false);
  const qrTimer = useRef(null);

  // contacts (friends + groups)
  const [contacts, setContacts] = useState([]);
  const [contactsMeta, setContactsMeta] = useState({ friendsCount: 0, groupsCount: 0, updatedAt: null });
  const [friendSearch, setFriendSearch] = useState('');
  const [friendsLoading, setFriendsLoading] = useState(false);

  // schedules
  const [schedules, setSchedules] = useState([]);
  const [form, setForm] = useState(null); // {id?, targetId, message, time, days[], enabled, isSpecial?, targets?[]}

  // history popup
  const [historyFor, setHistoryFor] = useState(null); // {targetId, targetName}
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const gPayload = gToken ? decodeJwt(gToken) : null;
  const gValid = !!(gPayload && gPayload.exp && gPayload.exp * 1000 > Date.now());
  const gEmail = gPayload?.email || '';
  const authed = gValid || !!secret;

  const api = useCallback(async (path, opts = {}) => {
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    if (gValid) headers.Authorization = `Bearer ${gToken}`;
    const sep = path.includes('?') ? '&' : '?';
    const url = `${API_BASE}${path}${secret ? `${sep}secret=${encodeURIComponent(secret)}` : ''}`;
    const res = await fetch(url, { ...opts, headers });
    if (!res.ok && res.status !== 202) {
      let msg = `HTTP ${res.status}`;
      try { const j = await res.json(); if (j.error) msg = j.error; } catch { /* noop */ }
      throw new Error(msg);
    }
    return res;
  }, [secret, gToken, gValid]);

  const loadStatus = useCallback(async () => {
    if (!authed) return;
    setLoading(true); setStatusErr('');
    try {
      const r = await api('/zalo/health');
      setStatus(await r.json());
    } catch (e) {
      setStatusErr(e.message);
      setStatus(null);
    } finally { setLoading(false); }
  }, [api, authed]);

  const loadFriends = useCallback(async (refresh = false) => {
    if (!authed) return;
    setFriendsLoading(true);
    try {
      const r = await api(`/zalo/friends${refresh ? '?refresh=1' : ''}`);
      const d = await r.json();
      setContacts(d.contacts || []);
      setContactsMeta({ friendsCount: d.friendsCount || 0, groupsCount: d.groupsCount || 0, updatedAt: d.updatedAt });
    } catch { /* noop */ } finally { setFriendsLoading(false); }
  }, [api, authed]);

  const loadSchedules = useCallback(async () => {
    if (!authed) return;
    try {
      const r = await api('/zalo/schedules');
      setSchedules(await r.json());
    } catch { /* noop */ }
  }, [api, authed]);

  useEffect(() => {
    if (!authed) return;
    loadStatus(); loadFriends(); loadSchedules();
    const t = setInterval(loadStatus, 30000); // tự refresh trạng thái mỗi 30s
    return () => clearInterval(t);
  }, [authed, loadStatus, loadFriends, loadSchedules]);

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
  const emptyForm = { targetId: '', targetName: '', targetType: 'user', message: '', time: '08:00', days: [], enabled: true, isSpecial: false, targets: [] };
  const saveForm = async () => {
    const multi = form.isSpecial && !form.id; // thêm lịch đặc biệt: chọn nhiều người
    if (multi) {
      const targets = form.targets || [];
      if (!targets.length) return alert('Hãy chọn ít nhất 1 người/nhóm nhận');
      try {
        for (const t of targets) {
          await api('/zalo/schedules', { method: 'POST', body: JSON.stringify({ targetId: t.userId, targetName: t.name, targetType: t.type, isSpecial: true, time: form.time, days: form.days, enabled: form.enabled }) });
        }
        setForm(null); loadSchedules();
      } catch (e) { alert('Lỗi lưu lịch: ' + e.message); }
      return;
    }
    if (!form.targetId) return alert('Hãy chọn người nhận');
    if (!form.isSpecial && !form.message.trim()) return alert('Hãy nhập nội dung');
    const contact = contacts.find((c) => c.userId === form.targetId);
    const body = { ...form, targetName: contact ? contact.name : form.targetName, targetType: form.targetType || 'user' };
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
      let d;
      if (s.isSpecial) {
        const r = await api(`/zalo/schedules/${s.id}/test`, { method: 'POST' });
        d = await r.json();
        alert(d.ok ? `✅ Đã gửi: "${d.message}"` : '❌ ' + (d.error || 'thất bại'));
      } else {
        const r = await api('/zalo/send', { method: 'POST', body: JSON.stringify({ targetId: s.targetId, message: s.message, targetType: s.targetType }) });
        d = await r.json();
        alert(d.ok ? '✅ Đã gửi' : '❌ ' + (d.error || 'thất bại'));
      }
    } catch (e) { alert(e.message); }
  };

  const loadHistory = useCallback(async (targetId) => {
    setHistoryLoading(true);
    setHistory([]);
    try {
      const r = await api(`/zalo/history/${encodeURIComponent(targetId)}`);
      setHistory(await r.json());
    } catch { /* noop */ } finally { setHistoryLoading(false); }
  }, [api]);

  const filteredContacts = contacts.filter((c) =>
    !friendSearch || (c.name || '').toLowerCase().includes(friendSearch.toLowerCase()));

  const onGoogleSuccess = (resp) => {
    const idToken = resp?.credential;
    if (!idToken) return;
    localStorage.setItem('google_id_token', idToken);
    setGToken(idToken);
  };

  // ---- chưa đăng nhập (chưa có Google hợp lệ và chưa có secret) ----
  if (!authed) {
    return (
      <div className="max-w-md mx-auto mt-10 bg-white rounded-2xl shadow p-6">
        <h2 className="text-lg font-bold mb-1">🔐 Quản trị Zalo Bot</h2>
        <p className="text-sm text-gray-500 mb-4">Đăng nhập bằng Google để truy cập.</p>
        <div className="flex justify-center mb-4">
          <GoogleLogin onSuccess={onGoogleSuccess} onError={() => alert('Đăng nhập Google thất bại')} />
        </div>
        {gToken && !gValid && (
          <p className="text-xs text-amber-600 mb-3 text-center">Phiên Google đã hết hạn — hãy đăng nhập lại.</p>
        )}

        {!showSecret ? (
          <button className="w-full text-xs text-gray-400 hover:text-gray-600 mt-2"
            onClick={() => setShowSecret(true)}>Hoặc dùng mã bí mật (NOTIFY_SECRET)</button>
        ) : (
          <div className="border-t pt-4 mt-2">
            <p className="text-xs text-gray-400 mb-2">Dự phòng khi chưa đăng nhập Google được:</p>
            <input className="w-full border rounded-lg px-3 py-2 mb-2" type="password"
              value={secretInput} onChange={(e) => setSecretInput(e.target.value)} placeholder="NOTIFY_SECRET" />
            <button className="w-full bg-red-600 text-white rounded-lg py-2 font-semibold hover:bg-red-700"
              onClick={() => setSecret(secretInput.trim())}>Vào bằng mã</button>
          </div>
        )}
      </div>
    );
  }

  const sessionOk = status?.loggedIn && status?.sessionValid;

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-10">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">🤖 Quản trị Zalo Bot</h2>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {gValid ? <span className="truncate max-w-[160px]" title={gEmail}>👤 {gEmail}</span> : <span>🔑 mã bí mật</span>}
          <button className="hover:text-red-600"
            onClick={() => { setSecret(''); localStorage.removeItem('google_id_token'); setGToken(''); }}>Thoát</button>
        </div>
      </div>

      {/* Trạng thái session */}
      <div className="bg-white rounded-2xl shadow p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-700">Trạng thái phiên đăng nhập</h3>
          <button className="text-sm text-blue-600 hover:underline" onClick={loadStatus} disabled={loading}>
            {loading ? '…' : '↻ Làm mới'}
          </button>
        </div>
        {statusErr && <div className="text-red-600 text-sm mb-2">⚠️ {statusErr}{statusErr.toLowerCase().includes('forbidden') ? ' — tài khoản chưa được cấp quyền' : ''}</div>}
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
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="font-semibold text-gray-700">Lịch hẹn gửi tin</h3>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600"
              onClick={() => setForm({ ...emptyForm, isSpecial: true, time: '17:00', targets: [] })}>✦ 3 số đầu</button>
            <button className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
              onClick={() => setForm({ ...emptyForm })}>+ Thêm lịch</button>
          </div>
        </div>

        <p className="text-xs text-gray-400 mb-3">Mỗi tin có công tắc riêng — gạt tắt để <b>tạm dừng</b> đúng tin đó, gạt bật để gửi lại.</p>

        {schedules.length === 0 && <p className="text-sm text-gray-400">Chưa có lịch nào.</p>}
        <div className="space-y-2">
          {schedules.map((s) => (
            <div key={s.id} className={`flex items-center gap-3 border rounded-xl p-3 ${s.isSpecial ? 'border-amber-300 bg-amber-50' : ''} ${!s.enabled ? 'opacity-60' : ''}`}>
              <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                <button onClick={() => toggleEnabled(s)}
                  title={s.enabled ? 'Đang gửi — bấm để tạm dừng tin này' : 'Đang tạm dừng — bấm để gửi lại'}
                  className={`w-10 h-6 rounded-full relative ${s.enabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${s.enabled ? 'translate-x-4' : ''}`} />
                </button>
                <span className={`text-[9px] font-semibold ${s.enabled ? 'text-green-600' : 'text-gray-400'}`}>{s.enabled ? 'đang gửi' : 'tạm dừng'}</span>
              </div>
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { const name = s.targetName || contacts.find(c => c.userId === s.targetId)?.name || s.targetId; setHistoryFor({ targetId: s.targetId, targetName: name }); loadHistory(s.targetId); }}>
                <div className="font-medium text-gray-800 truncate">
                  {s.isSpecial && <span className="text-amber-600 text-xs font-bold mr-1">✦ ĐẶC BIỆT</span>}
                  {s.targetType === 'group' ? '👥 ' : ''}
                  {s.targetName || contacts.find(c => c.userId === s.targetId)?.name || s.targetId}
                </div>
                <div className="text-sm text-gray-500 truncate">{s.isSpecial ? '🔒 secret (top 3 số theo thứ)' : s.message}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  🕐 {s.time} · {s.days && s.days.length ? s.days.map((d) => DAY_LABELS[d]).join(', ') : 'Mỗi ngày'}
                  {s.lastSentDate ? ` · gửi lần cuối ${s.lastSentDate}` : ''}
                </div>
              </div>
              <div className="flex flex-col gap-1 flex-shrink-0">
                <button className="text-xs text-blue-600 hover:underline" onClick={() => setForm({ id: s.id, targetId: s.targetId, targetName: s.targetName, targetType: s.targetType || 'user', message: s.message, time: s.time, days: s.days || [], enabled: s.enabled, isSpecial: s.isSpecial })}>Sửa</button>
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
            <h3 className="font-bold text-lg mb-4">{form.id ? 'Sửa lịch' : (form.isSpecial ? 'Thêm người gửi 3 số đầu' : 'Thêm lịch hẹn')}</h3>

            <label className="flex items-center gap-2 mb-4 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 cursor-pointer">
              <input type="checkbox" checked={!!form.isSpecial}
                onChange={(e) => setForm((f) => ({ ...f, isSpecial: e.target.checked, time: e.target.checked && (f.time === '08:00' || !f.time) ? '17:00' : f.time }))} />
              ✦ Lịch đặc biệt — tự gửi Top 3 số đầu theo thứ
            </label>

            <label className="block text-sm font-medium text-gray-600 mb-1">
              Người nhận / Nhóm{form.isSpecial && !form.id ? ' — chọn nhiều' : ''}
            </label>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">
                {contactsMeta.friendsCount} bạn bè · {contactsMeta.groupsCount} nhóm
                {contactsMeta.updatedAt ? ` · cập nhật ${timeAgo(contactsMeta.updatedAt)}` : ''}
              </span>
              <button className="text-xs text-blue-600 hover:underline" onClick={() => loadFriends(true)} disabled={friendsLoading}>
                {friendsLoading ? 'đang tải…' : '↻ Lấy lại từ Zalo'}
              </button>
            </div>
            <input className="w-full border rounded-lg px-3 py-2 mb-1 text-sm" placeholder="Tìm theo tên…"
              value={friendSearch} onChange={(e) => setFriendSearch(e.target.value)} />

            {form.isSpecial && !form.id ? (
              <>
                {(form.targets || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 my-2">
                    {form.targets.map((t) => (
                      <span key={t.userId} className="inline-flex items-center gap-1 bg-red-50 text-red-700 text-xs rounded-full pl-2 pr-1 py-0.5">
                        {t.type === 'group' ? '👥 ' : ''}{t.name || t.userId}
                        <button type="button" className="hover:text-red-900 font-bold"
                          onClick={() => setForm((f) => ({ ...f, targets: f.targets.filter((x) => x.userId !== t.userId) }))}>×</button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="border rounded-lg max-h-48 overflow-y-auto mb-4 bg-white shadow-sm">
                  {filteredContacts.length === 0 && (
                    <div className="text-xs text-gray-400 px-3 py-2">Không có liên hệ</div>
                  )}
                  {filteredContacts.map((c) => {
                    const on = (form.targets || []).some((t) => t.userId === c.userId);
                    return (
                      <button key={c.userId} type="button"
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-red-50 border-b last:border-0 flex items-center gap-2 ${on ? 'bg-red-50 text-red-700 font-semibold' : 'text-gray-800'}`}
                        onClick={() => setForm((f) => {
                          const cur = f.targets || [];
                          const has = cur.some((t) => t.userId === c.userId);
                          return { ...f, targets: has ? cur.filter((t) => t.userId !== c.userId) : [...cur, { userId: c.userId, name: c.name || '', type: c.type || 'user' }] };
                        })}>
                        <span className={`w-4 ${on ? 'text-red-600' : 'text-gray-300'}`}>{on ? '✓' : '＋'}</span>
                        {c.type === 'group' ? '👥 ' : ''}{c.name || c.userId}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                {form.targetId && !friendSearch && (
                  <div className="text-xs text-green-600 mb-2 px-1">
                    ✓ Đã chọn: {form.targetType === 'group' ? '👥 ' : ''}{contacts.find(c => c.userId === form.targetId)?.name || form.targetId}
                  </div>
                )}
                {friendSearch ? (
                  <div className="border rounded-lg max-h-48 overflow-y-auto mb-4 bg-white shadow-sm">
                    {filteredContacts.length === 0 && (
                      <div className="text-xs text-gray-400 px-3 py-2">Không tìm thấy</div>
                    )}
                    {filteredContacts.map((c) => (
                      <button key={c.userId} type="button"
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-red-50 border-b last:border-0 ${form.targetId === c.userId ? 'bg-red-50 text-red-700 font-semibold' : 'text-gray-800'}`}
                        onClick={() => { setForm((prev) => ({ ...prev, targetId: c.userId, targetName: c.name || '', targetType: c.type || 'user' })); setFriendSearch(''); }}>
                        {c.type === 'group' ? '👥 ' : ''}{c.name || c.userId}
                      </button>
                    ))}
                  </div>
                ) : <div className="mb-4" />}
              </>
            )}

            <label className="block text-sm font-medium text-gray-600 mb-1">Nội dung tin nhắn</label>
            {form.isSpecial ? (
              <div className="w-full border border-amber-200 bg-amber-50 rounded-lg px-3 py-2 mb-4 text-sm text-amber-700">
                ✦ Tự động: nội dung là Top 3 số hay về theo thứ trong ngày — gửi dạng "Lô a,b,c x 5n"
              </div>
            ) : (
              <textarea className="w-full border rounded-lg px-3 py-2 mb-4 text-sm" rows={3}
                value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} />
            )}

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
              {!(form.isSpecial && !form.id) && (
                <button
                  className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 text-sm font-semibold"
                  onClick={async () => {
                    if (!form.targetId) return alert('Hãy chọn người nhận trước');
                    if (form.isSpecial) {
                      if (!form.id) return alert('Lưu lịch trước rồi mới gửi thử được');
                      const r = await api(`/zalo/schedules/${form.id}/test`, { method: 'POST' });
                      const d = await r.json();
                      alert(d.ok ? `✅ Đã gửi thử: "${d.message}"` : '❌ ' + (d.error || 'thất bại'));
                    } else {
                      if (!form.message.trim()) return alert('Hãy nhập nội dung trước');
                      const r = await api('/zalo/send', { method: 'POST', body: JSON.stringify({ targetId: form.targetId, message: form.message, targetType: form.targetType || 'user' }) });
                      const d = await r.json();
                      alert(d.ok ? '✅ Đã gửi thử' : '❌ ' + (d.error || 'thất bại'));
                    }
                  }}
                >Gửi thử</button>
              )}
              <button className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm font-semibold" onClick={saveForm}>Lưu</button>
            </div>
          </div>
        </div>
      )}

      {/* Popup lịch sử gửi tin */}
      {historyFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setHistoryFor(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 z-10 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">📋 Lịch sử gửi — {historyFor.targetName}</h3>
              <button className="text-gray-400 hover:text-gray-700 text-xl leading-none" onClick={() => setHistoryFor(null)}>×</button>
            </div>
            {historyLoading && <p className="text-sm text-gray-400">Đang tải…</p>}
            {!historyLoading && history.length === 0 && (
              <p className="text-sm text-gray-400">Chưa có lịch sử gửi nào.</p>
            )}
            <div className="overflow-y-auto flex-1 space-y-2">
              {history.map((h) => (
                <div key={h.id} className="border rounded-lg px-3 py-2 text-sm">
                  <div className="text-gray-500 text-xs mb-1">{new Date(h.sentAt).toLocaleString('vi-VN')}</div>
                  <div className="text-gray-800">{h.message}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

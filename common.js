/* =================================================================
   PetalLock — shared utilities, loaded by every page (index.html,
   register.php, user-dashboard.php, admin-dashboard.php).
   ================================================================= */

const API_BASE = "/smart-locker-backend/api";
const DURATION_LABELS = { 10: "10 นาที", 30: "30 นาที", 60: "60 นาที" };
const PRICE_BY_MINUTES = { 10: 10, 30: 20, 60: 30 };

/* ---------------- fetch helper ---------------- */
async function api(path, opts = {}) {
  const isForm = opts.body instanceof FormData;
  try {
    const res = await fetch(API_BASE + path, {
      credentials: "include",
      headers: isForm ? {} : { "Content-Type": "application/json" },
      ...opts
    });
    return await res.json();
  } catch (e) {
    return { ok: false, error: "เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ ตรวจสอบว่า XAMPP เปิดอยู่หรือไม่" };
  }
}
function apiGet(path) { return api(path); }
function apiPost(path, data) { return api(path, { method: "POST", body: JSON.stringify(data) }); }
function apiPostForm(path, formData) { return api(path, { method: "POST", body: formData }); }

/* ---------------- small utils ---------------- */
function formatCountdown(seconds) {
  if (seconds <= 0) return "หมดเวลาแล้ว";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (days > 0) return `เหลือ ${days} วัน ${hours} ชม.`;
  if (hours > 0) return `เหลือ ${hours} ชม. ${minutes} นาที`;
  return `เหลือ ${minutes}:${String(secs).padStart(2, "0")}`;
}
function timeAgo(datetimeStr) {
  if (!datetimeStr) return "";
  const then = new Date(datetimeStr.replace(" ", "T"));
  const diffSec = Math.floor((Date.now() - then.getTime()) / 1000);
  if (diffSec < 60) return "เมื่อสักครู่";
  if (diffSec < 3600) return Math.floor(diffSec / 60) + " นาทีที่แล้ว";
  if (diffSec < 86400) return Math.floor(diffSec / 3600) + " ชม.ที่แล้ว";
  return Math.floor(diffSec / 86400) + " วันที่แล้ว";
}
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ---------------- chat (shared by user + admin pages) ---------------- */
function renderChatMessages(containerId, viewerRole, messages) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = messages.map(m => {
    const isOwn = m.sender === viewerRole;
    const label = isOwn ? "คุณ" : (viewerRole === "user" ? "แอดมิน" : "ลูกค้า");
    return `
    <div class="chat-bubble-row ${isOwn ? 'own' : 'other'}">
      <div class="chat-sender-label">${label}</div>
      <div class="chat-bubble">${escapeHtml(m.message)}</div>
      <div class="chat-meta">${timeAgo(m.created_at)}</div>
    </div>`;
  }).join("");
  el.scrollTop = el.scrollHeight;
}
async function sendChatMessage(role) {
  const inputId = role === "user" ? "chat-input-user" : "chat-input-admin";
  const input = document.getElementById(inputId);
  const message = input.value.trim();
  if (!message) return;
  if (role === "admin" && !currentChatUserId) { alert("กรุณาเลือกบทสนทนาก่อน"); return; }
  const res = role === "admin"
    ? await apiPost("/chat/admin_send.php", { message, user_id: currentChatUserId })
    : await apiPost("/chat/send.php", { message });
  if (!res.ok) { alert(res.error); return; }
  input.value = "";
  if (role === "user") await loadUserChat();
  else await selectChatConversation();
}

/* ---------------- terms modal (shared by register + user pages) ---------------- */
function openTermsModal() { document.getElementById("terms-modal").classList.remove("hidden"); }
function closeTermsModal() { document.getElementById("terms-modal").classList.add("hidden"); }

/* ---------------- logout (shared by user + admin pages) ---------------- */
async function doLogout() {
  await apiPost("/auth/logout.php", {});
  window.location.href = "index.html";
}

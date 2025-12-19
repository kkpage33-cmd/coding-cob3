// ===============================
// LOADER (2 detik)
// ===============================
window.addEventListener("load", () => {
  setTimeout(() => {
    const loader = document.getElementById("loader");
    if (!loader) return;
    loader.style.opacity = "0";
    setTimeout(() => (loader.style.display = "none"), 450);
  }, 2000);
});

// ===============================
// FIREBASE INIT
// ===============================
const firebaseConfig = {
  apiKey: "AIzaSyCGq_W2oOhMWMGz89Hahrhc0wwraluUXCQ",
  authDomain: "ta-project-login.firebaseapp.com",
  projectId: "ta-project-login",
  storageBucket: "ta-project-login.firebasestorage.app",
  messagingSenderId: "1078789019010",
  appId: "1:1078789019010:web:51fdfe2f93a857dc776b9b",
  measurementId: "G-P4VX68F68W"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

// ===============================
// ELEMENTS
// ===============================
const statusBox = document.getElementById("statusBox");
const statusTitle = document.getElementById("statusTitle");
const statusDesc = document.getElementById("statusDesc");

const tablePanel = document.getElementById("tablePanel");
const statsGrid = document.getElementById("statsGrid");

const logBody = document.getElementById("logBody");
const countPill = document.getElementById("countPill");

const rangeFilter = document.getElementById("rangeFilter");
const typeFilter = document.getElementById("typeFilter");
const searchEmail = document.getElementById("searchEmail");
const limitFilter = document.getElementById("limitFilter");

const refreshBtn = document.getElementById("refreshBtn");
const exportBtn = document.getElementById("exportBtn");
const backBtn = document.getElementById("backBtn");

const logoutBtn = document.getElementById("logoutBtn");

// Stats
const statTotal = document.getElementById("statTotal");
const statRange = document.getElementById("statRange");
const statLoginOK = document.getElementById("statLoginOK");
const statLoginFail = document.getElementById("statLoginFail");
const statRegister = document.getElementById("statRegister");
const statLast = document.getElementById("statLast");
const statLastMeta = document.getElementById("statLastMeta");

// ===============================
// MODE TOGGLE
// ===============================
const modeBtn = document.getElementById("modeToggle");
if (modeBtn) {
  modeBtn.addEventListener("click", () => {
    document.body.classList.toggle("light");
    document.body.classList.toggle("dark");
    modeBtn.innerHTML = document.body.classList.contains("light")
      ? '<i class="fa-solid fa-sun"></i>'
      : '<i class="fa-solid fa-moon"></i>';
  });
}

// ===============================
// MUSIC (anti autoplay block)
// ===============================
const musicBtn = document.getElementById("musicToggle");
const bgMusic = document.getElementById("bgMusic");
let isPlaying = false;

function setMusicHint(text) {
  if (!musicBtn) return;
  musicBtn.setAttribute("title", text);
}
async function tryPlayMusic() {
  if (!bgMusic) return false;
  try { await bgMusic.play(); return true; } catch { return false; }
}
function unlockAudioOnce() {
  if (!bgMusic) return;
  window.addEventListener("pointerdown", async () => {
    const ok = await tryPlayMusic();
    if (ok) { bgMusic.pause(); bgMusic.currentTime = 0; }
    setMusicHint("Klik tombol musik untuk memutar.");
  }, { once: true });
}
unlockAudioOnce();

if (musicBtn && bgMusic) {
  musicBtn.addEventListener("click", async () => {
    if (!isPlaying) {
      const ok = await tryPlayMusic();
      if (ok) {
        isPlaying = true;
        musicBtn.classList.add("playing");
        setMusicHint("Sedang memutar. Klik untuk pause.");
      } else {
        setMusicHint("Browser masih memblokir. Tap sekali lagi.");
      }
    } else {
      bgMusic.pause();
      isPlaying = false;
      musicBtn.classList.remove("playing");
      setMusicHint("Pause. Klik untuk play.");
    }
  });
}

// ===============================
// PARTICLES (gold)
// ===============================
const canvas = document.getElementById("particles");
let ctx = canvas ? canvas.getContext("2d") : null;
let particlesArray = [];
let canvasWidth = 0, canvasHeight = 0;

function initCanvasSize() {
  if (!canvas) return;
  canvasWidth = canvas.width = window.innerWidth;
  canvasHeight = canvas.height = window.innerHeight;
}
window.addEventListener("resize", () => { initCanvasSize(); initParticles(); });

function Particle() {
  this.x = Math.random() * canvasWidth;
  this.y = Math.random() * canvasHeight;
  this.size = Math.random() * 2 + 1;
  this.speedX = (Math.random() - 0.5) * 0.45;
  this.speedY = (Math.random() - 0.5) * 0.45;
}
Particle.prototype.update = function () {
  this.x += this.speedX; this.y += this.speedY;
  if (this.x < 0 || this.x > canvasWidth) this.speedX *= -1;
  if (this.y < 0 || this.y > canvasHeight) this.speedY *= -1;
};
Particle.prototype.draw = function () {
  if (!ctx) return;
  ctx.fillStyle = "rgba(255,215,0,0.85)";
  ctx.beginPath();
  ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
  ctx.fill();
};
function initParticles() {
  particlesArray = [];
  const n = Math.floor((canvasWidth + canvasHeight) / 28);
  for (let i = 0; i < n; i++) particlesArray.push(new Particle());
}
function animateParticles() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  particlesArray.forEach(p => { p.update(); p.draw(); });
  requestAnimationFrame(animateParticles);
}
document.addEventListener("DOMContentLoaded", () => {
  initCanvasSize();
  initParticles();
  animateParticles();
});

// ===============================
// UI Helpers
// ===============================
function showStatus(title, desc) {
  if (!statusBox) return;
  statusBox.style.display = "flex";
  statusTitle.textContent = title;
  statusDesc.textContent = desc;
}

function hideStatus() {
  if (!statusBox) return;
  statusBox.style.display = "none";
}

function fmtDateTime(date) {
  try {
    return date.toLocaleString("id-ID", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  } catch {
    return String(date);
  }
}

function getLogDate(log) {
  // prefer createdAt (Timestamp), fallback clientTime (ISO string)
  if (log.createdAt && typeof log.createdAt.toDate === "function") {
    return log.createdAt.toDate();
  }
  if (log.clientTime) {
    const d = new Date(log.clientTime);
    if (!isNaN(d)) return d;
  }
  return new Date(NaN);
}

function typeBadge(type) {
  return `<span class="badge type"><i class="fa-solid fa-tag"></i> ${escapeHtml(type || "-")}</span>`;
}

function statusBadge(status) {
  const ok = (status || "").toLowerCase() === "ok";
  const cls = ok ? "ok" : "fail";
  const icon = ok ? "fa-circle-check" : "fa-circle-xmark";
  const label = ok ? "ok" : "failed";
  return `<span class="badge ${cls}"><i class="fa-solid ${icon}"></i> ${label}</span>`;
}

function roleBadge(role) {
  const r = role || "-";
  return `<span class="badge role"><i class="fa-solid fa-user-shield"></i> ${escapeHtml(r)}</span>`;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ===============================
// ADMIN CHECK
// ===============================
async function checkAdmin(user) {
  // rules: admins/{uid} readable only by admin
  // jika gagal -> bukan admin
  try {
    const snap = await db.collection("admins").doc(user.uid).get();
    return snap.exists; // kalau admin, read akan sukses dan exists true/false
  } catch (e) {
    return false;
  }
}

// ===============================
// LOG STATE
// ===============================
let allLogs = [];
let filteredLogs = [];
let unsub = null;

// ===============================
// FILTER LOGS
// ===============================
function applyFilters() {
  const rangeVal = rangeFilter.value;
  const typeVal = typeFilter.value;
  const emailQ = (searchEmail.value || "").trim().toLowerCase();
  const limitVal = Number(limitFilter.value || 200);

  const now = new Date();
  let minDate = null;

  if (rangeVal === "today") {
    minDate = new Date(now);
    minDate.setHours(0, 0, 0, 0);
  } else if (rangeVal === "7d") {
    minDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (rangeVal === "30d") {
    minDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  filteredLogs = allLogs.filter(l => {
    const dt = getLogDate(l);
    if (minDate && !(dt >= minDate)) return false;

    if (typeVal !== "all" && (l.type || "") !== typeVal) return false;

    if (emailQ) {
      const em = String(l.email || "").toLowerCase();
      if (!em.includes(emailQ)) return false;
    }
    return true;
  });

  // sort desc by time
  filteredLogs.sort((a, b) => getLogDate(b) - getLogDate(a));

  // limit
  filteredLogs = filteredLogs.slice(0, limitVal);

  renderAll(rangeVal, typeVal, emailQ);
}

// ===============================
// RENDER
// ===============================
function renderAll(rangeVal, typeVal, emailQ) {
  renderStats(rangeVal, typeVal, emailQ);
  renderTable();
}

function renderStats(rangeVal, typeVal, emailQ) {
  const total = filteredLogs.length;
  const loginOK = filteredLogs.filter(l => l.type === "login" && (l.status || "ok") === "ok").length;
  const loginFail = filteredLogs.filter(l => l.type === "login_failed" || (l.type === "login" && (l.status || "") === "failed")).length;

  const registerCount = filteredLogs.filter(l => l.type === "register" || l.type === "register_failed").length;

  statTotal.textContent = total;
  statLoginOK.textContent = loginOK;
  statLoginFail.textContent = loginFail;
  statRegister.textContent = registerCount;

  const rangeLabel = rangeFilter.options[rangeFilter.selectedIndex].text;
  const typeLabel = typeFilter.options[typeFilter.selectedIndex].text;
  const qLabel = emailQ ? ` | email: "${emailQ}"` : "";
  statRange.textContent = `${rangeLabel} | type: ${typeLabel}${qLabel}`;

  if (filteredLogs.length) {
    const last = filteredLogs[0];
    const dt = getLogDate(last);
    statLast.textContent = fmtDateTime(dt);
    statLastMeta.textContent = `${last.type || "-"} • ${last.email || "-"} • status: ${(last.status || "ok")}`;
  } else {
    statLast.textContent = "—";
    statLastMeta.textContent = "—";
  }
}

function renderTable() {
  countPill.textContent = `${filteredLogs.length} data`;
  logBody.innerHTML = "";

  if (!filteredLogs.length) {
    logBody.innerHTML = `
      <tr>
        <td colspan="6" class="muted" style="padding:16px;">
          Tidak ada data yang cocok dengan filter.
        </td>
      </tr>
    `;
    return;
  }

  const rows = filteredLogs.map(l => {
    const dt = getLogDate(l);
    const timeStr = isNaN(dt) ? (l.clientTime || "-") : fmtDateTime(dt);

    const email = escapeHtml(l.email || "-");
    const note = escapeHtml(l.note || "");

    const status = (l.status || "ok");
    const role = (l.role || "-");

    return `
      <tr>
        <td>${escapeHtml(timeStr)}</td>
        <td>${email}</td>
        <td>${typeBadge(l.type)}</td>
        <td>${statusBadge(status)}</td>
        <td>${roleBadge(role)}</td>
        <td class="note">${note || "-"}</td>
      </tr>
    `;
  }).join("");

  logBody.innerHTML = rows;
}

// ===============================
// EXPORT CSV
// ===============================
function exportCSV() {
  if (!filteredLogs.length) {
    alert("Tidak ada data untuk diexport.");
    return;
  }

  const header = ["time","email","type","status","role","note","uid"];
  const rows = [header];

  filteredLogs.forEach(l => {
    const dt = getLogDate(l);
    const timeStr = isNaN(dt) ? (l.clientTime || "") : dt.toISOString();

    rows.push([
      timeStr,
      (l.email || ""),
      (l.type || ""),
      (l.status || ""),
      (l.role || ""),
      (l.note || ""),
      (l.uid || "")
    ].map(v => `"${String(v).replaceAll('"','""')}"`));
  });

  const csv = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  const nowStr = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  a.href = url;
  a.download = `login_history_${nowStr}.csv`;
  a.click();

  URL.revokeObjectURL(url);
}

// ===============================
// LOAD LOGS (Firestore)
// ===============================
async function loadLogsRealtime() {
  // clean old listener
  if (typeof unsub === "function") unsub();

  showStatus("Memuat data…", "Menghubungkan ke Firestore dan membaca auth_logs (realtime).");

  try {
    const q = db.collection("auth_logs")
      .orderBy("createdAt", "desc")
      .limit(1500);

    unsub = q.onSnapshot((snap) => {
      allLogs = [];
      snap.forEach(doc => {
        allLogs.push({ id: doc.id, ...doc.data() });
      });
      hideStatus();
      applyFilters();
    }, (err) => {
      console.error(err);
      showStatus("Gagal mengambil data", "Akses ditolak atau koneksi bermasalah. Pastikan rules mengizinkan admin read auth_logs.");
    });
  } catch (e) {
    console.error(e);
    showStatus("Error", "Terjadi kesalahan saat inisialisasi query Firestore.");
  }
}

// ===============================
// AUTH GATE + UI
// ===============================
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    // redirect flow: minta login di background.html
    localStorage.setItem("afterLoginGo", "databasehistory.html");
    showStatus("Belum login", "Silakan login dahulu. Mengarahkan ke halaman background…");
    setTimeout(() => (window.location.href = "background.html#hero"), 900);
    return;
  }

  // logout btn appear
  if (logoutBtn) logoutBtn.style.display = "inline-flex";

  // admin check
  const isAdmin = await checkAdmin(user);
  if (!isAdmin) {
    // non-admin: tampilkan pesan, sembunyikan data
    statsGrid.style.display = "none";
    tablePanel.style.display = "none";
    showStatus("Akses Ditolak", "Halaman Login History hanya bisa dibuka oleh Admin.");

    // optional redirect balik database
    setTimeout(() => (window.location.href = "database.html"), 1400);
    return;
  }

  // admin ok -> tampilkan panel
  statsGrid.style.display = "grid";
  tablePanel.style.display = "block";
  hideStatus();

  loadLogsRealtime();
});

// ===============================
// EVENTS
// ===============================
rangeFilter.addEventListener("change", applyFilters);
typeFilter.addEventListener("change", applyFilters);
limitFilter.addEventListener("change", applyFilters);
searchEmail.addEventListener("input", () => {
  // debounce ringan biar nyaman
  clearTimeout(window.__emailDebounce);
  window.__emailDebounce = setTimeout(applyFilters, 200);
});

if (refreshBtn) refreshBtn.addEventListener("click", () => applyFilters());
if (exportBtn) exportBtn.addEventListener("click", exportCSV);

if (backBtn) backBtn.addEventListener("click", () => {
  window.location.href = "database.html";
});

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try { await auth.signOut(); } catch {}
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    window.location.href = "background.html#hero";
  });
}

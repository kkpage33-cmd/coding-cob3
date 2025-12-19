// ========= GUARD (admin-only) =========
function requireAdmin() {
  const loggedIn = localStorage.getItem("loggedIn") === "true";
  const userJSON = localStorage.getItem("user");
  const user = userJSON ? JSON.parse(userJSON) : null;

  if (!loggedIn || !user || user.role !== "admin") {
    alert("Monitoring Activity hanya untuk ADMIN dan harus login.");
    window.location.href = "menu.html";
    return false;
  }
  return true;
}

// ========= LOADER 2 detik =========
window.addEventListener("load", () => {
  if (!requireAdmin()) return;

  setTimeout(() => {
    const loader = document.getElementById("loader");
    if (!loader) return;
    loader.style.opacity = "0";
    setTimeout(() => (loader.style.display = "none"), 450);
  }, 2000);
});

// ========= DARK/LIGHT =========
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

// ========= LOGOUT =========
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("loggedIn");
    alert("Anda telah logout.");
    window.location.href = "background.html#hero";
  });
}

// ========= MUSIC (anti autoplay block) =========
const musicBtn = document.getElementById("musicToggle");
const bgMusic = document.getElementById("bgMusic");
let isPlaying = false;

function setMusicHint(text) { if (musicBtn) musicBtn.setAttribute("title", text); }
async function tryPlayMusic() {
  if (!bgMusic) return false;
  try { await bgMusic.play(); return true; } catch { return false; }
}

// “unlock” audio setelah user interaksi pertama
window.addEventListener("pointerdown", async () => {
  const ok = await tryPlayMusic();
  if (ok) { bgMusic.pause(); bgMusic.currentTime = 0; }
  setMusicHint("Klik tombol musik untuk memutar.");
}, { once: true });

if (musicBtn && bgMusic) {
  musicBtn.addEventListener("click", async () => {
    if (!isPlaying) {
      const ok = await tryPlayMusic();
      if (ok) { isPlaying = true; musicBtn.classList.add("playing"); }
      else setMusicHint("Browser masih memblokir. Klik sekali lagi.");
    } else {
      bgMusic.pause();
      isPlaying = false;
      musicBtn.classList.remove("playing");
    }
  });
}

// ========= PARTICLES (gold) =========
const canvas = document.getElementById("particles");
const ctx = canvas ? canvas.getContext("2d") : null;
let particles = [];
let W = 0, H = 0;

function resizeCanvas() {
  if (!canvas) return;
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}

function Particle() {
  this.x = Math.random() * W;
  this.y = Math.random() * H;
  this.r = Math.random() * 2 + 1;
  this.vx = (Math.random() - 0.5) * 0.45;
  this.vy = (Math.random() - 0.5) * 0.45;
}
Particle.prototype.u = function () {
  this.x += this.vx; this.y += this.vy;
  if (this.x < 0 || this.x > W) this.vx *= -1;
  if (this.y < 0 || this.y > H) this.vy *= -1;
};
Particle.prototype.d = function () {
  if (!ctx) return;
  ctx.fillStyle = "rgba(255,215,0,0.85)";
  ctx.beginPath();
  ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
  ctx.fill();
};

function initParticles() {
  particles = [];
  const n = Math.floor((W + H) / 28);
  for (let i = 0; i < n; i++) particles.push(new Particle());
}
function animateParticles() {
  if (!ctx) return;
  ctx.clearRect(0, 0, W, H);
  particles.forEach(p => { p.u(); p.d(); });
  requestAnimationFrame(animateParticles);
}

window.addEventListener("resize", () => { resizeCanvas(); initParticles(); });

document.addEventListener("DOMContentLoaded", () => {
  if (!requireAdmin()) return;
  resizeCanvas();
  initParticles();
  animateParticles();
});


// ============================================================
// ================== SCRIPT DASHBOARD ASLI (SAMA) =============
// ============================================================

// ============================
// Firebase init
// ============================
const firebaseConfig = {
  apiKey: "AIzaSyCIskjcBl0lN0NYzOXOTZovoXUMwA6viQM",
  authDomain: "ta-project-d68df.firebaseapp.com",
  databaseURL: "https://ta-project-d68df-default-rtdb.firebaseio.com",
  projectId: "ta-project-d68df",
  storageBucket: "ta-project-d68df.appspot.com",
  messagingSenderId: "254518072602",
  appId: "1:254518072602:web:1f8a2322ffab9ddda608a3",
  measurementId: "G-SFQYE9NDW5"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const logsRef = db.ref("logs");

// ============================
// Global data state
// ============================
let allLogs = [];
let filteredLogs = [];

let peopleChart, pirChart, lampChart;

const rangeFilter = document.getElementById("rangeFilter");
const groupBySelect = document.getElementById("groupBy");
const timelineContainer = document.getElementById("timelineContainer");
const summaryGrid = document.getElementById("summaryGrid");
const lastActivityEl = document.getElementById("lastActivity");
const heatmapGrid = document.getElementById("heatmapGrid");
const logCountChip = document.getElementById("logCountChip");
const pointCount = document.getElementById("pointCount");

const refreshBtn = document.getElementById("refreshBtn");
const exportBtn = document.getElementById("exportBtn");

function parseTimestamp(ts) {
  if (!ts) return new Date(NaN);
  return new Date(ts.replace(" ", "T"));
}

function formatTimeShort(date) {
  return date.toLocaleString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function formatDateShort(date) {
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

// =================================
// Ambil data dari Firebase (once + realtime)
// =================================
function attachFirebaseListener() {
  logsRef.on("value", snap => {
    const data = snap.val();
    allLogs = [];

    if (data) {
      Object.entries(data).forEach(([key, val]) => {
        const ts = val.timestamp || "";
        const dt = parseTimestamp(ts);
        if (isNaN(dt)) return;

        const pir = Number(val.pir || 0);
        const people = Number(val.people || 0);
        const lampArr = Array.isArray(val.lamp) ? val.lamp : [0,0,0,0];
        const gridArr = Array.isArray(val.grid) ? val.grid : [0,0,0,0];

        allLogs.push({
          key,
          timestamp: ts,
          dateObj: dt,
          pir,
          people,
          lamp: lampArr.map(x => Number(x || 0)),
          grid: gridArr.map(x => Number(x || 0))
        });
      });

      allLogs.sort((a,b) => a.dateObj - b.dateObj);
      applyFiltersAndRender();
    } else {
      allLogs = [];
      applyFiltersAndRender();
    }
  });
}

// =================================
// Filter range + groupBy
// =================================
function applyFiltersAndRender() {
  if (!allLogs.length) {
    filteredLogs = [];
    renderAll();
    return;
  }

  const now = new Date();
  const rangeVal = rangeFilter.value;
  let minTime = null;

  if (rangeVal === "1h") {
    minTime = new Date(now.getTime() - 1 * 60 * 60 * 1000);
  } else if (rangeVal === "6h") {
    minTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  } else if (rangeVal === "24h") {
    minTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  } else if (rangeVal === "today") {
    const today = new Date();
    today.setHours(0,0,0,0);
    minTime = today;
  }

  if (minTime) filteredLogs = allLogs.filter(l => l.dateObj >= minTime);
  else filteredLogs = allLogs.slice();

  renderAll();
}

function groupLogsForCharts(logs) {
  const mode = groupBySelect.value;
  if (mode === "raw" || !logs.length) return logs;

  const bucketMap = new Map();

  const getBucketKey = (dt) => {
    const year = dt.getFullYear();
    const month = String(dt.getMonth()+1).padStart(2,"0");
    const day = String(dt.getDate()).padStart(2,"0");
    const hour = String(dt.getHours()).padStart(2,"0");
    const minute = String(dt.getMinutes()).padStart(2,"0");
    if (mode === "hour") return `${year}-${month}-${day} ${hour}:00`;
    return `${year}-${month}-${day} ${hour}:${minute}`;
  };

  logs.forEach(log => {
    const key = getBucketKey(log.dateObj);
    if (!bucketMap.has(key)) {
      bucketMap.set(key, {
        timestamp: key + ":00",
        dateObj: parseTimestamp(key + ":00"),
        pirHits: 0,
        people: 0,
        count: 0,
        lampAgg: [0,0,0,0],
        gridAgg: [0,0,0,0]
      });
    }
    const bucket = bucketMap.get(key);
    bucket.count++;
    bucket.people += log.people;
    if (log.pir) bucket.pirHits++;
    log.lamp.forEach((v,i) => { if (v === 1) bucket.lampAgg[i] += 1; });
    log.grid.forEach((v,i) => { bucket.gridAgg[i] += v; });
  });

  const result = [];
  bucketMap.forEach((b) => {
    const avgPeople = b.count ? b.people / b.count : 0;
    const pirVal = b.pirHits > 0 ? 1 : 0;
    const lamp = b.lampAgg.map(v => (v > 0 ? 1 : 0));
    const grid = b.gridAgg;
    result.push({ timestamp: b.timestamp, dateObj: b.dateObj, pir: pirVal, people: avgPeople, lamp, grid });
  });

  result.sort((a,b) => a.dateObj - b.dateObj);
  return result;
}

// =================================
// RENDER SEMUA BAGIAN
// =================================
function renderAll() {
  const logsForCharts = groupLogsForCharts(filteredLogs);
  updateCharts(logsForCharts);
  updateHeatmap(logsForCharts);
  updateTimeline(filteredLogs);
  updateSummary(filteredLogs);
  updateLastActivity(filteredLogs);
}

// =================================
// CHARTS
// =================================
function updateCharts(logs) {
  const labels = logs.map(l => formatTimeShort(l.dateObj));
  const peopleData = logs.map(l => l.people);
  const pirData = logs.map(l => l.pir);
  const lamp1 = logs.map(l => l.lamp[0] || 0);
  const lamp2 = logs.map(l => l.lamp[1] || 0);
  const lamp3 = logs.map(l => l.lamp[2] || 0);
  const lamp4 = logs.map(l => l.lamp[3] || 0);

  pointCount.textContent = `${logs.length} titik`;

  const peopleCtx = document.getElementById("peopleChart").getContext("2d");
  if (peopleChart) peopleChart.destroy();
  peopleChart = new Chart(peopleCtx, {
    type: "line",
    data: { labels, datasets: [{ label: "Jumlah Orang", data: peopleData, borderWidth: 2, tension: 0.25, fill: true }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: "#e5e7eb", font: { size: 10 } } } },
      scales: {
        x: { ticks: { color: "#9ca3af", autoSkip: true, maxTicksLimit: 8 } },
        y: { ticks: { color: "#9ca3af", precision: 0 }, beginAtZero: true }
      }
    }
  });

  const pirCtx = document.getElementById("pirChart").getContext("2d");
  if (pirChart) pirChart.destroy();
  pirChart = new Chart(pirCtx, {
    type: "line",
    data: { labels, datasets: [{ label: "PIR (0/1)", data: pirData, borderWidth: 2, stepped: true }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: "#e5e7eb", font: { size: 9 } } } },
      scales: {
        x: { ticks: { color: "#9ca3af", autoSkip: true, maxTicksLimit: 6 } },
        y: { ticks: { color: "#9ca3af", stepSize: 1, min: 0, max: 1 } }
      }
    }
  });

  const lampCtx = document.getElementById("lampChart").getContext("2d");
  if (lampChart) lampChart.destroy();
  lampChart = new Chart(lampCtx, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "L1", data: lamp1, borderWidth: 1.5, stepped: true },
        { label: "L2", data: lamp2, borderWidth: 1.5, stepped: true },
        { label: "L3", data: lamp3, borderWidth: 1.5, stepped: true },
        { label: "L4", data: lamp4, borderWidth: 1.5, stepped: true }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: "#e5e7eb", font: { size: 9 } } } },
      scales: {
        x: { ticks: { color: "#9ca3af", autoSkip: true, maxTicksLimit: 6 } },
        y: { ticks: { color: "#9ca3af", stepSize: 1, min: 0, max: 1 } }
      }
    }
  });
}

// =================================
// HEATMAP
// =================================
function updateHeatmap(logs) {
  heatmapGrid.innerHTML = "";
  if (!logs.length) {
    heatmapGrid.innerHTML = "<div style='grid-column:1/-1;font-size:0.8rem;color:#6b7280;'>Tidak ada data untuk rentang waktu ini.</div>";
    return;
  }

  const gridTotals = [0,0,0,0];
  logs.forEach(l => l.grid.forEach((v,i) => gridTotals[i]+=v));

  const totalSum = gridTotals.reduce((a,b)=>a+b,0) || 1;

  for (let i=0;i<4;i++) {
    const val = gridTotals[i];
    const pct = (val / totalSum) * 100;
    let className = "heat-cell ";
    if (val === 0) className += "";
    else if (pct < 25) className += "heat-low";
    else if (pct < 60) className += "heat-med";
    else className += "heat-high";

    const cell = document.createElement("div");
    cell.className = className;
    cell.innerHTML = `
      <div class="heat-bg"></div>
      <div class="heat-label">Grid ${i+1}</div>
      <div class="heat-value">${val}</div>
      <div class="heat-percent">${pct.toFixed(1)}% dari total</div>
    `;
    heatmapGrid.appendChild(cell);
  }
}

// =================================
// TIMELINE
// =================================
function updateTimeline(logs) {
  timelineContainer.innerHTML = "";
  logCountChip.textContent = `${logs.length} log`;

  if (!logs.length) {
    timelineContainer.innerHTML = "<div style='font-size:0.8rem;color:#6b7280;'>Belum ada log tersimpan.</div>";
    return;
  }

  const latestLogs = logs.slice().sort((a,b)=>b.dateObj-a.dateObj).slice(0,80);

  latestLogs.forEach(l => {
    const card = document.createElement("div");
    card.className = "timeline-card";

    const active = (l.people > 0 || l.pir === 1);
    const badgeClass = active ? "badge-active" : "badge-idle";
    const badgeText = active ? "Aktif" : "Idle";

    card.innerHTML = `
      <div class="timeline-header">
        <div class="timeline-time">${formatTimeShort(l.dateObj)}</div>
        <div class="timeline-badge ${badgeClass}">${badgeText}</div>
      </div>
      <div class="timeline-row">
        <span class="timeline-tag">People: <strong>${l.people}</strong></span>
        <span class="timeline-tag">PIR: <strong>${l.pir}</strong></span>
        <span class="timeline-tag">Lamp: [${l.lamp.join(", ")}]</span>
        <span class="timeline-tag">Grid: [${l.grid.join(", ")}]</span>
      </div>
    `;

    timelineContainer.appendChild(card);
  });
}

// =================================
// LAST ACTIVITY + SUMMARY
// =================================
function updateLastActivity(logs) {
  if (!logs.length) {
    lastActivityEl.innerHTML = "Belum ada data aktivitas yang tersimpan di rentang ini.";
    return;
  }
  const last = logs[logs.length-1];
  const date = last.dateObj;

  const statusText = (last.people > 0 || last.pir)
    ? "Ada aktivitas (orang / gerakan terdeteksi)"
    : "Tidak ada aktivitas (ruang idle)";

  lastActivityEl.innerHTML = `
    <div><strong>${formatDateShort(date)} ${formatTimeShort(date)}</strong></div>
    <div>Status: ${statusText}</div>
    <div>People: <strong>${last.people}</strong> · PIR: <strong>${last.pir}</strong></div>
    <div>Lampu: [${last.lamp.join(", ")}] · Grid: [${last.grid.join(", ")}]</div>
  `;
}

function updateSummary(logs) {
  summaryGrid.innerHTML = "";
  if (!logs.length) {
    summaryGrid.innerHTML = "<div style='grid-column:1/-1;font-size:0.8rem;color:#6b7280;'>Tidak ada data untuk ringkasan.</div>";
    return;
  }

  const rangeLabel = rangeFilter.options[rangeFilter.selectedIndex].text;
  const groupLabel = groupBySelect.options[groupBySelect.selectedIndex].text;

  const totalPeople = logs.reduce((sum,l)=>sum+Number(l.people||0),0);
  const pirActiveCount = logs.filter(l=>l.pir===1).length;
  const totalLogs = logs.length;

  const lampOnCounts = [0,0,0,0];
  logs.forEach(l=> l.lamp.forEach((v,i)=>{ if (v===1) lampOnCounts[i]++; }));

  const busiest = logs.reduce((best,l)=>{
    const gSum = l.grid.reduce((a,b)=>a+b,0);
    if (gSum > best.sum) return {sum:gSum, log:l};
    return best;
  },{sum:0,log:null});

  const busiestText = busiest.log ? `${formatTimeShort(busiest.log.dateObj)} (People: ${busiest.log.people})` : "-";
  const pirActivePct = totalLogs ? (pirActiveCount/totalLogs*100) : 0;
  const lampOnPct = lampOnCounts.map(c => totalLogs ? (c/totalLogs*100) : 0);

  const entries = [
    { label: "Total People (sum)", value: totalPeople, extra: `Rentang: ${rangeLabel}, Group: ${groupLabel}` },
    { label: "PIR aktif (persentase)", value: pirActivePct.toFixed(1) + "%", extra: `${pirActiveCount} dari ${totalLogs} log` },
    { label: "Lampu 1–4 ON %", value: lampOnPct.map(p=>p.toFixed(1)+"%").join(" / "), extra: "Estimasi durasi aktif tiap lampu" },
    { label: "Momen Terpadat", value: busiestText, extra: "Berdasarkan jumlah orang + grid" }
  ];

  entries.forEach(e=>{
    const div = document.createElement("div");
    div.className = "summary-chip";
    div.innerHTML = `
      <div style="font-size:0.7rem;color:#9ca3af;text-transform:uppercase;letter-spacing:0.14em;margin-bottom:4px;">${e.label}</div>
      <div><strong>${e.value}</strong></div>
      <div style="font-size:0.7rem;color:#6b7280;margin-top:3px;">${e.extra}</div>
    `;
    summaryGrid.appendChild(div);
  });
}

// =================================
// EXPORT CSV
// =================================
function exportToCSV() {
  if (!filteredLogs.length) {
    alert("Tidak ada data terfilter untuk diexport.");
    return;
  }

  const rows = [];
  rows.push(["timestamp","pir","people","lamp1","lamp2","lamp3","lamp4","grid1","grid2","grid3","grid4"]);

  filteredLogs.forEach(l => {
    rows.push([
      l.timestamp, l.pir, l.people,
      l.lamp[0] || 0, l.lamp[1] || 0, l.lamp[2] || 0, l.lamp[3] || 0,
      l.grid[0] || 0, l.grid[1] || 0, l.grid[2] || 0, l.grid[3] || 0
    ]);
  });

  const csvContent = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csvContent], {type: "text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  const nowStr = new Date().toISOString().slice(0,19).replace(/[:T]/g,"-");
  a.href = url;
  a.download = `log_ruangan_${nowStr}.csv`;
  a.click();

  URL.revokeObjectURL(url);
}

// =================================
// Events
// =================================
rangeFilter.addEventListener("change", applyFiltersAndRender);
groupBySelect.addEventListener("change", applyFiltersAndRender);
refreshBtn.addEventListener("click", applyFiltersAndRender);
exportBtn.addEventListener("click", exportToCSV);

// =================================
// Start
// =================================
attachFirebaseListener();

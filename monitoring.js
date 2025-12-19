// ========= GUARD (login + admin) =========
function requireAdmin() {
  const loggedIn = localStorage.getItem("loggedIn") === "true";
  const userJSON = localStorage.getItem("user");
  const user = userJSON ? JSON.parse(userJSON) : null;

  // monitoring harus login & admin
  if (!loggedIn || !user || user.role !== "admin") {
    alert("Monitoring hanya untuk ADMIN dan harus login.");
    window.location.href = "menu.html";
    return false;
  }
  return true;
}

// fallback goPage jika halaman ini tidak load script lama
if (typeof window.goPage !== "function") {
  window.goPage = (page) => { window.location.href = page; };
}

// ========= LOADER 2 detik =========
window.addEventListener("load", () => {
  if (!requireAdmin()) return;

  setTimeout(() => {
    const loader = document.getElementById("loader");
    if (!loader) return;
    loader.style.opacity = "0";
    setTimeout(() => loader.style.display = "none", 450);
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
      else setMusicHint("Browser masih memblokir. Tap sekali lagi.");
    } else {
      bgMusic.pause();
      isPlaying = false;
      musicBtn.classList.remove("playing");
    }
  });
}

// ========= PARTICLES =========
const canvas = document.getElementById("particles");
let ctx = canvas ? canvas.getContext("2d") : null;
let particles = [];
let W = 0, H = 0;

function resizeCanvas() {
  if (!canvas) return;
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
window.addEventListener("resize", () => { resizeCanvas(); initParticles(); });

function P() {
  this.x = Math.random() * W;
  this.y = Math.random() * H;
  this.r = Math.random() * 2 + 1;
  this.vx = (Math.random() - 0.5) * 0.45;
  this.vy = (Math.random() - 0.5) * 0.45;
}
P.prototype.u = function () {
  this.x += this.vx; this.y += this.vy;
  if (this.x < 0 || this.x > W) this.vx *= -1;
  if (this.y < 0 || this.y > H) this.vy *= -1;
};
P.prototype.d = function () {
  if (!ctx) return;
  ctx.fillStyle = "rgba(255,215,0,0.85)";
  ctx.beginPath();
  ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
  ctx.fill();
};

function initParticles() {
  particles = [];
  const n = Math.floor((W + H) / 28);
  for (let i = 0; i < n; i++) particles.push(new P());
}
function loopParticles() {
  if (!ctx) return;
  ctx.clearRect(0, 0, W, H);
  particles.forEach(p => { p.u(); p.d(); });
  requestAnimationFrame(loopParticles);
}
document.addEventListener("DOMContentLoaded", () => {
  resizeCanvas();
  initParticles();
  loopParticles();
});

// ============================================================
// ============== KODE MQTT + ALARM (ASLI KAMU) ================
// (Aku biarkan isinya sama, hanya dipindah ke file ini)
// ============================================================
window.addEventListener('load', () => {
  if (!requireAdmin()) return;

  const MQTT_HOST = "localhost";
  const MQTT_PORT = 9001;
  const MQTT_PATH = "/mqtt";

  const STREAM_URL = "http://localhost:5000/video";
  document.getElementById("camera-stream").src = STREAM_URL;

  let clientID = "CLIENT_" + Math.random().toString(16).substr(2, 8);
  let client = new Paho.Client(MQTT_HOST, MQTT_PORT, MQTT_PATH, clientID);

  // === ALARM STATE (FRONTEND) ===
  let alarmEnabled = false;

  // APPLIED = yang dipakai sistem (yang dikirim ke Python)
  let alarmStartApplied = "00:00";
  let alarmEndApplied   = "00:00";

  // PENDING = hasil edit input (belum dikirim sebelum SET)
  let alarmStartPending = "00:00";
  let alarmEndPending   = "00:00";

  // anti-race ts
  let lastLocalAlarmTs = 0;

  const alarmToggle = document.getElementById("alarmToggle");
  const alarmModeText = document.getElementById("alarmModeText");
  const alarmStartInput = document.getElementById("alarmStart");
  const alarmEndInput = document.getElementById("alarmEnd");
  const alarmIndicator = document.getElementById("alarmIndicator");
  const alarmSetBtn = document.getElementById("alarmSetBtn");

  function isNowInWindow(startStr, endStr) {
    const now = new Date();
    const curMin = now.getHours() * 60 + now.getMinutes();

    const parseHM = (s) => {
      if (!s || !s.includes(":")) return null;
      const [h, m] = s.split(":").map(Number);
      if (isNaN(h) || isNaN(m)) return null;
      return h * 60 + m;
    };

    const s = parseHM(startStr);
    const e = parseHM(endStr);
    if (s === null || e === null) return false;

    if (s <= e) {
      return curMin >= s && curMin < e;
    } else {
      return (curMin >= s || curMin < e);
    }
  }

  function updateAlarmIndicator(localOnly = false, dataFromPython = null) {
    if (dataFromPython) {
      // anti status stale
      let incomingTs = 0;
      if (dataFromPython.ts !== undefined && dataFromPython.ts !== null) {
        const n = Number(dataFromPython.ts);
        incomingTs = Number.isFinite(n) ? n : 0;
      }

      if (lastLocalAlarmTs && incomingTs && incomingTs < lastLocalAlarmTs) return;

      if (typeof dataFromPython.enabled === "boolean") {
        alarmEnabled = dataFromPython.enabled;
        alarmToggle.checked = alarmEnabled;
      }
      if (dataFromPython.start) {
        alarmStartApplied = dataFromPython.start;
        alarmStartPending = dataFromPython.start;
        alarmStartInput.value = alarmStartPending;
      }
      if (dataFromPython.end) {
        alarmEndApplied = dataFromPython.end;
        alarmEndPending = dataFromPython.end;
        alarmEndInput.value = alarmEndPending;
      }

      if (incomingTs && incomingTs > lastLocalAlarmTs) lastLocalAlarmTs = incomingTs;
    }

    let inWindow = isNowInWindow(alarmStartApplied, alarmEndApplied);

    alarmIndicator.className = "alarm-indicator";
    let text = "";
    if (!alarmEnabled) {
      alarmIndicator.classList.add("alarm-off");
      text = "Alarm Off";
      alarmModeText.innerText = "Nonaktif";
    } else if (alarmEnabled && !inWindow) {
      alarmIndicator.classList.add("alarm-armed");
      text = "Terjadwal (di luar jam)";
      alarmModeText.innerText = "Siaga";
    } else {
      alarmIndicator.classList.add("alarm-active");
      text = "Alarm Aktif (dalam jam)";
      alarmModeText.innerText = "Aktif";
    }

    alarmIndicator.innerHTML = '<span class="alarm-dot"></span><span>' + text + '</span>';
  }

  function sendAlarmConfigApplied() {
    if (!client || !client.isConnected()) return;

    const ts = Date.now();
    lastLocalAlarmTs = ts;

    const payload = {
      enabled: alarmEnabled,
      start: alarmStartApplied,
      end: alarmEndApplied,
      ts: ts,
      src: clientID
    };
    const msg = new Paho.Message(JSON.stringify(payload));
    msg.destinationName = "alarm/config";
    client.send(msg);
  }

  client.onConnectionLost = () => console.log("MQTT Lost");

  client.onMessageArrived = (msg) => {
    let data;
    try { data = JSON.parse(msg.payloadString); }
    catch (e) { console.warn("JSON parse error:", e); return; }

    if (msg.destinationName === "tracking/data") updateCamera(data);
    if (msg.destinationName === "pir/sensor") updatePIR(data);
    if (msg.destinationName === "lamp/state") updateLamp(data);
    if (msg.destinationName === "alarm/status") updateAlarmIndicator(false, data);
  };

  client.connect({
    onSuccess: () => {
      console.log("MQTT Connected!");
      client.subscribe("tracking/data");
      client.subscribe("pir/sensor");
      client.subscribe("lamp/state");
      client.subscribe("alarm/status");

      alarmStartPending = alarmStartInput.value || "00:00";
      alarmEndPending   = alarmEndInput.value || "00:00";

      alarmStartApplied = alarmStartPending;
      alarmEndApplied   = alarmEndPending;

      updateAlarmIndicator(true);

      setTimeout(() => {
        if (!lastLocalAlarmTs) sendAlarmConfigApplied();
      }, 1200);
    },
    useSSL: false
  });

  function updateCamera(data) {
    document.getElementById("detectedCount").innerText = data.people_count;
    document.getElementById("g1").innerText = data.grid_people[0];
    document.getElementById("g2").innerText = data.grid_people[1];
    document.getElementById("g3").innerText = data.grid_people[2];
    document.getElementById("g4").innerText = data.grid_people[3];
  }

  function updatePIR(data) {
    let pir = (typeof data.pir === "number") ? data.pir : (data.pir ? 1 : 0);
    document.getElementById("pirStatus").innerText = pir ? "Aktif" : "Tidak Aktif";
    document.getElementById("motionStatus").innerText = pir ? "Gerakan Terdeteksi" : "Tidak Ada Gerakan";
  }

  function updateLamp(data) {
    let lamp = data.lamp_state || data.lamp || [];
    for (let i = 0; i < 4; i++) {
      let el = document.getElementById("lamp" + (i + 1));
      if (!el) continue;
      if (lamp[i] === 1) {
        el.innerText = "ON";
        el.className = "lamp-on";
      } else {
        el.innerText = "OFF";
        el.className = "lamp-off";
      }
    }
  }

  alarmToggle.addEventListener("change", () => {
    alarmEnabled = alarmToggle.checked;
    updateAlarmIndicator(true);
    sendAlarmConfigApplied();
  });

  alarmStartInput.addEventListener("change", () => {
    alarmStartPending = alarmStartInput.value || "00:00";
  });

  alarmEndInput.addEventListener("change", () => {
    alarmEndPending = alarmEndInput.value || "00:00";
  });

  alarmSetBtn.addEventListener("click", () => {
    alarmStartPending = alarmStartInput.value || "00:00";
    alarmEndPending   = alarmEndInput.value || "00:00";

    alarmStartApplied = alarmStartPending;
    alarmEndApplied   = alarmEndPending;

    updateAlarmIndicator(true);
    sendAlarmConfigApplied();
  });

  setInterval(() => {
    updateAlarmIndicator(true);
  }, 15000);

});

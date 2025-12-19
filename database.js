// ========= GUARD (login + admin) =========
function requireAdmin() {
  const loggedIn = localStorage.getItem("loggedIn") === "true";
  const userJSON = localStorage.getItem("user");
  const user = userJSON ? JSON.parse(userJSON) : null;

  if (!loggedIn || !user || user.role !== "admin") {
    alert("Database hanya untuk ADMIN dan harus login.");
    window.location.href = "menu.html";
    return false;
  }
  return true;
}

// fallback goPage jika script.js tidak ada
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
  // guard cepat biar gak ada flicker
  if (!requireAdmin()) return;
  resizeCanvas();
  initParticles();
  loopParticles();
});

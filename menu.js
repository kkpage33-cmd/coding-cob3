// WAJIB LOGIN UNTUK MENU
function requireLogin() {
  const loggedIn = localStorage.getItem("loggedIn") === "true";
  if (!loggedIn) {
    alert("Halaman Our Project (Dashboard) hanya bisa diakses setelah login.");
    window.location.href = "background.html#hero";
    return false;
  }
  return true;
}

// LOADER 2 detik
window.addEventListener("load", () => {
  if (!requireLogin()) return;

  setTimeout(() => {
    const loader = document.getElementById("loader");
    if (!loader) return;
    loader.style.opacity = "0";
    setTimeout(() => loader.style.display = "none", 450);
  }, 2000);

  if (window.AOS) AOS.init({ duration: 800, once: true });
});

document.addEventListener("DOMContentLoaded", () => {
  if (!requireLogin()) return;

  // tampilkan status user
  const status = document.getElementById("userStatus");
  const userJSON = localStorage.getItem("user");
  const user = userJSON ? JSON.parse(userJSON) : { name: "User", role: "user" };
  if (status) status.textContent = `Login: ${user.name} | Role: ${String(user.role).toUpperCase()}`;

  // admin-only button tampil kalau admin
  document.querySelectorAll(".admin-only").forEach(el => {
    el.style.display = (user.role === "admin") ? "block" : "none";
  });

  // tombol menu
  document.getElementById("btn-background")?.addEventListener("click", () => {
    window.location.href = "background.html#overview";
  });

  document.getElementById("btn-monitoring")?.addEventListener("click", () => {
    if (user.role !== "admin") return alert("Hanya admin yang dapat membuka Monitoring.");
    window.location.href = "monitoring.html";
  });

  document.getElementById("btn-database")?.addEventListener("click", () => {
    if (user.role !== "admin") return alert("Hanya admin yang dapat membuka Database.");
    window.location.href = "database.html";
  });

  // NAV state (profile/admin link)
  const profileLink = document.querySelector(".profile-link");
  const adminLink = document.querySelector(".admin-link");
  if (profileLink) profileLink.style.display = "inline-block";
  if (adminLink) adminLink.style.display = (user.role === "admin") ? "inline-block" : "none";
});

// DARK/LIGHT
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

// LOGOUT
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("loggedIn");
    alert("Anda telah logout.");
    window.location.href = "background.html#hero";
  });
}

// MUSIC (anti autoplay block)
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

// PARTICLES
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

function loop() {
  if (!ctx) return;
  ctx.clearRect(0, 0, W, H);
  particles.forEach(p => { p.u(); p.d(); });
  requestAnimationFrame(loop);
}

document.addEventListener("DOMContentLoaded", () => {
  resizeCanvas();
  initParticles();
  loop();
});

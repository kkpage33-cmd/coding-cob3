// ===============================
// LOADER + AOS
// ===============================
window.addEventListener("load", () => {
  setTimeout(() => {
    const loader = document.getElementById("loader");
    if (!loader) return;
    loader.style.opacity = "0";
    setTimeout(() => (loader.style.display = "none"), 450);
  }, 2000);

  if (window.AOS) AOS.init({ duration: 800, once: true });
});

// ===============================
// FIREBASE INIT (Auth + Firestore)
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

let cachedIsAdmin = false;

// ===============================
// HELPERS
// ===============================
async function isAdminUID(uid) {
  if (!uid) return false;
  try {
    const snap = await db.collection("admins").doc(uid).get();
    return snap.exists;
  } catch (e) {
    console.warn("Admin check failed:", e);
    return false;
  }
}

async function logAuthEvent(type, payload = {}) {
  // payload: { email, role, status, note }
  const user = auth.currentUser;
  const email = user?.email || payload.email || null;

  try {
    await db.collection("auth_logs").add({
      type,
      uid: user ? user.uid : null,
      email,
      role: payload.role || (cachedIsAdmin ? "admin" : "user"),
      status: payload.status || "ok",
      note: payload.note || "",
      clientTime: new Date().toISOString(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) {
    console.warn("Failed writing auth_logs:", e);
  }
}

function safeSetLocalUser({ name, email, role }) {
  // UI helper untuk halaman lama kamu, bukan security
  localStorage.setItem("loggedIn", "true");
  localStorage.setItem("user", JSON.stringify({ name, email, role }));
  localStorage.setItem("role", role); // supaya menu.html yang lama tetap jalan
}

function clearLocalUser() {
  localStorage.removeItem("loggedIn");
  localStorage.removeItem("user");
  localStorage.removeItem("role");
}

// ===============================
// DARK/LIGHT
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
// NAV STATE (berdasarkan Firebase Auth)
// ===============================
async function updateNavStateFromAuth(user) {
  const profileLink = document.querySelector(".profile-link");
  const adminLink = document.querySelector(".admin-link");
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  if (user) {
    cachedIsAdmin = await isAdminUID(user.uid);

    if (loginBtn) loginBtn.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "inline-flex";
    if (profileLink) profileLink.style.display = "inline-block";
    if (adminLink) adminLink.style.display = cachedIsAdmin ? "inline-block" : "none";

    // sync local UI helper
    let name = "User";
    let role = cachedIsAdmin ? "admin" : "user";

    try {
      const doc = await db.collection("users").doc(user.uid).get();
      if (doc.exists) {
        const data = doc.data() || {};
        if (data.name) name = data.name;
        // role dari server-side policy: admin hanya jika ada di admins/{uid}
        // jadi abaikan role yang mungkin ditulis client secara nakal
      } else {
        // kalau user belum punya profil, buatkan minimal
        await db.collection("users").doc(user.uid).set({
          name,
          email: user.email || "",
          role: "user",
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }
    } catch (e) {
      console.warn("User profile sync failed:", e);
    }

    safeSetLocalUser({ name, email: user.email || "", role });
  } else {
    cachedIsAdmin = false;

    if (loginBtn) loginBtn.style.display = "inline-flex";
    if (logoutBtn) logoutBtn.style.display = "none";
    if (profileLink) profileLink.style.display = "none";
    if (adminLink) adminLink.style.display = "none";

    clearLocalUser();
  }
}

// listen auth changes
auth.onAuthStateChanged((user) => {
  updateNavStateFromAuth(user);
});

// ===============================
// MUSIC (anti autoplay block) — tetap
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
// SLIDER — tetap
// ===============================
const sliderTrack = document.querySelector(".slider-track");
const prevBtn = document.querySelector(".slider-btn.prev");
const nextBtn = document.querySelector(".slider-btn.next");
const slideWidth = 280;

if (nextBtn && sliderTrack) nextBtn.addEventListener("click", () => sliderTrack.scrollBy({ left: slideWidth, behavior: "smooth" }));
if (prevBtn && sliderTrack) prevBtn.addEventListener("click", () => sliderTrack.scrollBy({ left: -slideWidth, behavior: "smooth" }));

// ===============================
// MODAL — tetap
// ===============================
const loginBtn = document.getElementById("loginBtn");
const modal = document.getElementById("authModal");
const closeModal = document.querySelector(".modal .close");
const tabBtns = document.querySelectorAll(".tab-btn");
const forms = document.querySelectorAll(".auth-form");

function openModal() { if (!modal) return; modal.style.display = "flex"; modal.setAttribute("aria-hidden", "false"); }
function hideModal() { if (!modal) return; modal.style.display = "none"; modal.setAttribute("aria-hidden", "true"); }

if (loginBtn) loginBtn.addEventListener("click", openModal);
if (closeModal) closeModal.addEventListener("click", hideModal);
window.addEventListener("click", (e) => { if (e.target === modal) hideModal(); });

tabBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    tabBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const target = btn.dataset.target;
    forms.forEach(form => {
      form.classList.remove("active");
      if (form.id === target) form.classList.add("active");
    });
  });
});

// ===============================
// PROTEKSI: Our Project -> menu.html harus login (Auth)
// ===============================
document.querySelectorAll(".ourproject-link").forEach(link => {
  link.addEventListener("click", (e) => {
    const user = auth.currentUser;
    if (!user) {
      e.preventDefault();
      localStorage.setItem("afterLoginGo", "menu.html");
      alert("Silakan login dulu untuk membuka Our Project (Dashboard).");
      openModal();
    }
  });
});

function afterLoginRedirectIfAny() {
  const to = localStorage.getItem("afterLoginGo");
  if (to) {
    localStorage.removeItem("afterLoginGo");
    window.location.href = to;
  }
}

// ===============================
// AUTH: LOGIN (Firebase)
// ===============================
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail")?.value?.trim() || "";
    const password = document.getElementById("loginPassword")?.value || "";

    try {
      await auth.signInWithEmailAndPassword(email, password);

      // log sukses (user sudah tersedia di auth.currentUser)
      await logAuthEvent("login", { status: "ok" });

      alert("Login berhasil!");
      hideModal();
      afterLoginRedirectIfAny();
    } catch (err) {
      await logAuthEvent("login_failed", { email, status: "failed", note: err.message });
      alert("Login gagal: " + err.message);
    }
  });
}

// ===============================
// AUTH: REGISTER (Firebase)
// ===============================
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("regName")?.value?.trim() || "User";
    const email = document.getElementById("regEmail")?.value?.trim() || "";
    const password = document.getElementById("regPassword")?.value || "";
    const requestedRole = document.getElementById("regRole")?.value || "user";

    try {
      const cred = await auth.createUserWithEmailAndPassword(email, password);

      // ✅ simpan profil user (role diset 'user' saja; admin harus aktivasi)
      await db.collection("users").doc(cred.user.uid).set({
        name,
        email,
        role: "user",
        requestedRole: requestedRole, // hanya catatan
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      await logAuthEvent("register", { status: "ok", role: "user" });

      if (requestedRole === "admin") {
        alert("Register berhasil. Role admin perlu aktivasi oleh admin (via Firestore admins/{uid}).");
      } else {
        alert("Register berhasil!");
      }

      hideModal();
      afterLoginRedirectIfAny();
    } catch (err) {
      await logAuthEvent("register_failed", { email, status: "failed", note: err.message });
      alert("Register gagal: " + err.message);
    }
  });
}

// ===============================
// LOGOUT (Firebase)
// ===============================
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await logAuthEvent("logout", { status: "ok" });
    } catch {}
    await auth.signOut();

    alert("Anda telah logout.");
    window.location.href = "background.html#hero";
  });
}

// ===============================
// TILT — tetap
// ===============================
document.querySelectorAll(".tilt").forEach(card => {
  card.addEventListener("mousemove", (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;
    card.style.transform = `perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  });
  card.addEventListener("mouseleave", () => {
    card.style.transform = "perspective(700px) rotateX(0) rotateY(0)";
  });
});

// ===============================
// PARTICLES — tetap
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

async function logAuthEvent(type, extra = {}) {
  const u = window.auth.currentUser;
  if (!u) return; // jangan log kalau belum login

  try {
    await window.db.collection("auth_logs").add({
      uid: u.uid,
      email: u.email || null,
      type, // "login" | "register" | "logout"
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      ...extra
    });
  } catch (e) {
    console.warn("Failed writing auth_logs:", e);
  }
}

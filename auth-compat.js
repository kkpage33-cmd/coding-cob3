// auth-compat.js

// 🔥 PASTIKAN ini config PROJECT yang benar (ta-project-login)
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

// ====== ambil elemen UI
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const profileLink = document.querySelector(".profile-link");
const adminLink = document.querySelector(".admin-link");

const modal = document.getElementById("authModal");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const closeModal = document.querySelector(".modal .close");

function openModal() { if (modal) modal.style.display = "flex"; }
function hideModal() { if (modal) modal.style.display = "none"; }

if (loginBtn) loginBtn.addEventListener("click", openModal);
if (closeModal) closeModal.addEventListener("click", hideModal);
window.addEventListener("click", (e) => { if (e.target === modal) hideModal(); });

// ====== cek admin dari /admins/<uid>
async function isAdmin(uid) {
  try {
    const snap = await db.collection("admins").doc(uid).get();
    return snap.exists;
  } catch (e) {
    console.warn("Admin check error:", e.code || e.message);
    return false;
  }
}

// ====== simpan log login/register
async function logAuth(type, user, extra = {}) {
  try {
    await db.collection("auth_Logs").add({
      type,                          // "login" | "register" | "logout"
      uid: user?.uid || null,
      email: user?.email || null,
      ...extra,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) {
    console.warn("Log write failed:", e.code || e.message);
  }
}

// ====== render navbar
async function renderUser(user) {
  const loggedIn = !!user;

  if (!loggedIn) {
    if (loginBtn) loginBtn.style.display = "inline-flex";
    if (logoutBtn) logoutBtn.style.display = "none";
    if (profileLink) profileLink.style.display = "none";
    if (adminLink) adminLink.style.display = "none";
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("uid");
    localStorage.removeItem("isAdmin");
    return;
  }

  const admin = await isAdmin(user.uid);

  if (loginBtn) loginBtn.style.display = "none";
  if (logoutBtn) logoutBtn.style.display = "inline-flex";
  if (profileLink) profileLink.style.display = "inline-block";
  if (adminLink) adminLink.style.display = admin ? "inline-block" : "none";

  localStorage.setItem("loggedIn", "true");
  localStorage.setItem("uid", user.uid);
  localStorage.setItem("isAdmin", admin ? "true" : "false");
}

// ====== Auth state listener
auth.onAuthStateChanged(async (user) => {
  await renderUser(user);
});

// ====== LOGIN
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail")?.value?.trim();
    const pass  = document.getElementById("loginPassword")?.value;

    try {
      const cred = await auth.signInWithEmailAndPassword(email, pass);
      await logAuth("login", cred.user);
      hideModal();
      alert("Login berhasil!");
    } catch (err) {
      alert("Login gagal: " + (err.code || err.message));
    }
  });
}

// ====== REGISTER
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name  = document.getElementById("regName")?.value?.trim() || "User";
    const email = document.getElementById("regEmail")?.value?.trim();
    const pass  = document.getElementById("regPassword")?.value;
    const roleRequest = document.getElementById("regRole")?.value || "user";

    try {
      const cred = await auth.createUserWithEmailAndPassword(email, pass);

      // simpan profil user (opsional tapi rapi)
      await db.collection("users").doc(cred.user.uid).set({
        name,
        email,
        roleRequest, // admin request cuma “permintaan”
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      await logAuth("register", cred.user, { name, roleRequest });

      hideModal();
      alert("Registrasi berhasil! (Admin tetap harus di-approve di /admins)");
    } catch (err) {
      alert("Register gagal: " + (err.code || err.message));
    }
  });
}

// ====== LOGOUT
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    const u = auth.currentUser;
    await auth.signOut();
    if (u) await logAuth("logout", u);
    alert("Anda telah logout.");
  });
}

// ====== Proteksi Our Project link (menu.html)
document.querySelectorAll(".ourproject-link").forEach(link => {
  link.addEventListener("click", (e) => {
    const loggedIn = localStorage.getItem("loggedIn") === "true";
    if (!loggedIn) {
      e.preventDefault();
      alert("Silakan login dulu untuk membuka Our Project (Dashboard).");
      openModal();
    }
  });
});

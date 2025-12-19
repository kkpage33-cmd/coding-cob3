// auth-firebase.js (Firebase v9 module)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// ⚠️ PASTIKAN ini config yang sama dengan project Firestore tempat kamu bikin /admins
const firebaseConfig = {
  apiKey: "AIzaSyCGq_W2oOhMWMGz89Hahrhc0wwraluUXCQ",
  authDomain: "ta-project-login.firebaseapp.com",
  projectId: "ta-project-login",
  storageBucket: "ta-project-login.firebasestorage.app",
  messagingSenderId: "1078789019010",
  appId: "1:1078789019010:web:51fdfe2f93a857dc776b9b",
  measurementId: "G-P4VX68F68W"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// === Elemen UI kamu (sesuaikan dengan id yang sudah ada)
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const profileLink = document.querySelector(".profile-link");
const adminLink = document.querySelector(".admin-link");

const modal = document.getElementById("authModal");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

// modal helpers (pakai punyamu jika sudah ada)
function openModal() { if (modal) modal.style.display = "flex"; }
function hideModal() { if (modal) modal.style.display = "none"; }

// ====== cek admin dengan doc /admins/<uid>
async function isAdminUid(uid) {
  try {
    const ref = doc(db, "admins", uid);
    const snap = await getDoc(ref);
    return snap.exists();
  } catch (e) {
    // kalau rules salah, biasanya jatuh ke sini
    console.warn("Admin check blocked:", e.code || e.message);
    return false;
  }
}

// ====== simpan user profile (opsional)
async function upsertUser(uid, payload) {
  await setDoc(doc(db, "users", uid), payload, { merge: true });
}

// ====== log auth event
async function logAuth(eventType, user, extra = {}) {
  try {
    await addDoc(collection(db, "auth_Logs"), {
      type: eventType,                 // "login" / "register" / "logout"
      uid: user?.uid || null,
      email: user?.email || null,
      ...extra,
      createdAt: serverTimestamp()
    });
  } catch (e) {
    console.warn("Log write failed:", e.code || e.message);
  }
}

// ====== render navbar state
async function renderAuthState(user) {
  if (!user) {
    if (loginBtn) loginBtn.style.display = "inline-flex";
    if (logoutBtn) logoutBtn.style.display = "none";
    if (profileLink) profileLink.style.display = "none";
    if (adminLink) adminLink.style.display = "none";
    return;
  }

  const admin = await isAdminUid(user.uid);

  if (loginBtn) loginBtn.style.display = "none";
  if (logoutBtn) logoutBtn.style.display = "inline-flex";
  if (profileLink) profileLink.style.display = "inline-block";
  if (adminLink) adminLink.style.display = admin ? "inline-block" : "none";

  // (opsional) simpan flag untuk halaman lain
  localStorage.setItem("loggedIn", "true");
  localStorage.setItem("uid", user.uid);
  localStorage.setItem("isAdmin", admin ? "true" : "false");
}

// ====== listener auth realtime
onAuthStateChanged(auth, async (user) => {
  await renderAuthState(user);
});

// tombol login buka modal (tetap)
if (loginBtn) loginBtn.addEventListener("click", openModal);

// logout
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    const u = auth.currentUser;
    await signOut(auth);
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("uid");
    localStorage.removeItem("isAdmin");
    if (u) await logAuth("logout", u);
    alert("Anda telah logout.");
  });
}

// submit login
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail")?.value?.trim();
    const pass = document.getElementById("loginPassword")?.value;

    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      await logAuth("login", cred.user);
      hideModal();
      alert("Login berhasil!");
    } catch (err) {
      alert("Login gagal: " + (err.code || err.message));
    }
  });
}

// submit register
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("regName")?.value?.trim() || "User";
    const email = document.getElementById("regEmail")?.value?.trim();
    const pass = document.getElementById("regPassword")?.value;

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);

      // simpan profile user (opsional)
      await upsertUser(cred.user.uid, {
        name,
        email,
        createdAt: serverTimestamp()
      });

      await logAuth("register", cred.user, { name });

      hideModal();
      alert("Registrasi berhasil! (Role admin tetap harus di-approve via Firestore /admins)");
    } catch (err) {
      alert("Register gagal: " + (err.code || err.message));
    }
  });
}

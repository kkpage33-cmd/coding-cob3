// firebase-init.js (compat)

// simpan config di window biar nggak redeclare
window.__FIREBASE_CONFIG__ = window.__FIREBASE_CONFIG__ || {
  apiKey: "AIzaSyCGq_W2oOhMWMGz89Hahrhc0wwraluUXCQ",
  authDomain: "ta-project-login.firebaseapp.com",
  projectId: "ta-project-login",
  storageBucket: "ta-project-login.firebasestorage.app",
  messagingSenderId: "1078789019010",
  appId: "1:1078789019010:web:51fdfe2f93a857dc776b9b",
  measurementId: "G-P4VX68F68W"
};

// init sekali saja
if (!firebase.apps.length) {
  firebase.initializeApp(window.__FIREBASE_CONFIG__);
}

// export global biar gampang dipakai file lain
window.auth = firebase.auth();
window.db   = firebase.firestore();

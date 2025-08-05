// إعداد Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyC7fpq7eVdxt5L5Vd22GfsU1BUMJ3Wc5oU",
  authDomain: "nothing-ddb83.firebaseapp.com",
  projectId: "nothing-ddb83",
  storageBucket: "nothing-ddb83.firebasestorage.app",
  messagingSenderId: "911669187957",
  appId: "1:911669187957:web:e9df63dbaf7eca46d22f3c"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// عند الضغط على زر الدخول
document.getElementById('loginBtn').addEventListener('click', () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  signInWithEmailAndPassword(auth, email, password)
    .then(userCredential => {
      const user = userCredential.user;
      // خزّن معلومات المستخدم
      localStorage.setItem("userEmail", user.email);
      // انتقل للموقع
      window.location.href = "index.html"; // غيرها لصفحتك الرئيسية
    })
    .catch(error => {
      alert("Login failed: " + error.message);
    });
});


// Import Firebase from CDN
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC7fpq7eVdxt5L5Vd22GfsU1BUMJ3Wc5oU",
  authDomain: "nothing-ddb83.firebaseapp.com",
  databaseURL: "https://nothing-ddb83-default-rtdb.firebaseio.com",
  projectId: "nothing-ddb83",
  storageBucket: "nothing-ddb83.firebasestorage.app",
  messagingSenderId: "911669187957",
  appId: "1:911669187957:web:e9df63dbaf7eca46d22f3c",
  measurementId: "G-2TPPCSQCRG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

// Configure Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Export auth functions
export {
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
};

// Firebase Configuration
// Replace these values with your Firebase project configuration
const firebaseConfig = {
    apiKey: "AIzaSyDb-8w3w7YRLi8AAIVKP9kU8S09oUi-Te8",
    authDomain: "mylibrary-7085.firebaseapp.com",
    projectId: "mylibrary-7085",
    storageBucket: "mylibrary-7085.firebasestorage.app",
    messagingSenderId: "797428739301",
    appId: "1:797428739301:web:be962d183c5a80fdcdb80c",
    measurementId: "G-24X6Z154FP"
  };

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Raspberry Pi Configuration
const RASPBERRY_PI_URL = 'http://10.25.136.207:5000'; // Update with your Pi's IP address
const PDF_SIZE_LIMIT = 5 * 1024 * 1024; // 5MB limit for inline viewer

// Export for use in other files
window.firebaseConfig = firebaseConfig;
window.auth = auth;
window.db = db;
window.RASPBERRY_PI_URL = RASPBERRY_PI_URL;
window.PDF_SIZE_LIMIT = PDF_SIZE_LIMIT;
// Firebase Configuration
// Replace these values with your Firebase project configuration
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Raspberry Pi Configuration
const RASPBERRY_PI_URL = 'http://192.168.1.100:5000'; // Update with your Pi's IP address
const PDF_SIZE_LIMIT = 5 * 1024 * 1024; // 5MB limit for inline viewer

// Export for use in other files
window.firebaseConfig = firebaseConfig;
window.auth = auth;
window.db = db;
window.RASPBERRY_PI_URL = RASPBERRY_PI_URL;
window.PDF_SIZE_LIMIT = PDF_SIZE_LIMIT;
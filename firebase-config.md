```html
<script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
</script>
```
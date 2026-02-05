// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBCEd2DrUKDXJX2oOWsahKiZMzaJa29JoA",
  authDomain: "soen-343-risky-bandits.firebaseapp.com",
  projectId: "soen-343-risky-bandits",
  storageBucket: "soen-343-risky-bandits.firebasestorage.app",
  messagingSenderId: "848682659503",
  appId: "1:848682659503:web:b364d5aa3fdfb8820cee5a",
  measurementId: "G-FYM27YTM1Y"
};

// const firebaseConfig = {
//   apiKey: "YOUR_API_KEY",
//   authDomain: "YOUR_AUTH_DOMAIN",
//   projectId: "YOUR_PROJECT_ID",
//   storageBucket: "YOUR_STORAGE_BUCKET",
//   messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
//   appId: "YOUR_APP_ID",
// };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

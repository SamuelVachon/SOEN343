// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
require('dotenv').config();

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional


const firebaseConfig = {
   apiKey: process.env.YOUR_API_KEY,
   authDomain: process.env.YOUR_AUTH_DOMAIN,
   projectId: process.env.YOUR_PROJECT_ID,
   storageBucket: process.env.YOUR_STORAGE_BUCKET,
   messagingSenderId: process.env.YOUR_MESSAGING_SENDER_ID,
   appId: process.env.YOUR_APP_ID,
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

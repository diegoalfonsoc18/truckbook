// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: "truckbook-b2236.firebaseapp.com",
  projectId: "truckbook-b2236",
  storageBucket: "truckbook-b2236.firebasestorage.app",
  messagingSenderId: "691260600608",
  appId: "1:691260600608:web:6eb060716cb7ab6aeee745",
  measurementId: "G-V7T4Y8YBTT",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

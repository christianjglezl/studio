// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "techcheck-x5724",
  "appId": "1:618506996512:web:01b3b4485e5bc4d12ba545",
  "storageBucket": "techcheck-x5724.firebasestorage.app",
  "apiKey": "AIzaSyB8icmUsYDD_aeuS8MXmtV-Oax7D002394",
  "authDomain": "techcheck-x5724.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "618506996512"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };

    
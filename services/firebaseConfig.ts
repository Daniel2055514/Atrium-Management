import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyALHA-Pa_vhqFaktrsNgThCZB_UokyWGoo",
  authDomain: "atrium-management-6a7ad.firebaseapp.com",
  projectId: "atrium-management-6a7ad",
  storageBucket: "atrium-management-6a7ad.firebasestorage.app",
  messagingSenderId: "364986959421",
  appId: "1:364986959421:web:fd2c2e9d56d2e976eacc54"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

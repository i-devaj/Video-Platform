// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBrWfff7sj4UKhxcWUpskLMfKXTfhHrW5k",
  authDomain: "yourtube-5cda5.firebaseapp.com",
  projectId: "yourtube-5cda5",
  storageBucket: "yourtube-5cda5.firebasestorage.app",
  messagingSenderId: "985932056664",
  appId: "1:985932056664:web:96217b4258152b01f7622d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
export { auth, provider };

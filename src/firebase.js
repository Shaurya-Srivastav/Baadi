import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';

// Firebase configuration - hardcoded for production, use env vars in development
const firebaseConfig = {
  apiKey: "AIzaSyDlvkj8DgXD0iwKWC9btSpY19OiAZmVZxw",
  authDomain: "baadi-98448.firebaseapp.com",
  projectId: "baadi-98448",
  storageBucket: "baadi-98448.firebasestorage.app",
  messagingSenderId: "657000742089",
  appId: "1:657000742089:web:245b00c6be06a35f036118",
  measurementId: "G-9787N1J6F6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize Firebase Cloud Messaging and get a reference to the service
// This is wrapped in a function so we can handle environments where FCM isn't supported
export const initializeMessaging = async () => {
  try {
    const isFCMSupported = await isSupported();
    if (isFCMSupported) {
      return getMessaging(app);
    }
    console.log('Firebase Cloud Messaging is not supported in this environment');
    return null;
  } catch (error) {
    console.error('Error initializing Firebase Cloud Messaging:', error);
    return null;
  }
};

export default app;

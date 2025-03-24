import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, addDoc, query, where, onSnapshot, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db, initializeMessaging } from '../firebase';
import { useAuth } from './AuthContext';
import { getToken } from 'firebase/messaging';

const NotificationContext = createContext();

export function useNotifications() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [permission, setPermission] = useState('default');
  const [fcmToken, setFcmToken] = useState(null);
  const { currentUser } = useAuth();

  // Request notification permission and setup FCM
  useEffect(() => {
    async function setupNotifications() {
      try {
        // Check if browser supports notifications
        if ('Notification' in window) {
          const status = await Notification.requestPermission();
          setPermission(status);

          if (status === 'granted' && currentUser) {
            // Initialize Firebase Cloud Messaging
            const messaging = await initializeMessaging();
            
            if (messaging) {
              const token = await getToken(messaging, {
                vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY
              });
              
              setFcmToken(token);
              
              // Store the token in Firestore
              await addDoc(collection(db, 'fcmTokens'), {
                token,
                userId: currentUser.uid,
                createdAt: Timestamp.now()
              });
            }
          }
        }
      } catch (error) {
        console.error('Error setting up notifications:', error);
      }
    }

    if (currentUser) {
      setupNotifications();
    }
  }, [currentUser]);

  // Listen for notifications from Firestore
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'alerts'),
      where('userId', '==', currentUser.uid),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const notificationsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      }));
      
      setNotifications(notificationsList);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching notifications:', error);
      setLoading(false);
    });

    return unsubscribe;
  }, [currentUser]);

  // Function to create a new alert
  async function createAlert(alertData) {
    if (!currentUser) return null;
    
    try {
      const newAlert = {
        userId: currentUser.uid,
        timestamp: Timestamp.now(),
        read: false,
        ...alertData
      };
      
      const docRef = await addDoc(collection(db, 'alerts'), newAlert);
      return { id: docRef.id, ...newAlert };
    } catch (error) {
      console.error('Error creating alert:', error);
      return null;
    }
  }

  // Function to mark an alert as read
  async function markAlertAsRead(alertId) {
    if (!currentUser) return false;
    
    try {
      await addDoc(collection(db, `alerts/${alertId}`), {
        read: true
      }, { merge: true });
      
      return true;
    } catch (error) {
      console.error('Error marking alert as read:', error);
      return false;
    }
  }

  // Function to test notification by creating a dummy alert
  async function testNotification() {
    return createAlert({
      type: 'test',
      severity: 'info',
      title: 'Test Notification',
      message: 'This is a test notification to verify that alerts are working correctly.'
    });
  }

  const value = {
    notifications,
    loading,
    permission,
    fcmToken,
    createAlert,
    markAlertAsRead,
    testNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

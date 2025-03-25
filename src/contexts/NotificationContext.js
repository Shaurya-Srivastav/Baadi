import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, addDoc, query, where, onSnapshot, orderBy, limit, Timestamp, updateDoc, doc, getDocs, getDoc, setDoc } from 'firebase/firestore';
import { db, initializeMessaging } from '../firebase';
import { useAuth } from './AuthContext';
import { getToken, onMessage } from 'firebase/messaging';

const NotificationContext = createContext();

export function useNotifications() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [systemNotifications, setSystemNotifications] = useState([]);
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
              
              // Store the token in Firestore using a unique ID to prevent duplicates
              const tokenId = `token_${currentUser.uid}_${Date.now()}`;
              await setDoc(doc(db, 'fcmTokens', tokenId), {
                token,
                userId: currentUser.uid,
                createdAt: Timestamp.now()
              });

              // Setup message handler
              onMessage(messaging, (payload) => {
                console.log('Message received:', payload);
                
                // Show browser notification
                const notificationTitle = payload.notification.title;
                const notificationOptions = {
                  body: payload.notification.body,
                  icon: '/logo192.png'
                };
                
                // Create browser notification
                new Notification(notificationTitle, notificationOptions);
                
                // Add to local state if there's data
                if (payload.data) {
                  const newNotification = {
                    id: Date.now().toString(),
                    title: notificationTitle,
                    message: payload.notification.body,
                    timestamp: new Date(),
                    read: false,
                    ...payload.data
                  };
                  
                  setNotifications(prev => [newNotification, ...prev]);
                }
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

  // Listen for system notifications (like user logins)
  useEffect(() => {
    if (!currentUser) {
      setSystemNotifications([]);
      return;
    }

    const q = query(
      collection(db, 'systemNotifications'),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      try {
        const systemNotificationsList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate()
        }));
        
        setSystemNotifications(systemNotificationsList);
        
        // Safely process system notifications
        systemNotificationsList.forEach(notification => {
          try {
            // Check if processedByUser exists and is an array
            const processedByUser = notification.processedByUser || [];
            
            // Check if this is a new notification we haven't processed yet
            if (!processedByUser.includes(currentUser.uid)) {
              // Create a local alert for this system notification
              createAlert({
                type: notification.type || 'system',
                severity: notification.severity || 'info',
                title: notification.title || 'System Notification',
                message: notification.message || '',
                systemNotificationId: notification.id
              });
              
              // Mark as processed for this user
              updateSystemNotificationProcessed(notification.id);
            }
          } catch (notifError) {
            console.error('Error processing notification:', notifError);
          }
        });
      } catch (error) {
        console.error('Error processing system notifications:', error);
      }
    }, (error) => {
      console.error('Error fetching system notifications:', error);
    });

    return unsubscribe;
  }, [currentUser]);

  // Mark system notification as processed by this user
  async function updateSystemNotificationProcessed(notificationId) {
    if (!currentUser) return;
    
    try {
      const notificationRef = doc(db, 'systemNotifications', notificationId);
      
      // Get the current notification data
      const notificationDoc = await getDoc(notificationRef);
      if (!notificationDoc.exists()) return;
      
      const notificationData = notificationDoc.data();
      const processedByUser = notificationData.processedByUser || [];
      
      // Add this user to the processedByUser array if not already present
      if (!processedByUser.includes(currentUser.uid)) {
        await updateDoc(notificationRef, {
          processedByUser: [...processedByUser, currentUser.uid]
        });
      }
    } catch (error) {
      console.error('Error updating system notification:', error);
      // Non-critical error, can be safely ignored
    }
  }

  // Function to create a new alert with a unique ID to prevent duplicates
  async function createAlert(alertData) {
    if (!currentUser) return null;
    
    try {
      // Generate a unique ID based on timestamp and a random value
      const timestamp = Date.now();
      const randomValue = Math.floor(Math.random() * 10000);
      const alertId = `alert_${currentUser.uid}_${timestamp}_${randomValue}`;
      
      const newAlert = {
        userId: currentUser.uid,
        timestamp: Timestamp.now(),
        read: false,
        ...alertData
      };
      
      // Use setDoc with the custom ID instead of addDoc
      await setDoc(doc(db, 'alerts', alertId), newAlert);
      return { id: alertId, ...newAlert };
    } catch (error) {
      console.error('Error creating alert:', error);
      return null;
    }
  }

  // Function to mark an alert as read
  async function markAlertAsRead(alertId) {
    if (!currentUser) return false;
    
    try {
      const alertRef = doc(db, 'alerts', alertId);
      await updateDoc(alertRef, {
        read: true
      });
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === alertId ? { ...notif, read: true } : notif
        )
      );
      
      return true;
    } catch (error) {
      console.error('Error marking alert as read:', error);
      return false;
    }
  }

  // Function to create a system notification (for all users) with a unique ID
  async function createSystemNotification(notificationData) {
    if (!currentUser) return null;
    
    try {
      // Generate a unique ID based on timestamp and a random value
      const timestamp = Date.now();
      const randomValue = Math.floor(Math.random() * 10000);
      const notificationId = `system_${currentUser.uid}_${timestamp}_${randomValue}`;
      
      const newNotification = {
        createdByUserId: currentUser.uid,
        timestamp: Timestamp.now(),
        processedByUser: [currentUser.uid], // Creator has already processed it
        systemNotification: true,
        ...notificationData
      };
      
      // Use setDoc with the custom ID instead of addDoc
      await setDoc(doc(db, 'systemNotifications', notificationId), newNotification);
      return { id: notificationId, ...newNotification };
    } catch (error) {
      console.error('Error creating system notification:', error);
      return null;
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
    systemNotifications,
    loading,
    permission,
    fcmToken,
    createAlert,
    markAlertAsRead,
    createSystemNotification,
    testNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

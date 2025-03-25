import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Box, 
  Container, 
  Grid, 
  Paper, 
  Typography, 
  Button,
  Slider,
  FormControl,
  Select,
  MenuItem,
  Divider,
  Switch,
  FormControlLabel,
  Chip,
  Alert,
  LinearProgress,
  CircularProgress,
  Card,
  CardContent
} from '@mui/material';
import { 
  PlayArrow, 
  Stop, 
  Settings,
  Fullscreen,
  FullscreenExit,
  CheckCircle,
  Warning
} from '@mui/icons-material';
import * as tf from '@tensorflow/tfjs';
import Webcam from 'react-webcam';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import VideoControls from './VideoControls';
import StatusIndicator from './StatusIndicator';
import MLControlPanel from './MLControlPanel';
import { collection, query, where, doc, updateDoc, onSnapshot, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';

// TensorFlow models
let movenetModel = null;
let poseDetectionModel = null;
let actionClassificationModel = null;

export default function Dashboard() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const { currentUser } = useAuth();
  const { userProfile } = useAuth();
  const { 
    createAlert, 
    createSystemNotification
  } = useNotifications();
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [error, setError] = useState('');
  const [detectionStatus, setDetectionStatus] = useState('normal');
  const [sensitivity, setSensitivity] = useState(50);
  const [modelSettings, setModelSettings] = useState({
    enableFallDetection: true,
    enableMotionTracking: true
  });
  const [sessionRef, setSessionRef] = useState(null);
  const [streamSession, setStreamSession] = useState(null);
  const [fullscreenMode, setFullscreenMode] = useState(false);
  const containerRef = useRef(null);
  const [detectedActivity, setDetectedActivity] = useState('');
  const [videoSettings, setVideoSettings] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100
  });
  // Add loading states
  const [systemInitializing, setSystemInitializing] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [streamStarting, setStreamStarting] = useState(false);
  const [motionHistory, setMotionHistory] = useState([]);
  
  // Use useMemo for isPatient to ensure it's only calculated once and available for all hooks
  const isPatient = useMemo(() => userProfile?.role === 'patient', [userProfile]);

  // Monitor fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreenMode(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Setup canvas to match webcam dimensions
  useEffect(() => {
    if (!webcamRef.current || !canvasRef.current) return;
    
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.target === webcamRef.current?.video) {
          const { width, height } = entry.contentRect;
          if (canvasRef.current) {
            canvasRef.current.width = width;
            canvasRef.current.height = height;
          }
        }
      }
    });
    
    if (webcamRef.current.video) {
      resizeObserver.observe(webcamRef.current.video);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [isStreaming, webcamRef.current]);

  // Log user login for notifications to all users
  useEffect(() => {
    if (currentUser && userProfile) {
      const logUserLogin = async () => {
        try {
          // Create a unique ID to prevent "already-exists" errors
          const timestamp = new Date().getTime();
          const notificationId = `login_${currentUser.uid}_${timestamp}`;
          
          // Create system notification for all users about this login
          const loginNotification = {
            type: 'user_login',
            severity: 'info',
            title: 'User Logged In',
            message: `${userProfile.firstName} ${userProfile.lastName} (${userProfile.role}) has logged in at ${new Date().toLocaleTimeString()}`,
            timestamp: Timestamp.now(),
            systemNotification: true // Flag for system-wide notification
          };
          
          // Use setDoc with a custom ID instead of addDoc to prevent duplicate errors
          await setDoc(doc(db, 'systemNotifications', notificationId), loginNotification);
        } catch (error) {
          console.error('Error logging user login:', error);
          // This is non-critical, so we don't need to show an error to the user
        }
      };
      
      logUserLogin();
    }
  }, [currentUser, userProfile]);

  // Initialize TensorFlow.js and load models
  useEffect(() => {
    async function loadModels() {
      try {
        if (!poseDetectionModel) {
          setLoadingProgress(10);
          // Load TensorFlow MoveNet model
          await tf.ready();
          tf.setBackend('webgl');
          
          setLoadingProgress(30);
          console.log('Loading MoveNet model...');
          // Load MoveNet model (actual implementation)
          movenetModel = await tf.loadGraphModel(
            'https://tfhub.dev/google/tfjs-model/movenet/singlepose/lightning/4',
            { fromTFHub: true }
          );
          
          setLoadingProgress(60);
          console.log('Model loaded successfully');
          
          // Create pose detection wrapper
          poseDetectionModel = {
            detect: async (video) => {
              try {
                if (!video || !movenetModel) return [];
                
                // Prepare the input tensor
                const imageTensor = tf.browser.fromPixels(video);
                const input = tf.image.resizeBilinear(imageTensor, [192, 192]);
                const expandedInput = input.expandDims(0);
                const normalized = tf.div(expandedInput, 127.5);
                const normalizedInput = tf.sub(normalized, 1.0);
                
                // Run the model
                const poses = await movenetModel.predict(normalizedInput);
                const poseArray = await poses.array();
                
                // Clean up tensors
                normalizedInput.dispose();
                normalized.dispose();
                expandedInput.dispose();
                input.dispose();
                imageTensor.dispose();
                poses.dispose();
                
                // Return the detected poses with named keypoints
                const keypoints = [];
                const keypointNames = [
                  'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
                  'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
                  'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
                  'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
                ];
                
                // Process keypoints from the model output
                for (let i = 0; i < 17; i++) {
                  const y = poseArray[0][0][i][0];
                  const x = poseArray[0][0][i][1];
                  const score = poseArray[0][0][i][2];
                  
                  if (score > 0.35) { // Confidence threshold
                    keypoints.push({
                      name: keypointNames[i],
                      position: { x, y },
                      score
                    });
                  }
                }
                
                return [{ keypoints }];
              } catch (err) {
                console.error('Error in pose detection:', err);
                return [];
              }
            }
          };
          
          // Initialize action classification model
          actionClassificationModel = {
            classify: (pose) => {
              // Simple activity classification based on keypoint positions
              const leftHand = pose.keypoints.find(kp => kp.name === 'left_wrist');
              const rightHand = pose.keypoints.find(kp => kp.name === 'right_wrist');
              const leftKnee = pose.keypoints.find(kp => kp.name === 'left_knee');
              const rightKnee = pose.keypoints.find(kp => kp.name === 'right_knee');
              
              if (leftHand && rightHand && leftKnee && rightKnee) {
                const leftHandY = leftHand.position.y;
                const rightHandY = rightHand.position.y;
                const leftKneeY = leftKnee.position.y;
                const rightKneeY = rightKnee.position.y;
                
                if (leftHandY < leftKneeY && rightHandY < rightKneeY) {
                  return 'Sitting';
                } else if (leftHandY > leftKneeY && rightHandY > rightKneeY) {
                  return 'Standing';
                } else {
                  return 'Unknown';
                }
              } else {
                return 'Unknown';
              }
            }
          };
          
          setLoadingProgress(90);
          setIsModelLoaded(true);
          setLoadingProgress(100);
          // Give a small delay before hiding the loading indicator
          setTimeout(() => {
            setSystemInitializing(false);
          }, 500);
        }
      } catch (error) {
        console.error('Error loading ML models:', error);
        setError('Failed to load detection models. Please refresh the page.');
        setSystemInitializing(false);
      }
    }

    loadModels();

    // Cleanup function
    return () => {
      setIsProcessing(false);
    };
  }, []);

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    if (!fullscreenMode) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen()
          .catch(err => {
            console.error('Error attempting to enable fullscreen:', err);
          });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
          .catch(err => {
            console.error('Error attempting to exit fullscreen:', err);
          });
      }
    }
  };

  // Toggle streaming on/off
  const toggleStreaming = async () => {
    if (isPatient) {
      if (!isStreaming) {
        // Start streaming
        try {
          setError('');
          setStreamStarting(true);
          
          // Create a new streaming session in Firestore with a unique ID
          const timestamp = new Date().getTime();
          const sessionId = `session_${currentUser.uid}_${timestamp}`;
          const streamSessionData = {
            patientId: currentUser.uid,
            patientName: `${userProfile.firstName} ${userProfile.lastName}`,
            startTime: Timestamp.now(),
            active: true
          };
          
          // Use setDoc with a custom ID instead of addDoc to prevent duplicate errors
          const sessionRef = doc(db, 'streamSessions', sessionId);
          await setDoc(sessionRef, streamSessionData);
          setStreamSession({ id: sessionId, ...streamSessionData });
          
          // Create alert for stream start with unique ID
          try {
            const alertId = `alert_${currentUser.uid}_${timestamp}`;
            await setDoc(doc(db, 'alerts', alertId), {
              type: 'stream_started',
              severity: 'info',
              title: 'Live Stream Started',
              message: `${userProfile.firstName} ${userProfile.lastName} has started a monitoring stream.`,
              timestamp: Timestamp.now(),
              userId: currentUser.uid
            });
          } catch (alertError) {
            console.error('Error creating alert:', alertError);
            // Non-critical error, continue with streaming
          }
          
          // Create system notification for all users with unique ID
          try {
            const notificationId = `notification_${currentUser.uid}_${timestamp}`;
            await setDoc(doc(db, 'systemNotifications', notificationId), {
              type: 'stream_started',
              severity: 'info',
              title: 'Patient Stream Started',
              message: `Patient ${userProfile.firstName} ${userProfile.lastName} has started a monitoring stream.`,
              timestamp: Timestamp.now()
            });
          } catch (notificationError) {
            console.error('Error creating system notification:', notificationError);
            // Non-critical error, continue with streaming
          }
          
          setIsStreaming(true);
          setStreamStarting(false);
        } catch (error) {
          console.error('Error starting stream:', error);
          setStreamStarting(false);
          // Check if it's a permission error
          if (error.code === 'permission-denied') {
            setError('Permission denied: Firebase security rules are preventing access. Please try again in a moment or contact support.');
          } else if (error.code === 'already-exists') {
            // Just continue, this isn't a critical error
            setIsStreaming(true);
          } else {
            setError('Failed to start streaming. Please try again.');
          }
        }
      } else {
        // Stop streaming
        try {
          setError('');
          if (streamSession?.id) {
            // Update the streaming session in Firestore
            const sessionRef = doc(db, 'streamSessions', streamSession.id);
            await updateDoc(sessionRef, {
              endTime: Timestamp.now(),
              active: false
            });
            
            // Create alert for stream end
            try {
              await createAlert({
                type: 'stream_ended',
                severity: 'info',
                title: 'Live Stream Ended',
                message: `${userProfile.firstName} ${userProfile.lastName} has ended their monitoring stream.`
              });
            } catch (alertError) {
              console.error('Error creating alert:', alertError);
              // Non-critical error, continue with stopping the stream
            }
            
            // Create system notification for all users
            try {
              await createSystemNotification({
                type: 'stream_ended',
                severity: 'info',
                title: 'Patient Stream Ended',
                message: `Patient ${userProfile.firstName} ${userProfile.lastName} has ended their monitoring stream.`
              });
            } catch (notificationError) {
              console.error('Error creating system notification:', notificationError);
              // Non-critical error, continue with stopping the stream
            }
          }
          
          setStreamSession(null);
          setIsStreaming(false);
        } catch (error) {
          console.error('Error stopping stream:', error);
          // Check if it's a permission error
          if (error.code === 'permission-denied') {
            setError('Permission denied: Firebase security rules are preventing access. Please try again in a moment or contact support.');
          } else {
            setError('Failed to stop streaming. Please try again.');
          }
        }
      }
    }
  };

  // Listen for active stream sessions (for caregiver view)
  useEffect(() => {
    if (!currentUser || isPatient) return;
    
    let unsubscribe = () => {};
    
    const setupStreamListener = async () => {
      try {
        // Listen for active stream sessions from patients
        const q = query(
          collection(db, 'streamSessions'),
          where('active', '==', true)
        );
        
        unsubscribe = onSnapshot(q, (querySnapshot) => {
          const sessions = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          if (sessions.length > 0) {
            // For simplicity, just use the first active session
            setStreamSession(sessions[0]);
            setIsStreaming(true);
          } else {
            setStreamSession(null);
            setIsStreaming(false);
          }
        }, (error) => {
          console.error('Error listening to stream sessions:', error);
          if (error.code === 'permission-denied') {
            setError('Permission denied: Firebase security rules are preventing access to stream sessions. Please try again in a moment or contact support.');
          } else {
            setError('Error connecting to the streaming service. Please refresh the page.');
          }
        });
      } catch (error) {
        console.error('Error setting up stream listener:', error);
        // Set a timeout to retry
        setTimeout(setupStreamListener, 5000);
      }
    };
    
    setupStreamListener();
    
    return () => unsubscribe();
  }, [currentUser, isPatient]);

  // Start/stop video processing based on streaming state
  useEffect(() => {
    let detectionInterval = null;

    if (isStreaming && isModelLoaded && modelSettings.enableMotionTracking) {
      setIsProcessing(true);
      
      // Set up detection interval
      detectionInterval = setInterval(() => {
        detectMotion();
      }, modelSettings.detectionFrequency);

      // Create alert that analysis has started
      createAlert({
        type: 'analysis_started',
        severity: 'info',
        title: 'Video Analysis Started',
        message: 'Motion tracking and fall detection analysis has started.'
      });
    } else {
      setIsProcessing(false);
    }

    // Cleanup interval on component unmount or when streaming stops
    return () => {
      if (detectionInterval) clearInterval(detectionInterval);
    };
  }, [isStreaming, isModelLoaded, modelSettings]);

  // Function to detect motion in the video stream
  const detectMotion = async () => {
    if (
      webcamRef.current && 
      webcamRef.current.video && 
      webcamRef.current.video.readyState === 4 &&
      poseDetectionModel
    ) {
      // Get video properties
      const video = webcamRef.current.video;
      
      try {
        // Use the pose detection model to detect keypoints
        const poses = await poseDetectionModel.detect(video);
        
        if (poses.length > 0) {
          const pose = poses[0];
          
          // Add names to keypoints for classification
          const keypointNames = [
            'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
            'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
            'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
            'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
          ];
          
          pose.keypoints.forEach((keypoint, i) => {
            keypoint.name = keypointNames[i] || `keypoint_${i}`;
          });
          
          // Calculate motion metrics
          const keypointScores = pose.keypoints.map(kp => kp.score);
          const avgConfidence = keypointScores.reduce((a, b) => a + b, 0) / keypointScores.length;
          
          // Calculate center of mass and motion
          const validKeypoints = pose.keypoints.filter(kp => kp.score > 0.3);
          
          // Calculate vertical position distribution (for fall detection)
          let verticalDistribution = 0;
          let normalizedMotionValue = 0;
          
          if (validKeypoints.length > 0) {
            // Analyze keypoint distribution for fall detection
            const yPositions = validKeypoints.map(kp => kp.position.y);
            const minY = Math.min(...yPositions);
            const maxY = Math.max(...yPositions);
            const height = video.height;
            
            // Calculate vertical distribution - higher values mean standing, lower values could indicate a fall
            verticalDistribution = (maxY - minY) / height;
            
            // Generate normalized motion value between 0-1
            // This is a simplified version - real implementations would track keypoint movement over time
            normalizedMotionValue = Math.min(1, Math.max(0, avgConfidence * (Math.random() * 0.5 + 0.5)));
            
            // Draw pose on canvas if needed
            if (canvasRef.current) {
              const canvas = canvasRef.current;
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              
              const ctx = canvas.getContext('2d');
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              
              // Draw bounding box around the person
              const xPositions = validKeypoints.map(kp => kp.position.x);
              const minX = Math.min(...xPositions);
              const maxX = Math.max(...xPositions);
              
              // Add some padding to bounding box
              const boxPadding = 20;
              const boxX = Math.max(0, minX - boxPadding);
              const boxY = Math.max(0, minY - boxPadding);
              const boxWidth = Math.min(canvas.width - boxX, maxX - minX + (2 * boxPadding));
              const boxHeight = Math.min(canvas.height - boxY, maxY - minY + (2 * boxPadding));
              
              // Get current activity classification
              const activity = actionClassificationModel.classify(pose);
              setDetectedActivity(activity);
              
              // Draw bounding box with activity label
              ctx.strokeStyle = '#00FF00';
              ctx.lineWidth = 3;
              ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
              
              // Draw activity label
              ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
              ctx.fillRect(boxX, boxY - 30, 150, 30);
              ctx.fillStyle = '#FFFFFF';
              ctx.font = '18px Arial';
              ctx.fillText(`Activity: ${activity}`, boxX + 10, boxY - 10);
              
              // Draw keypoints and connections for visualization
              ctx.fillStyle = '#00FF00';
              
              // Draw keypoints
              pose.keypoints.forEach(keypoint => {
                if (keypoint.score > 0.3) {
                  ctx.beginPath();
                  ctx.arc(keypoint.position.x, keypoint.position.y, 5, 0, 2 * Math.PI);
                  ctx.fill();
                }
              });
              
              // Draw skeleton lines between keypoints
              const connectedParts = [
                ['nose', 'left_eye'], ['nose', 'right_eye'], 
                ['left_eye', 'left_ear'], ['right_eye', 'right_ear'],
                ['left_shoulder', 'right_shoulder'], ['left_shoulder', 'left_elbow'],
                ['right_shoulder', 'right_elbow'], ['left_elbow', 'left_wrist'],
                ['right_elbow', 'right_wrist'], ['left_shoulder', 'left_hip'],
                ['right_shoulder', 'right_hip'], ['left_hip', 'right_hip'],
                ['left_hip', 'left_knee'], ['right_hip', 'right_knee'],
                ['left_knee', 'left_ankle'], ['right_knee', 'right_ankle']
              ];
              
              ctx.strokeStyle = '#FF0000';
              ctx.lineWidth = 2;
              
              connectedParts.forEach(([part1, part2]) => {
                const kp1 = pose.keypoints.find(kp => kp.name === part1);
                const kp2 = pose.keypoints.find(kp => kp.name === part2);
                
                if (kp1 && kp2 && kp1.score > 0.3 && kp2.score > 0.3) {
                  ctx.beginPath();
                  ctx.moveTo(kp1.position.x, kp1.position.y);
                  ctx.lineTo(kp2.position.x, kp2.position.y);
                  ctx.stroke();
                }
              });
            }
          }
          
          // Update motion history (for visualization)
          setMotionHistory(prev => {
            const newHistory = [...prev, normalizedMotionValue];
            if (newHistory.length > 20) {
              return newHistory.slice(newHistory.length - 20);
            }
            return newHistory;
          });
          
          // Determine detection status based on the motion value and sensitivity
          const normalizedSensitivity = sensitivity / 100;
          const adjustedThreshold = 0.7 - (normalizedSensitivity * 0.4); // Range: 0.3 to 0.7
          
          // Fall detection logic
          const fallThreshold = 0.3; // Low vertical distribution could indicate a fall
          
          if (verticalDistribution < fallThreshold && modelSettings.enableFallDetection && normalizedMotionValue > 0.6) {
            // Possible fall detected
            setDetectionStatus('alert');
            
            // Create alert
            createAlert({
              type: 'fall_detected',
              severity: 'critical',
              title: 'Fall Detected',
              message: 'Potential fall detected in the monitoring area. Please check immediately.'
            });
            
          } else if (normalizedMotionValue > adjustedThreshold) {
            // Abnormal motion detection
            setDetectionStatus('warning');
            
            // Create alert for significant motion if it exceeds a higher threshold
            if (normalizedMotionValue > 0.85) {
              createAlert({
                type: 'motion_detected',
                severity: 'warning',
                title: 'Significant Movement',
                message: `Unusual activity detected: ${detectedActivity}`
              });
            }
          } else {
            // Normal activity
            setDetectionStatus('normal');
          }
        }
      } catch (error) {
        console.error('Error in motion detection:', error);
      }
    }
  };

  // Handle camera selection
  const handleCameraSelection = (deviceId) => {
    setSelectedCamera(deviceId);
  };

  // Handle sensitivity change
  const handleSensitivityChange = (event, newValue) => {
    setSensitivity(newValue);
  };

  // Handle model settings change
  const handleSettingChange = (setting, value) => {
    setModelSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  // Get appropriate video constraints based on selected camera
  const getVideoConstraints = () => {
    if (selectedCamera) {
      return {
        deviceId: { exact: selectedCamera }
      };
    }
    return {
      facingMode: "user"
    };
  };

  // Apply video settings as CSS filters
  const getVideoStyle = () => {
    return {
      borderRadius: 8,
      filter: `brightness(${videoSettings?.brightness || 100}%) contrast(${videoSettings?.contrast || 100}%) saturate(${videoSettings?.saturation || 100}%)`
    };
  };

  // Toggle settings dialog
  const toggleSettings = () => {
    // This is handled in the VideoControls component
  };

  // Check webcam permissions and availability
  useEffect(() => {
    async function checkWebcam() {
      setLoadingProgress(20);
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setAvailableCameras(videoDevices);
        
        if (videoDevices.length > 0) {
          setSelectedCamera(videoDevices[0].deviceId);
        }
        
        setLoadingProgress(40);
        // Attempt to get camera permissions
        await navigator.mediaDevices.getUserMedia({ video: true });
        setLoadingProgress(50);
      } catch (err) {
        console.error('Error accessing webcam:', err);
        setError('Camera access denied. Please check your camera permissions and refresh the page.');
      }
    }
    
    checkWebcam();
  }, []);

  // Listen for system notifications (for caregiver)
  useEffect(() => {
    if (!currentUser || !isPatient) return;
    
    // Create a timer to check for inactivity
    const inactivityTimer = setInterval(() => {
      const now = new Date();
      const lastActivity = localStorage.getItem('lastActivityTime');
      
      if (lastActivity) {
        const timeSinceActivity = now - new Date(lastActivity);
        const inactivityThreshold = 10 * 60 * 1000; // 10 minutes
        
        if (timeSinceActivity > inactivityThreshold) {
          // No activity for over 10 minutes, send an alert
          createAlert({
            type: 'inactivity',
            severity: 'warning',
            title: 'Inactivity Alert',
            message: 'No movement has been detected for 10 minutes.'
          });
          
          // Reset the timer
          localStorage.setItem('lastActivityTime', now.toString());
        }
      } else {
        // Initialize last activity time
        localStorage.setItem('lastActivityTime', now.toString());
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(inactivityTimer);
  }, [currentUser, isPatient, createAlert]);

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4, mb: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Loading indicator while system initializes */}
        {systemInitializing && (
          <Box sx={{ width: '100%', mb: 4 }}>
            <Typography variant="h6" gutterBottom align="center">
              Initializing System
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={loadingProgress} 
              sx={{ height: 10, borderRadius: 5 }} 
            />
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
              {loadingProgress < 30 && "Loading TensorFlow..."}
              {loadingProgress >= 30 && loadingProgress < 60 && "Loading MoveNet model..."}
              {loadingProgress >= 60 && loadingProgress < 90 && "Setting up detection system..."}
              {loadingProgress >= 90 && "Almost ready..."}
            </Typography>
          </Box>
        )}

        <Typography variant="h4" component="h1" gutterBottom>
          Patient Monitoring Dashboard
        </Typography>
        
        <Grid container spacing={3}>
          {/* Main Video Feed */}
          <Grid item xs={12} md={8}>
            <Paper elevation={2} sx={{ p: 2 }} ref={containerRef}>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Live Video Feed</Typography>
                <StatusIndicator status={detectionStatus} />
              </Box>
              
              <Divider sx={{ mb: 2 }} />
              
              <Box className="video-container" sx={{ position: 'relative' }}>
                {streamStarting && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      backgroundColor: 'rgba(0,0,0,0.7)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      zIndex: 10,
                      borderRadius: 1
                    }}
                  >
                    <CircularProgress color="primary" size={60} />
                    <Typography variant="h6" color="white" sx={{ mt: 2 }}>
                      Starting Stream...
                    </Typography>
                  </Box>
                )}
                
                {!isStreaming ? (
                  <Box
                    sx={{
                      height: 400,
                      backgroundColor: '#000',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderRadius: 1
                    }}
                  >
                    <Typography variant="body1" color="white">
                      {isPatient 
                        ? 'Click Start Streaming to begin monitoring' 
                        : 'Waiting for patient to start streaming...'}
                    </Typography>
                  </Box>
                ) : (
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    width="100%"
                    height={400}
                    screenshotFormat="image/jpeg"
                    videoConstraints={getVideoConstraints()}
                    style={getVideoStyle()}
                    onUserMediaError={(err) => {
                      console.error('Webcam error:', err);
                      setError('Failed to access camera. Please check your camera permissions and try again.');
                    }}
                  />
                )}
                <canvas
                  ref={canvasRef}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: 1
                  }}
                />
                <div className={`status-indicator status-${detectionStatus}`} />
              </Box>
              
              <VideoControls 
                isStreaming={isStreaming}
                toggleStreaming={toggleStreaming}
                isProcessing={isProcessing}
                selectCamera={handleCameraSelection}
                selectedCamera={selectedCamera}
                toggleFullscreen={toggleFullscreen}
                fullscreenMode={fullscreenMode}
                videoSettings={videoSettings}
                setVideoSettings={setVideoSettings}
              />
            </Paper>
          </Grid>
          
          {/* Controls and Status */}
          <Grid item xs={12} md={4}>
            <Grid container spacing={3} direction="column">
              {/* Status Card */}
              <Grid item>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Monitoring Status
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                      {detectionStatus === 'normal' ? (
                        <CheckCircle sx={{ color: 'success.main', mr: 1 }} />
                      ) : detectionStatus === 'warning' ? (
                        <Warning sx={{ color: 'warning.main', mr: 1 }} />
                      ) : (
                        <Warning sx={{ color: 'error.main', mr: 1 }} />
                      )}
                      <Typography variant="body1">
                        {detectionStatus === 'normal' 
                          ? 'Normal Activity' 
                          : detectionStatus === 'warning'
                          ? 'Unusual Movement Detected'
                          : 'Potential Fall Detected'}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" gutterBottom>
                        Activity: {detectedActivity || 'Unknown'}
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        ML Analysis: {isProcessing ? 'Active' : 'Inactive'}
                      </Typography>
                      <Chip 
                        label={isStreaming ? "Streaming" : "Offline"} 
                        color={isStreaming ? "success" : "default"}
                        size="small"
                        sx={{ mr: 1 }}
                      />
                      <Chip 
                        label={isModelLoaded ? "Model Loaded" : "Loading Model"} 
                        color={isModelLoaded ? "primary" : "warning"}
                        size="small"
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              {/* Sensitivity Controls */}
              <Grid item>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="h6" gutterBottom>
                        Detection Settings
                      </Typography>
                      <Settings />
                    </Box>
                    
                    <Typography variant="body2" gutterBottom>
                      Adjust sensitivity for motion detection alerts
                    </Typography>
                    
                    <Box sx={{ mt: 3 }}>
                      <Typography id="sensitivity-slider" gutterBottom>
                        Alert Sensitivity: {sensitivity}%
                      </Typography>
                      <Slider
                        value={sensitivity}
                        onChange={handleSensitivityChange}
                        aria-labelledby="sensitivity-slider"
                        valueLabelDisplay="auto"
                        step={5}
                        marks
                        min={0}
                        max={100}
                      />
                    </Box>
                    
                    <Box sx={{ mt: 3 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={modelSettings.enableFallDetection}
                            onChange={(e) => handleSettingChange('enableFallDetection', e.target.checked)}
                            color="primary"
                          />
                        }
                        label="Fall Detection"
                      />
                    </Box>
                    
                    <Box sx={{ mt: 1 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={modelSettings.enableMotionTracking}
                            onChange={(e) => handleSettingChange('enableMotionTracking', e.target.checked)}
                            color="primary"
                          />
                        }
                        label="Motion Analysis"
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              {/* Patient Info */}
              <Grid item>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Patient Information
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Connected as: {userProfile?.firstName} {userProfile?.lastName} ({userProfile?.role})
                    </Typography>
                    
                    {streamSession && !isPatient && (
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Viewing stream from: {streamSession.patientName}
                      </Typography>
                    )}
                    
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        // Test alert system
                        createAlert({
                          type: 'test',
                          severity: 'info',
                          title: 'Test Alert',
                          message: 'This is a test notification to verify that the alert system is working.'
                        }).then(() => {
                          // Also create a system notification
                          createSystemNotification({
                            type: 'test',
                            severity: 'info',
                            title: 'Test Alert',
                            message: 'This is a test notification to verify that the alert system is working.'
                          });
                        });
                      }}
                      sx={{ mt: 1 }}
                    >
                      Test Alert System
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Container, 
  Grid, 
  Typography, 
  Paper, 
  Card, 
  CardContent, 
  Divider,
  Button,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Switch,
  FormControlLabel,
  Chip,
  Alert
} from '@mui/material';
import { 
  PlayArrow, 
  Pause, 
  Assessment, 
  Warning, 
  CheckCircle,
  Settings as SettingsIcon
} from '@mui/icons-material';
import Webcam from 'react-webcam';
import * as tf from '@tensorflow/tfjs';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import VideoControls from './VideoControls';
import StatusIndicator from './StatusIndicator';
import MLControlPanel from './MLControlPanel';
import { collection, addDoc, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

// TensorFlow models
let poseDetectionModel = null;
let movenetModel = null;

export default function Dashboard() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState('normal'); // 'normal', 'warning', 'alert'
  const [sensitivity, setSensitivity] = useState(50); 
  const [motionHistory, setMotionHistory] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [modelSettings, setModelSettings] = useState({
    detectionFrequency: 500, // ms between detections
    motionThreshold: 0.3, // threshold for motion detection
    fallThreshold: 0.7, // threshold for fall detection
    enableFallDetection: true,
    enableMotionTracking: true
  });
  const [error, setError] = useState(null);
  const { currentUser, userProfile } = useAuth();
  const { createAlert } = useNotifications();
  const [fullscreenMode, setFullscreenMode] = useState(false);
  const containerRef = useRef(null);

  // Log user login for notifications to all users
  useEffect(() => {
    if (currentUser && userProfile) {
      const logUserLogin = async () => {
        try {
          // Create system notification for all users about this login
          const loginNotification = {
            type: 'user_login',
            severity: 'info',
            title: 'User Logged In',
            message: `${userProfile.firstName} ${userProfile.lastName} (${userProfile.role}) has logged in at ${new Date().toLocaleTimeString()}`,
            timestamp: Timestamp.now(),
            systemNotification: true // Flag for system-wide notification
          };
          
          await addDoc(collection(db, 'systemNotifications'), loginNotification);
        } catch (error) {
          console.error('Error logging user login:', error);
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
          // Load TensorFlow MoveNet model
          await tf.ready();
          tf.setBackend('webgl');
          
          console.log('Loading MoveNet model...');
          // Load MoveNet model (actual implementation)
          movenetModel = await tf.loadGraphModel(
            'https://tfhub.dev/google/tfjs-model/movenet/singlepose/lightning/4',
            { fromTFHub: true }
          );
          
          console.log('Model loaded successfully');
          
          // Create pose detection wrapper
          poseDetectionModel = {
            loaded: true,
            // Detect function using MoveNet
            detect: async (image) => {
              if (!movenetModel) return [];
              
              // Prepare input
              const imageTensor = tf.browser.fromPixels(image);
              const input = tf.cast(imageTensor, 'int32');
              const resized = tf.image.resizeBilinear(input, [192, 192]);
              const normalized = tf.div(resized, 255);
              const batched = tf.expandDims(normalized, 0);
              
              // Run inference
              const result = await movenetModel.predict(batched);
              const poses = result.arraySync()[0];
              
              // Clean up tensors
              imageTensor.dispose();
              input.dispose();
              resized.dispose();
              normalized.dispose();
              batched.dispose();
              result.dispose();
              
              // Format result into keypoints
              const keypoints = [];
              const numKeypoints = 17;
              for (let i = 0; i < numKeypoints; i++) {
                const y = poses[i * 3];
                const x = poses[i * 3 + 1];
                const score = poses[i * 3 + 2];
                
                keypoints.push({
                  position: { x: x * image.width, y: y * image.height },
                  score
                });
              }
              
              return [{
                score: keypoints.reduce((sum, kp) => sum + kp.score, 0) / numKeypoints,
                keypoints
              }];
            }
          };
          
          setIsModelLoaded(true);
        }
      } catch (error) {
        console.error('Error loading ML models:', error);
        setError('Failed to load detection models. Please refresh the page.');
      }
    }

    loadModels();

    // Cleanup function
    return () => {
      setIsProcessing(false);
    };
  }, []);

  // Start/stop video processing based on streaming state
  useEffect(() => {
    let detectionInterval = null;

    if (isStreaming && isModelLoaded && modelSettings.enableMotionTracking) {
      setIsProcessing(true);
      
      // Set up detection interval
      detectionInterval = setInterval(() => {
        detectMotion();
      }, modelSettings.detectionFrequency);
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
              const ctx = canvasRef.current.getContext('2d');
              ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
              
              // Draw keypoints and connections for visualization
              ctx.fillStyle = '#00FF00';
              ctx.strokeStyle = '#FF0000';
              ctx.lineWidth = 2;
              
              pose.keypoints.forEach(keypoint => {
                if (keypoint.score > 0.3) {
                  ctx.beginPath();
                  ctx.arc(keypoint.position.x, keypoint.position.y, 5, 0, 2 * Math.PI);
                  ctx.fill();
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
                message: 'Unusual activity detected in the monitoring area.'
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

  // Toggle streaming on/off
  const toggleStreaming = () => {
    if (userProfile?.role === 'patient') {
      setIsStreaming(prevState => !prevState);
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

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    if (!fullscreenMode) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setFullscreenMode(!fullscreenMode);
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

  // Check if user is patient or caregiver
  const isPatient = userProfile?.role === 'patient';

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4, mb: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
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
                    style={{
                      borderRadius: 8
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
                      <SettingsIcon />
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
                    
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        // Demo alert
                        createAlert({
                          type: 'test',
                          severity: 'info',
                          title: 'Test Alert',
                          message: 'This is a test notification to verify that the alert system is working.'
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

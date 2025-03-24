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
  FormControl,
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

// Load TensorFlow.js models
let poseDetectionModel = null;

export default function Dashboard() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState('normal'); // 'normal', 'warning', 'alert'
  const [sensitivity, setSensitivity] = useState(50); 
  const [motionHistory, setMotionHistory] = useState([]);
  const [modelSettings, setModelSettings] = useState({
    detectionFrequency: 500, // ms between detections
    motionThreshold: 0.3, // threshold for motion detection
    fallThreshold: 0.7, // threshold for fall detection
    enableFallDetection: true,
    enableMotionTracking: true
  });
  const [error, setError] = useState(null);
  const { userProfile } = useAuth();
  const { createAlert } = useNotifications();

  // Initialize TensorFlow.js and load models
  useEffect(() => {
    async function loadModels() {
      try {
        if (!poseDetectionModel) {
          // In a real implementation, we would load the actual pose detection model
          // For this prototype, let's simulate the model loading with a timeout
          await new Promise(resolve => setTimeout(resolve, 2000));
          console.log('Model loaded successfully');
          poseDetectionModel = {
            loaded: true,
            // Mock detect function for simulation
            detect: async (image) => {
              // Simulate detection by returning random poses
              return [{
                score: Math.random(),
                keypoints: [
                  { position: { x: Math.random() * 640, y: Math.random() * 480 }, score: Math.random() },
                  { position: { x: Math.random() * 640, y: Math.random() * 480 }, score: Math.random() },
                  // More keypoints would be here in a real model
                ]
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
        // In a real implementation, we would:
        // 1. Use the pose detection model to detect keypoints
        // 2. Analyze the keypoints to detect abnormal movements
        // 3. Detect falls or other dangerous events
        
        // For this prototype, let's simulate detection with random values
        const randomValue = Math.random();
        
        // Update motion history (for visualization)
        setMotionHistory(prev => {
          const newHistory = [...prev, randomValue];
          if (newHistory.length > 20) {
            return newHistory.slice(newHistory.length - 20);
          }
          return newHistory;
        });
        
        // Determine detection status based on the random value and sensitivity
        const normalizedSensitivity = sensitivity / 100;
        const adjustedThreshold = 0.7 - (normalizedSensitivity * 0.4); // Range: 0.3 to 0.7
        
        if (randomValue > 0.9 && modelSettings.enableFallDetection) {
          // Simulate a fall detection (10% chance)
          setDetectionStatus('alert');
          
          // Create alert
          createAlert({
            type: 'fall_detected',
            severity: 'critical',
            title: 'Fall Detected',
            message: 'Potential fall detected in the monitoring area. Please check immediately.'
          });
          
        } else if (randomValue > adjustedThreshold) {
          // Simulate abnormal motion detection
          setDetectionStatus('warning');
        } else {
          // Normal activity
          setDetectionStatus('normal');
        }
        
        // Draw to canvas (in a real implementation)
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          // Drawing code would go here
        }
      } catch (error) {
        console.error('Error in motion detection:', error);
      }
    }
  };

  // Toggle streaming on/off
  const toggleStreaming = () => {
    setIsStreaming(prevState => !prevState);
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
            <Paper elevation={2} sx={{ p: 2 }}>
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
                      Click Start Streaming to begin monitoring
                    </Typography>
                  </Box>
                ) : (
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    width="100%"
                    height={400}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{
                      facingMode: "user"
                    }}
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
                      This is a demonstration of the live monitoring interface. In a real implementation, this section would display patient information and context.
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

import React, { useState, useEffect } from 'react';
import { Box, Button, Stack, CircularProgress, Tooltip, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { PlayArrow, Pause, Settings, Fullscreen, Videocam } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const VideoControls = ({ isStreaming, toggleStreaming, isProcessing, selectCamera, selectedCamera }) => {
  const [availableCameras, setAvailableCameras] = useState([]);
  const [loading, setLoading] = useState(false);
  const { userProfile } = useAuth();

  useEffect(() => {
    async function getAvailableCameras() {
      setLoading(true);
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setAvailableCameras(videoDevices);
      } catch (error) {
        console.error('Error getting cameras:', error);
      } finally {
        setLoading(false);
      }
    }

    getAvailableCameras();
  }, []);

  const isPatient = userProfile?.role === 'patient';

  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      mt: 2,
      flexWrap: 'wrap'
    }}>
      {isPatient ? (
        <Button
          variant={isStreaming ? "outlined" : "contained"}
          color={isStreaming ? "error" : "primary"}
          startIcon={isStreaming ? <Pause /> : <PlayArrow />}
          onClick={toggleStreaming}
          disabled={loading}
        >
          {isStreaming ? 'Stop Streaming' : 'Start Streaming'}
        </Button>
      ) : (
        <Button
          variant="contained"
          color="primary"
          disabled={true}
          startIcon={<Videocam />}
        >
          Viewer Mode
        </Button>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: { xs: 2, sm: 0 }, mb: { xs: 2, sm: 0 } }}>
        {isPatient && (
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel id="camera-select-label">Select Camera</InputLabel>
            <Select
              labelId="camera-select-label"
              id="camera-select"
              value={selectedCamera || ''}
              onChange={(e) => selectCamera(e.target.value)}
              label="Select Camera"
              disabled={isStreaming || loading}
            >
              {availableCameras.map((camera) => (
                <MenuItem key={camera.deviceId} value={camera.deviceId}>
                  {camera.label || `Camera ${camera.deviceId.slice(0, 5)}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {isProcessing && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CircularProgress size={24} sx={{ mr: 1 }} />
            Analyzing...
          </Box>
        )}
      </Stack>

      <Stack direction="row" spacing={1}>
        <Tooltip title="Video Settings">
          <Button
            size="small"
            variant="outlined"
            color="primary"
            startIcon={<Settings />}
            disabled={!isPatient}
          >
            Video Settings
          </Button>
        </Tooltip>
        
        <Tooltip title="Fullscreen">
          <Button
            size="small"
            variant="outlined"
            color="primary"
            startIcon={<Fullscreen />}
          >
            Fullscreen
          </Button>
        </Tooltip>
      </Stack>
    </Box>
  );
};

export default VideoControls;

import React from 'react';
import { Box, Button, Stack, CircularProgress, Tooltip } from '@mui/material';
import { PlayArrow, Pause, Settings, Fullscreen } from '@mui/icons-material';

const VideoControls = ({ isStreaming, toggleStreaming, isProcessing }) => {
  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      mt: 2 
    }}>
      <Button
        variant={isStreaming ? "outlined" : "contained"}
        color={isStreaming ? "error" : "primary"}
        startIcon={isStreaming ? <Pause /> : <PlayArrow />}
        onClick={toggleStreaming}
      >
        {isStreaming ? 'Stop Streaming' : 'Start Streaming'}
      </Button>

      <Stack direction="row" spacing={1}>
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

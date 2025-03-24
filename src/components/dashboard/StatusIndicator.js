import React from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { 
  CheckCircle, 
  Warning,
  Error as ErrorIcon
} from '@mui/icons-material';

const StatusIndicator = ({ status }) => {
  let icon = null;
  let label = '';
  let color = '';
  
  switch (status) {
    case 'normal':
      icon = <CheckCircle />;
      label = 'Normal Activity';
      color = 'success.main';
      break;
    case 'warning':
      icon = <Warning />;
      label = 'Unusual Movement Detected';
      color = 'warning.main';
      break;
    case 'alert':
      icon = <ErrorIcon />;
      label = 'Potential Emergency';
      color = 'error.main';
      break;
    default:
      icon = <CheckCircle />;
      label = 'Status Normal';
      color = 'success.main';
  }
  
  return (
    <Tooltip title={label}>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Box sx={{ color: color, mr: 1, display: 'flex' }}>
          {icon}
        </Box>
        <Typography variant="body2" color={color}>
          {label}
        </Typography>
      </Box>
    </Tooltip>
  );
};

export default StatusIndicator;

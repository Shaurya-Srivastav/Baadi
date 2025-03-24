import React from 'react';
import { 
  Box, 
  Typography, 
  Slider, 
  FormControlLabel, 
  Switch, 
  Card, 
  CardContent,
  Divider 
} from '@mui/material';

const MLControlPanel = ({ 
  settings, 
  onSettingChange, 
  sensitivity, 
  onSensitivityChange 
}) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          ML Analysis Settings
        </Typography>
        
        <Divider sx={{ my: 2 }} />
        
        <Box sx={{ mb: 3 }}>
          <Typography id="sensitivity-slider" gutterBottom>
            Alert Sensitivity: {sensitivity}%
          </Typography>
          <Slider
            value={sensitivity}
            onChange={onSensitivityChange}
            aria-labelledby="sensitivity-slider"
            valueLabelDisplay="auto"
            step={5}
            marks
            min={0}
            max={100}
          />
          <Typography variant="caption" color="text.secondary">
            Higher sensitivity may increase false positives
          </Typography>
        </Box>
        
        <Box sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={settings.enableFallDetection}
                onChange={(e) => onSettingChange('enableFallDetection', e.target.checked)}
                color="primary"
              />
            }
            label="Fall Detection"
          />
          <Typography variant="caption" color="text.secondary" display="block">
            Detect potential falls and send immediate alerts
          </Typography>
        </Box>
        
        <Box sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={settings.enableMotionTracking}
                onChange={(e) => onSettingChange('enableMotionTracking', e.target.checked)}
                color="primary"
              />
            }
            label="Motion Analysis"
          />
          <Typography variant="caption" color="text.secondary" display="block">
            Track and analyze movement patterns for abnormal behavior
          </Typography>
        </Box>
        
        <Box sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={settings.enableSleepDetection || false}
                onChange={(e) => onSettingChange('enableSleepDetection', e.target.checked)}
                color="primary"
              />
            }
            label="Sleep Pattern Detection"
          />
          <Typography variant="caption" color="text.secondary" display="block">
            Identify sleep patterns and monitor for disturbances
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default MLControlPanel;

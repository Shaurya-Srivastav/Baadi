import React, { useState } from 'react';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Divider,
  Switch,
  FormControlLabel,
  Slider,
  TextField,
  Button,
  Grid,
  Alert
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';

const Settings = () => {
  const { userProfile, updateUserProfile } = useAuth();
  const [settings, setSettings] = useState(userProfile?.settings || {
    alertSensitivity: 'medium',
    motionThreshold: 0.5,
    fallThreshold: 0.7,
    notificationPreferences: {
      email: true,
      push: true,
      sms: false
    }
  });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess(false);

      await updateUserProfile({
        settings
      });

      setSuccess(true);
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Failed to save settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchChange = (category, setting) => (event) => {
    if (category) {
      setSettings(prev => ({
        ...prev,
        [category]: {
          ...prev[category],
          [setting]: event.target.checked
        }
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        [setting]: event.target.checked
      }));
    }
  };

  const handleSliderChange = (setting) => (event, newValue) => {
    setSettings(prev => ({
      ...prev,
      [setting]: newValue
    }));
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Settings
        </Typography>

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Settings saved successfully!
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Notification Settings */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Notification Preferences
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.notificationPreferences?.email || false}
                      onChange={handleSwitchChange('notificationPreferences', 'email')}
                    />
                  }
                  label="Email Notifications"
                />
                <Typography variant="body2" color="text.secondary" sx={{ ml: 3, mb: 2 }}>
                  Receive alerts via email for critical events
                </Typography>

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.notificationPreferences?.push || false}
                      onChange={handleSwitchChange('notificationPreferences', 'push')}
                    />
                  }
                  label="Push Notifications"
                />
                <Typography variant="body2" color="text.secondary" sx={{ ml: 3, mb: 2 }}>
                  Receive mobile push notifications for immediate alerts
                </Typography>

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.notificationPreferences?.sms || false}
                      onChange={handleSwitchChange('notificationPreferences', 'sms')}
                    />
                  }
                  label="SMS Notifications"
                />
                <Typography variant="body2" color="text.secondary" sx={{ ml: 3 }}>
                  Receive text messages for critical alerts
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Alert Settings */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Alert Settings
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Typography gutterBottom>Motion Threshold</Typography>
                <Slider
                  value={settings.motionThreshold || 0.5}
                  onChange={handleSliderChange('motionThreshold')}
                  step={0.1}
                  marks
                  min={0.1}
                  max={1}
                  valueLabelDisplay="auto"
                  sx={{ mb: 3 }}
                />

                <Typography gutterBottom>Fall Detection Threshold</Typography>
                <Slider
                  value={settings.fallThreshold || 0.7}
                  onChange={handleSliderChange('fallThreshold')}
                  step={0.1}
                  marks
                  min={0.1}
                  max={1}
                  valueLabelDisplay="auto"
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Phone Numbers */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Emergency Contacts
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <TextField
                  label="Primary Emergency Contact"
                  fullWidth
                  margin="normal"
                  variant="outlined"
                  placeholder="Phone Number"
                  value={settings.emergencyContact1 || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    emergencyContact1: e.target.value
                  }))}
                />

                <TextField
                  label="Secondary Emergency Contact"
                  fullWidth
                  margin="normal"
                  variant="outlined"
                  placeholder="Phone Number"
                  value={settings.emergencyContact2 || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    emergencyContact2: e.target.value
                  }))}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Save Button */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={handleSaveSettings}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Settings'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default Settings;

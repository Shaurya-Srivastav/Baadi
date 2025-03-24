import React, { useState } from 'react';
import { 
  Container, 
  Box, 
  Paper, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon, 
  ListItemAvatar,
  Avatar,
  Divider, 
  Chip,
  IconButton,
  Grid,
  Card,
  CardContent,
  Badge,
  Tab,
  Tabs,
  Button
} from '@mui/material';
import { 
  Notifications as NotificationsIcon, 
  NotificationsActive as AlertIcon,
  Check as CheckIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  MarkChatRead as MarkReadIcon,
  PersonOutline as PersonIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import { useNotifications } from '../../contexts/NotificationContext';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`notifications-tabpanel-${index}`}
      aria-labelledby={`notifications-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function Notifications() {
  const { notifications, systemNotifications, markAlertAsRead } = useNotifications();
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Count unread notifications
  const unreadCount = notifications.filter(notif => !notif.read).length;

  // Mark a notification as read
  const handleMarkAsRead = async (notificationId) => {
    await markAlertAsRead(notificationId);
  };

  // Get icon based on notification type and severity
  const getNotificationIcon = (notification) => {
    if (notification.type === 'fall_detected' || notification.severity === 'critical') {
      return <ErrorIcon color="error" />;
    } else if (notification.type === 'motion_detected' || notification.severity === 'warning') {
      return <WarningIcon color="warning" />;
    } else if (notification.type === 'user_login' || notification.type === 'profile_update') {
      return <PersonIcon color="info" />;
    } else {
      return <InfoIcon color="primary" />;
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 8 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Notifications
          </Typography>
          
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon color="action" />
          </Badge>
        </Box>

        <Paper elevation={3} sx={{ mb: 4 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="notification tabs">
              <Tab 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <NotificationsIcon sx={{ mr: 1 }} />
                    My Notifications
                    {unreadCount > 0 && (
                      <Chip 
                        label={unreadCount} 
                        color="error" 
                        size="small" 
                        sx={{ ml: 1, height: 20, minWidth: 20 }} 
                      />
                    )}
                  </Box>
                } 
              />
              <Tab 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <AlertIcon sx={{ mr: 1 }} />
                    System Alerts
                  </Box>
                } 
              />
            </Tabs>
          </Box>

          {/* Personal Notifications Tab */}
          <TabPanel value={tabValue} index={0}>
            {notifications.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <NotificationsIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No notifications
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  You don't have any notifications yet
                </Typography>
              </Box>
            ) : (
              <List>
                {notifications.map((notification) => (
                  <React.Fragment key={notification.id}>
                    <ListItem
                      alignItems="flex-start"
                      secondaryAction={
                        !notification.read && (
                          <IconButton 
                            edge="end" 
                            aria-label="mark as read"
                            onClick={() => handleMarkAsRead(notification.id)}
                          >
                            <MarkReadIcon />
                          </IconButton>
                        )
                      }
                      sx={{
                        bgcolor: notification.read ? 'transparent' : 'action.hover',
                        position: 'relative'
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: notification.severity === 'critical' ? 'error.main' : 
                                              notification.severity === 'warning' ? 'warning.main' : 
                                              'primary.main' }}>
                          {getNotificationIcon(notification)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography
                              variant="subtitle1"
                              sx={{ fontWeight: notification.read ? 'normal' : 'bold' }}
                            >
                              {notification.title}
                            </Typography>
                            {!notification.read && (
                              <Chip 
                                label="New" 
                                color="primary" 
                                size="small" 
                                sx={{ ml: 1, height: 20 }} 
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <>
                            <Typography
                              component="span"
                              variant="body2"
                              color="text.primary"
                              sx={{ display: 'block' }}
                            >
                              {notification.message}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                              <TimeIcon fontSize="small" sx={{ mr: 0.5, fontSize: 16, color: 'text.secondary' }} />
                              <Typography
                                component="span"
                                variant="caption"
                                color="text.secondary"
                              >
                                {notification.timestamp?.toLocaleString() || 'Just now'}
                              </Typography>
                            </Box>
                          </>
                        }
                      />
                    </ListItem>
                    <Divider variant="inset" component="li" />
                  </React.Fragment>
                ))}
              </List>
            )}
          </TabPanel>

          {/* System Notifications Tab */}
          <TabPanel value={tabValue} index={1}>
            {systemNotifications.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <AlertIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No system alerts
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  There are no system-wide notifications at this time
                </Typography>
              </Box>
            ) : (
              <List>
                {systemNotifications.map((notification) => (
                  <React.Fragment key={notification.id}>
                    <ListItem
                      alignItems="flex-start"
                      sx={{ position: 'relative' }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'info.main' }}>
                          {getNotificationIcon(notification)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="subtitle1">
                            {notification.title}
                          </Typography>
                        }
                        secondary={
                          <>
                            <Typography
                              component="span"
                              variant="body2"
                              color="text.primary"
                              sx={{ display: 'block' }}
                            >
                              {notification.message}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                              <TimeIcon fontSize="small" sx={{ mr: 0.5, fontSize: 16, color: 'text.secondary' }} />
                              <Typography
                                component="span"
                                variant="caption"
                                color="text.secondary"
                              >
                                {notification.timestamp?.toLocaleString() || 'Just now'}
                              </Typography>
                            </Box>
                          </>
                        }
                      />
                    </ListItem>
                    <Divider variant="inset" component="li" />
                  </React.Fragment>
                ))}
              </List>
            )}
          </TabPanel>
        </Paper>

        {/* Notification Summary Cards */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Badge badgeContent={unreadCount} color="error" sx={{ mr: 2 }}>
                    <NotificationsIcon fontSize="large" color="primary" />
                  </Badge>
                  <Typography variant="h6">
                    My Notifications
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  You have {unreadCount} unread {unreadCount === 1 ? 'notification' : 'notifications'} and {notifications.length} total.
                </Typography>
                <Button 
                  variant="outlined" 
                  size="small" 
                  startIcon={<CheckIcon />}
                  sx={{ mt: 2 }}
                  disabled={unreadCount === 0}
                  onClick={() => {
                    // Mark all as read
                    notifications.forEach(notification => {
                      if (!notification.read) {
                        handleMarkAsRead(notification.id);
                      }
                    });
                  }}
                >
                  Mark All as Read
                </Button>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <WarningIcon fontSize="large" color="warning" sx={{ mr: 2 }} />
                  <Typography variant="h6">
                    Alerts
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {notifications.filter(n => n.severity === 'warning' || n.severity === 'critical').length} alert notifications in the last 24 hours.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <InfoIcon fontSize="large" color="info" sx={{ mr: 2 }} />
                  <Typography variant="h6">
                    System Status
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  All systems operational. {systemNotifications.length} system {systemNotifications.length === 1 ? 'notification' : 'notifications'} available.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}

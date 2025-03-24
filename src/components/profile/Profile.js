import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Box, 
  Paper, 
  Typography, 
  Avatar, 
  Grid, 
  Divider, 
  Button, 
  TextField, 
  IconButton, 
  Card, 
  CardContent, 
  Tabs, 
  Tab, 
  List, 
  ListItem, 
  ListItemText,
  ListItemAvatar,
  Chip,
  Snackbar,
  Alert
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Save as SaveIcon, 
  Cancel as CancelIcon, 
  PhotoCamera as PhotoCameraIcon,
  Message as MessageIcon,
  Person as PersonIcon,
  Timeline as TimelineIcon,
  Send as SendIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { doc, collection, setDoc, addDoc, query, where, orderBy, getDocs, Timestamp, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
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

export default function Profile() {
  const { currentUser, userProfile, updateUserProfile } = useAuth();
  const { createAlert } = useNotifications();
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [tabValue, setTabValue] = useState(0);
  const [familyMessages, setFamilyMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    bio: "",
    phoneNumber: "",
    address: "",
    emergencyContact: "",
    preferences: {
      theme: "light",
      notifications: true
    }
  });

  // Load user profile data
  useEffect(() => {
    if (userProfile) {
      setProfileData({
        firstName: userProfile.firstName || "",
        lastName: userProfile.lastName || "",
        bio: userProfile.bio || "",
        phoneNumber: userProfile.phoneNumber || "",
        address: userProfile.address || "",
        emergencyContact: userProfile.emergencyContact || "",
        preferences: userProfile.preferences || {
          theme: "light",
          notifications: true
        }
      });

      // Set profile image if available
      if (userProfile.profileImageUrl) {
        setProfileImageUrl(userProfile.profileImageUrl);
      }
    }
  }, [userProfile]);

  // Load family messages
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'familyMessages'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const messages = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      }));
      setFamilyMessages(messages);
    });

    return unsubscribe;
  }, [currentUser]);

  const handleProfileUpdate = async () => {
    setLoading(true);
    setError("");
    
    try {
      await updateUserProfile({
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        bio: profileData.bio,
        phoneNumber: profileData.phoneNumber,
        address: profileData.address,
        emergencyContact: profileData.emergencyContact,
        preferences: profileData.preferences
      });

      setEditMode(false);
      setSuccess("Profile updated successfully!");
      
      // Show notification
      createAlert({
        type: 'profile_update',
        severity: 'info',
        title: 'Profile Updated',
        message: 'Your profile information has been updated successfully.'
      });
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      setError("Failed to update profile: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setError("");

    try {
      // Create a reference to the storage location
      const storageRef = ref(storage, `profileImages/${currentUser.uid}`);
      
      // Upload the file
      await uploadBytes(storageRef, file);
      
      // Get download URL
      const downloadUrl = await getDownloadURL(storageRef);
      
      // Update profile with image URL
      await updateUserProfile({
        profileImageUrl: downloadUrl
      });
      
      setProfileImageUrl(downloadUrl);
      setSuccess("Profile image updated successfully!");
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      setError("Failed to upload image: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    try {
      await addDoc(collection(db, 'familyMessages'), {
        userId: currentUser.uid,
        senderName: `${userProfile.firstName} ${userProfile.lastName}`,
        senderRole: userProfile.role,
        message: newMessage,
        timestamp: Timestamp.now()
      });
      
      setNewMessage("");
      
      // Create alert for all family members
      createAlert({
        type: 'new_message',
        severity: 'info',
        title: 'New Family Message',
        message: `${userProfile.firstName} has posted a new message to the family board.`
      });
    } catch (error) {
      setError("Failed to send message: " + error.message);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 8 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          User Profile
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}
        
        <Paper elevation={3} sx={{ p: 0, overflow: 'hidden' }}>
          {/* Profile Header */}
          <Box 
            sx={{ 
              p: 4, 
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              color: 'white',
              position: 'relative'
            }}
          >
            <Grid container spacing={3} alignItems="center">
              <Grid item>
                <Box sx={{ position: 'relative' }}>
                  <Avatar 
                    src={profileImageUrl} 
                    alt={`${profileData.firstName} ${profileData.lastName}`}
                    sx={{ width: 120, height: 120, border: '4px solid white' }}
                  >
                    {profileData.firstName.charAt(0)}{profileData.lastName.charAt(0)}
                  </Avatar>
                  
                  <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="icon-button-file"
                    type="file"
                    onChange={handleImageUpload}
                  />
                  <label htmlFor="icon-button-file">
                    <IconButton 
                      color="primary" 
                      aria-label="upload picture" 
                      component="span"
                      sx={{ 
                        position: 'absolute', 
                        bottom: 0, 
                        right: 0, 
                        bgcolor: 'white',
                        '&:hover': { bgcolor: '#f5f5f5' }
                      }}
                    >
                      <PhotoCameraIcon />
                    </IconButton>
                  </label>
                </Box>
              </Grid>
              
              <Grid item xs>
                <Typography variant="h4">
                  {profileData.firstName} {profileData.lastName}
                </Typography>
                <Typography variant="subtitle1">
                  {userProfile?.role === 'patient' ? 'Patient' : 
                   userProfile?.role === 'primary_caregiver' ? 'Primary Caregiver' : 
                   userProfile?.role === 'secondary_caregiver' ? 'Secondary Caregiver' : 
                   'Family Member'}
                </Typography>
                <Typography variant="body1" sx={{ mt: 1 }}>
                  {editMode ? (
                    <TextField
                      multiline
                      fullWidth
                      variant="outlined"
                      size="small"
                      placeholder="Write a short bio..."
                      value={profileData.bio}
                      onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                      sx={{ bgcolor: 'rgba(255, 255, 255, 0.8)', mt: 1 }}
                    />
                  ) : (
                    profileData.bio || "No bio provided yet."
                  )}
                </Typography>
              </Grid>
              
              <Grid item>
                {editMode ? (
                  <Box>
                    <Button 
                      variant="contained" 
                      startIcon={<SaveIcon />}
                      onClick={handleProfileUpdate}
                      disabled={loading}
                      sx={{ mr: 1 }}
                    >
                      Save
                    </Button>
                    <Button 
                      variant="outlined" 
                      startIcon={<CancelIcon />}
                      onClick={() => setEditMode(false)}
                      sx={{ bgcolor: 'white' }}
                    >
                      Cancel
                    </Button>
                  </Box>
                ) : (
                  <Button 
                    variant="contained" 
                    startIcon={<EditIcon />}
                    onClick={() => setEditMode(true)}
                    sx={{ bgcolor: 'white', color: 'primary.main' }}
                  >
                    Edit Profile
                  </Button>
                )}
              </Grid>
            </Grid>
          </Box>
          
          {/* Profile Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="profile tabs">
              <Tab label="Profile Information" icon={<PersonIcon />} iconPosition="start" />
              <Tab label="Family Board" icon={<MessageIcon />} iconPosition="start" />
              <Tab label="Activity" icon={<TimelineIcon />} iconPosition="start" />
            </Tabs>
          </Box>

          {/* Profile Information Tab */}
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Contact Information
                    </Typography>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="First Name"
                          value={profileData.firstName}
                          onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
                          disabled={!editMode}
                          margin="normal"
                        />
                      </Grid>
                      
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Last Name"
                          value={profileData.lastName}
                          onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
                          disabled={!editMode}
                          margin="normal"
                        />
                      </Grid>
                      
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Email Address"
                          value={currentUser?.email}
                          disabled={true}
                          margin="normal"
                        />
                      </Grid>
                      
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Phone Number"
                          value={profileData.phoneNumber}
                          onChange={(e) => setProfileData({...profileData, phoneNumber: e.target.value})}
                          disabled={!editMode}
                          margin="normal"
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Additional Information
                    </Typography>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Address"
                          value={profileData.address}
                          onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                          disabled={!editMode}
                          margin="normal"
                          multiline
                          rows={2}
                        />
                      </Grid>
                      
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Emergency Contact"
                          value={profileData.emergencyContact}
                          onChange={(e) => setProfileData({...profileData, emergencyContact: e.target.value})}
                          disabled={!editMode}
                          margin="normal"
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
                
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Account Settings
                    </Typography>
                    
                    <Box sx={{ mt: 2 }}>
                      <Chip 
                        label={`Role: ${userProfile?.role || 'User'}`} 
                        color="primary" 
                        sx={{ mr: 1, mb: 1 }}
                      />
                      <Chip 
                        label={`Account Created: ${currentUser?.metadata?.creationTime || 'Unknown'}`} 
                        variant="outlined" 
                        sx={{ mb: 1 }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Family Board Tab */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Family Message Board
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Use this board to leave messages, notes, and updates for your family members.
              </Typography>
              
              <Box sx={{ mt: 3, display: 'flex' }}>
                <TextField
                  fullWidth
                  label="Write a message to the family"
                  multiline
                  rows={2}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  sx={{ mr: 2 }}
                />
                <Button 
                  variant="contained" 
                  endIcon={<SendIcon />}
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  sx={{ alignSelf: 'flex-end', mb: 1 }}
                >
                  Send
                </Button>
              </Box>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
              {familyMessages.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ p: 3 }}>
                  No messages yet. Be the first to post!
                </Typography>
              ) : (
                familyMessages.map((message) => (
                  <React.Fragment key={message.id}>
                    <ListItem alignItems="flex-start">
                      <ListItemAvatar>
                        <Avatar>
                          {message.senderName.charAt(0)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography
                              component="span"
                              variant="subtitle1"
                            >
                              {message.senderName}
                              <Chip
                                label={message.senderRole}
                                size="small"
                                sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                              />
                            </Typography>
                            <Typography
                              component="span"
                              variant="body2"
                              color="text.secondary"
                            >
                              {message.timestamp?.toLocaleString() || 'Just now'}
                            </Typography>
                          </Box>
                        }
                        secondary={message.message}
                      />
                    </ListItem>
                    <Divider variant="inset" component="li" />
                  </React.Fragment>
                ))
              )}
            </List>
          </TabPanel>

          {/* Activity Tab */}
          <TabPanel value={tabValue} index={2}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            
            <Timeline />
          </TabPanel>
        </Paper>
      </Box>
    </Container>
  );
}

// Simple Timeline Component
function Timeline() {
  return (
    <Box sx={{ p: 2 }}>
      <List>
        {[...Array(5)].map((_, i) => (
          <ListItem key={i} sx={{ pb: 2 }}>
            <ListItemAvatar>
              <Avatar sx={{ bgcolor: i % 2 === 0 ? 'primary.main' : 'secondary.main' }}>
                {i % 2 === 0 ? <PersonIcon /> : <TimelineIcon />}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={`${i % 2 === 0 ? 'Login Activity' : 'Profile Update'} ${i + 1}`}
              secondary={`${new Date(Date.now() - i * 86400000).toLocaleDateString()} - ${i % 2 === 0 ? 'User logged in successfully' : 'User updated their profile information'}`}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}

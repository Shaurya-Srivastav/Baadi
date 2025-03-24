import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Container, 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Card, 
  CardContent,
  Alert,
  MenuItem,
  Grid,
  Stepper,
  Step,
  StepLabel,
  CircularProgress
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';

const steps = ['Account Information', 'Personal Details', 'Role Selection'];

// Email validation regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export default function Register() {
  const [activeStep, setActiveStep] = useState(0);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('caregiver');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  
  const { signup, checkEmailExists } = useAuth();
  const navigate = useNavigate();

  // Email validation with debounce
  useEffect(() => {
    if (!email) {
      setEmailError('');
      return;
    }

    if (!EMAIL_REGEX.test(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    const checkEmail = async () => {
      setCheckingEmail(true);
      try {
        const exists = await checkEmailExists(email);
        if (exists) {
          setEmailError('Email is already in use. Please try a different email.');
        } else {
          setEmailError('');
        }
      } catch (error) {
        console.error('Error checking email:', error);
      } finally {
        setCheckingEmail(false);
      }
    };

    const timer = setTimeout(checkEmail, 500);
    return () => clearTimeout(timer);
  }, [email, checkEmailExists]);

  const validateStep = () => {
    if (activeStep === 0) {
      if (!email) {
        setError('Email is required');
        return false;
      }
      if (emailError) {
        setError(emailError);
        return false;
      }
      if (!password) {
        setError('Password is required');
        return false;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return false;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return false;
      }
    } else if (activeStep === 1) {
      if (!firstName) {
        setError('First name is required');
        return false;
      }
      if (!lastName) {
        setError('Last name is required');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    setError('');
    if (!validateStep()) return;
    
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setError('');
    setActiveStep((prevStep) => prevStep - 1);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    
    // Final validation before submission
    if (!validateStep()) return;

    try {
      setError('');
      setLoading(true);
      
      await signup(email, password, firstName, lastName, role);
      navigate('/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
      if (error.code === 'auth/email-already-in-use') {
        setError('Email is already in use. Please try a different email or login.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email format. Please enter a valid email address.');
      } else if (error.code === 'auth/weak-password') {
        setError('Password is too weak. Please choose a stronger password.');
      } else if (error.code === 'permission-denied') {
        setError('You do not have permission to register. Please contact support.');
      } else {
        setError('Failed to create an account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          marginTop: 4,
          marginBottom: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h4" gutterBottom>
          Remote Patient Monitoring - Baadi
        </Typography>
        
        <Card sx={{ width: '100%', mt: 3 }}>
          <CardContent>
            <Typography component="h2" variant="h5" align="center" gutterBottom>
              Create an Account
            </Typography>

            <Stepper activeStep={activeStep} sx={{ mt: 3, mb: 4 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Box component="form" onSubmit={activeStep === 2 ? handleSubmit : undefined} noValidate>
              {activeStep === 0 && (
                <>
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="email"
                    label="Email Address"
                    name="email"
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={!!emailError}
                    helperText={emailError}
                    InputProps={{
                      endAdornment: checkingEmail ? (
                        <CircularProgress color="inherit" size={20} />
                      ) : null,
                    }}
                  />
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    name="password"
                    label="Password"
                    type="password"
                    id="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    name="confirmPassword"
                    label="Confirm Password"
                    type="password"
                    id="confirmPassword"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </>
              )}
              
              {activeStep === 1 && (
                <>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="firstName"
                        label="First Name"
                        name="firstName"
                        autoComplete="given-name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="lastName"
                        label="Last Name"
                        name="lastName"
                        autoComplete="family-name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                      />
                    </Grid>
                  </Grid>
                </>
              )}
              
              {activeStep === 2 && (
                <>
                  <TextField
                    select
                    margin="normal"
                    required
                    fullWidth
                    id="role"
                    label="Your Role"
                    name="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    helperText="Please select your role in patient care"
                  >
                    <MenuItem value="caregiver">Primary Caregiver</MenuItem>
                    <MenuItem value="secondary_caregiver">Secondary Caregiver</MenuItem>
                    <MenuItem value="family_member">Family Member</MenuItem>
                    <MenuItem value="patient">Patient</MenuItem>
                  </TextField>
                </>
              )}
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                <Button
                  disabled={activeStep === 0}
                  onClick={handleBack}
                  variant="outlined"
                >
                  Back
                </Button>
                
                {activeStep === steps.length - 1 ? (
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={loading || checkingEmail}
                  >
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    disabled={checkingEmail}
                  >
                    Next
                  </Button>
                )}
              </Box>
              
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Link to="/login" style={{ textDecoration: 'none' }}>
                  <Typography variant="body2" color="primary">
                    Already have an account? Sign In
                  </Typography>
                </Link>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}

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
  CircularProgress,
  InputAdornment,
  IconButton
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const steps = ['Account Information', 'Personal Details', 'Role Selection'];

// Email validation regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export default function Register() {
  const [activeStep, setActiveStep] = useState(0);

  // Form fields
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('caregiver');

  // UI / state
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const { signup, checkEmailExists } = useAuth();
  const navigate = useNavigate();

  // ------------------------------------------------
  // Email validation with debounce
  // ------------------------------------------------
  useEffect(() => {
    if (!email) {
      setEmailError('');
      return;
    }

    // Basic client-side validation
    if (!EMAIL_REGEX.test(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    // Check email availability (debounced)
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

  // ------------------------------------------------
  // Step validation
  // ------------------------------------------------
  const validateStep = (stepIndex) => {
    // Clear any existing error
    setError('');

    // Step 0: Account Information
    if (stepIndex === 0) {
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
    }

    // Step 1: Personal Details
    if (stepIndex === 1) {
      if (!firstName) {
        setError('First name is required');
        return false;
      }
      if (!lastName) {
        setError('Last name is required');
        return false;
      }
    }

    // Step 2: Role Selection
    // (No specific validations other than you have a role selected; you do by default.)
    return true;
  };

  // ------------------------------------------------
  // Next/Back logic
  // ------------------------------------------------
  const handleNext = () => {
    // Validate the current step
    if (!validateStep(activeStep)) return;

    // Persist form state in localStorage
    localStorage.setItem('registerFormState', JSON.stringify({
      email,
      password,
      confirmPassword,
      firstName,
      lastName,
      role
    }));

    // Move to the next step
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setError('');
    setActiveStep((prev) => prev - 1);
  };

  // ------------------------------------------------
  // Load & cleanup form state from localStorage
  // ------------------------------------------------
  useEffect(() => {
    const savedState = localStorage.getItem('registerFormState');
    if (savedState) {
      const {
        email: savedEmail,
        password: savedPassword,
        confirmPassword: savedConfirmPassword,
        firstName: savedFirstName,
        lastName: savedLastName,
        role: savedRole
      } = JSON.parse(savedState);
      
      setEmail(savedEmail || '');
      setPassword(savedPassword || '');
      setConfirmPassword(savedConfirmPassword || '');
      setFirstName(savedFirstName || '');
      setLastName(savedLastName || '');
      setRole(savedRole || 'caregiver');
    }
  }, []);

  useEffect(() => {
    // Cleanup local storage on unmount
    return () => {
      localStorage.removeItem('registerFormState');
    };
  }, []);

  // ------------------------------------------------
  // Final form submission
  // ------------------------------------------------
  async function handleSubmit() {
    // Validate the final step (role selection),
    // so we check activeStep=2 if needed
    if (!validateStep(activeStep)) return;

    try {
      setError('');
      setLoading(true);
      
      await signup(email, password, firstName, lastName, role);
      navigate('/dashboard');
    } catch (err) {
      console.error('Registration error:', err);
      setError('Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ------------------------------------------------
  // Toggle password visibility
  // ------------------------------------------------
  const handleClickShowPassword = () => setShowPassword((show) => !show);
  const handleClickShowConfirmPassword = () => setShowConfirmPassword((show) => !show);

  // ------------------------------------------------
  // Rendering
  // ------------------------------------------------
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

            {/* We are NOT using a <form> here for a multi-step approach */}
            {/* This prevents the browser from submitting/reloading automatically */}
            <Box>
              {/* Step 0: Account Info */}
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
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={handleClickShowPassword}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    name="confirmPassword"
                    label="Confirm Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={handleClickShowConfirmPassword}
                            edge="end"
                          >
                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </>
              )}
              
              {/* Step 1: Personal Details */}
              {activeStep === 1 && (
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
              )}
              
              {/* Step 2: Role Selection */}
              {activeStep === 2 && (
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
              )}
              
              {/* Navigation Buttons */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                <Button
                  disabled={activeStep === 0}
                  onClick={handleBack}
                  variant="outlined"
                  type="button"
                >
                  Back
                </Button>
                
                {activeStep === steps.length - 1 ? (
                  // Final Step => Create Account
                  <Button
                    variant="contained"
                    color="primary"
                    disabled={loading || checkingEmail}
                    type="button"
                    onClick={handleSubmit}
                  >
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                ) : (
                  // Intermediate Step => Next
                  <Button
                    variant="contained"
                    disabled={checkingEmail}
                    type="button"  // Prevent default submit
                    onClick={handleNext}
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

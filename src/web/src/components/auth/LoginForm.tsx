import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Divider,
  Alert,
  IconButton,
  InputAdornment,
  FormControlLabel,
  Checkbox,
  Paper
} from '@mui/material'; // ^5.0.0
import { Visibility, VisibilityOff } from '@mui/icons-material'; // ^5.0.0
import { useAuth } from '../../hooks/useAuth';
import { useForm } from '../../hooks/useForm';
import { useTheme } from '../../hooks/useTheme';
import { validateEmail, validatePassword } from '../../utils/validation.utils';
import { VALIDATION_MESSAGES } from '../../constants/validation.constants';

// Styled components for enhanced visual presentation
const LoginContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  maxWidth: 400,
  margin: '0 auto',
  marginTop: theme.spacing(8),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(3),
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(3),
    marginTop: theme.spacing(4)
  }
}));

const FormDivider = styled(Divider)(({ theme }) => ({
  margin: theme.spacing(3, 0),
  '&::before, &::after': {
    borderColor: theme.palette.divider
  }
}));

// Initial form values
const initialValues = {
  email: '',
  password: '',
  rememberMe: false
};

// Validation rules
const validationRules = {
  email: {
    required: true,
    validate: validateEmail,
    errorMessage: VALIDATION_MESSAGES.INVALID_EMAIL
  },
  password: {
    required: true,
    validate: validatePassword,
    errorMessage: VALIDATION_MESSAGES.INVALID_PASSWORD
  }
};

interface LoginFormProps {
  onSuccess?: () => void;
  redirectUrl?: string;
  providers?: Array<'azure' | 'google'>;
  csrfToken?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  redirectUrl = '/dashboard',
  providers = ['azure'],
  csrfToken
}) => {
  const navigate = useNavigate();
  const { login, loginWithProvider, loading, error } = useAuth();
  const { theme } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);

  // Initialize form with validation
  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldError
  } = useForm(initialValues, validationRules, handleLogin);

  // Handle rate limiting
  useEffect(() => {
    if (loginAttempts >= 5) {
      const timeout = setTimeout(() => setLoginAttempts(0), 900000); // 15 minutes
      return () => clearTimeout(timeout);
    }
  }, [loginAttempts]);

  // Handle form submission
  async function handleLogin() {
    if (loginAttempts >= 5) {
      setFieldError('submit', 'Too many login attempts. Please try again later.');
      return;
    }

    try {
      await login({
        email: values.email,
        password: values.password,
        rememberMe: values.rememberMe,
        csrfToken
      });

      setLoginAttempts(0);
      if (onSuccess) {
        onSuccess();
      }
      navigate(redirectUrl);
    } catch (error) {
      setLoginAttempts(prev => prev + 1);
      console.error('Login error:', error);
    }
  }

  // Handle OAuth login
  const handleOAuthLogin = useCallback(async (provider: string) => {
    try {
      await loginWithProvider(provider);
      if (onSuccess) {
        onSuccess();
      }
      navigate(redirectUrl);
    } catch (error) {
      console.error('OAuth login error:', error);
    }
  }, [loginWithProvider, onSuccess, navigate, redirectUrl]);

  return (
    <LoginContainer elevation={3}>
      <Typography variant="h4" component="h1" align="center" gutterBottom>
        Sign In
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <TextField
          fullWidth
          id="email"
          name="email"
          label="Email Address"
          type="email"
          value={values.email}
          onChange={handleChange}
          onBlur={handleBlur}
          error={touched.email && Boolean(errors.email)}
          helperText={touched.email && errors.email}
          disabled={loading || loginAttempts >= 5}
          margin="normal"
          required
          autoComplete="email"
          autoFocus
          inputProps={{
            'aria-label': 'Email Address',
            'data-testid': 'email-input'
          }}
        />

        <TextField
          fullWidth
          id="password"
          name="password"
          label="Password"
          type={showPassword ? 'text' : 'password'}
          value={values.password}
          onChange={handleChange}
          onBlur={handleBlur}
          error={touched.password && Boolean(errors.password)}
          helperText={touched.password && errors.password}
          disabled={loading || loginAttempts >= 5}
          margin="normal"
          required
          autoComplete="current-password"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            )
          }}
        />

        <FormControlLabel
          control={
            <Checkbox
              name="rememberMe"
              checked={values.rememberMe}
              onChange={handleChange}
              color="primary"
            />
          }
          label="Remember me"
        />

        <Button
          fullWidth
          type="submit"
          variant="contained"
          color="primary"
          size="large"
          disabled={loading || loginAttempts >= 5}
          sx={{ mt: 3, mb: 2 }}
        >
          {loading ? <CircularProgress size={24} /> : 'Sign In'}
        </Button>
      </form>

      {providers && providers.length > 0 && (
        <>
          <FormDivider>
            <Typography variant="body2" color="textSecondary">
              OR
            </Typography>
          </FormDivider>

          <Box display="flex" flexDirection="column" gap={2}>
            {providers.map(provider => (
              <Button
                key={provider}
                fullWidth
                variant="outlined"
                onClick={() => handleOAuthLogin(provider)}
                disabled={loading || loginAttempts >= 5}
                startIcon={<img src={`/icons/${provider}.svg`} alt="" width={20} height={20} />}
              >
                Continue with {provider.charAt(0).toUpperCase() + provider.slice(1)}
              </Button>
            ))}
          </Box>
        </>
      )}

      <Box mt={2} textAlign="center">
        <Typography variant="body2">
          <Button
            color="primary"
            onClick={() => navigate('/forgot-password')}
            disabled={loading}
          >
            Forgot password?
          </Button>
        </Typography>
      </Box>
    </LoginContainer>
  );
};

export default LoginForm;
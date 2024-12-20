import React from 'react';
import { render, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from '@axe-core/react';
import LoginForm from '../../../../src/components/auth/LoginForm';
import { useAuth } from '../../../../src/hooks/useAuth';
import { VALIDATION_MESSAGES } from '../constants/validation.constants';

// Mock useAuth hook
jest.mock('../../../../src/hooks/useAuth', () => ({
  useAuth: jest.fn()
}));

// Mock useNavigate hook
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn()
}));

// Test data
const validCredentials = {
  email: 'test@example.com',
  password: 'Test@123456',
  rememberMe: false
};

const mockOAuthProviders = ['azure', 'google'];

// Helper function to render LoginForm with necessary providers
const renderLoginForm = (props = {}) => {
  const defaultProps = {
    onSuccess: jest.fn(),
    redirectUrl: '/dashboard',
    providers: mockOAuthProviders,
    csrfToken: 'mock-csrf-token',
    ...props
  };

  return render(<LoginForm {...defaultProps} />);
};

describe('LoginForm Component', () => {
  // Reset mocks before each test
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({
      login: jest.fn(),
      loginWithProvider: jest.fn(),
      loading: false,
      error: null
    });
  });

  describe('Form Rendering and Accessibility', () => {
    it('should render all form elements correctly', () => {
      renderLoginForm();

      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /remember me/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should meet WCAG 2.1 Level AA standards', async () => {
      const { container } = renderLoginForm();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should support keyboard navigation', () => {
      renderLoginForm();
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const rememberMeCheckbox = screen.getByRole('checkbox');
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      emailInput.focus();
      expect(document.activeElement).toBe(emailInput);
      
      userEvent.tab();
      expect(document.activeElement).toBe(passwordInput);
      
      userEvent.tab();
      expect(document.activeElement).toBe(rememberMeCheckbox);
      
      userEvent.tab();
      expect(document.activeElement).toBe(signInButton);
    });
  });

  describe('Form Validation', () => {
    it('should validate required fields', async () => {
      renderLoginForm();
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.click(signInButton);

      await waitFor(() => {
        expect(screen.getByText(VALIDATION_MESSAGES.REQUIRED_FIELD)).toBeInTheDocument();
      });
    });

    it('should validate email format', async () => {
      renderLoginForm();
      const emailInput = screen.getByLabelText(/email address/i);

      await userEvent.type(emailInput, 'invalid-email');
      fireEvent.blur(emailInput);

      await waitFor(() => {
        expect(screen.getByText(VALIDATION_MESSAGES.INVALID_EMAIL)).toBeInTheDocument();
      });
    });

    it('should validate password requirements', async () => {
      renderLoginForm();
      const passwordInput = screen.getByLabelText(/password/i);

      await userEvent.type(passwordInput, 'weak');
      fireEvent.blur(passwordInput);

      await waitFor(() => {
        expect(screen.getByText(VALIDATION_MESSAGES.INVALID_PASSWORD)).toBeInTheDocument();
      });
    });
  });

  describe('Authentication Flow', () => {
    it('should handle successful login', async () => {
      const mockLogin = jest.fn().mockResolvedValue({});
      (useAuth as jest.Mock).mockReturnValue({
        login: mockLogin,
        loading: false,
        error: null
      });

      const onSuccess = jest.fn();
      renderLoginForm({ onSuccess });

      await userEvent.type(screen.getByLabelText(/email address/i), validCredentials.email);
      await userEvent.type(screen.getByLabelText(/password/i), validCredentials.password);
      
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          ...validCredentials,
          csrfToken: 'mock-csrf-token'
        });
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('should handle login failure', async () => {
      const errorMessage = 'Invalid credentials';
      (useAuth as jest.Mock).mockReturnValue({
        login: jest.fn().mockRejectedValue(new Error(errorMessage)),
        loading: false,
        error: errorMessage
      });

      renderLoginForm();

      await userEvent.type(screen.getByLabelText(/email address/i), validCredentials.email);
      await userEvent.type(screen.getByLabelText(/password/i), validCredentials.password);
      
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should handle OAuth authentication', async () => {
      const mockLoginWithProvider = jest.fn().mockResolvedValue({});
      (useAuth as jest.Mock).mockReturnValue({
        loginWithProvider: mockLoginWithProvider,
        loading: false,
        error: null
      });

      renderLoginForm();

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(mockLoginWithProvider).toHaveBeenCalledWith('google');
      });
    });
  });

  describe('Security Features', () => {
    it('should handle rate limiting', async () => {
      const mockLogin = jest.fn().mockRejectedValue(new Error('Too many attempts'));
      (useAuth as jest.Mock).mockReturnValue({
        login: mockLogin,
        loading: false,
        error: 'Too many attempts'
      });

      renderLoginForm();

      for (let i = 0; i < 6; i++) {
        fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
      }

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled();
        expect(screen.getByText(/too many attempts/i)).toBeInTheDocument();
      });
    });

    it('should handle session timeout', async () => {
      const mockLogin = jest.fn().mockRejectedValue(new Error('Session expired'));
      (useAuth as jest.Mock).mockReturnValue({
        login: mockLogin,
        loading: false,
        error: 'Session expired'
      });

      renderLoginForm();

      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(/session expired/i)).toBeInTheDocument();
      });
    });

    it('should include CSRF token in requests', async () => {
      const mockLogin = jest.fn().mockResolvedValue({});
      (useAuth as jest.Mock).mockReturnValue({
        login: mockLogin,
        loading: false,
        error: null
      });

      renderLoginForm();

      await userEvent.type(screen.getByLabelText(/email address/i), validCredentials.email);
      await userEvent.type(screen.getByLabelText(/password/i), validCredentials.password);
      
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith(expect.objectContaining({
          csrfToken: 'mock-csrf-token'
        }));
      });
    });
  });
});
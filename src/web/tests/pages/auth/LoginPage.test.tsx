/**
 * @fileoverview Test suite for LoginPage component
 * Implements comprehensive testing for authentication flows, accessibility,
 * and security features following WCAG 2.1 Level AA standards
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { vi } from 'vitest';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { axe } from '@axe-core/react';
import LoginPage from '../../src/pages/auth/LoginPage';
import { useAuth } from '../../src/hooks/useAuth';

// Mock hooks and modules
vi.mock('../../src/hooks/useAuth');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

// Helper function to render component with router context
const renderWithRouter = (
  ui: React.ReactElement,
  { route = '/login', authState = {} } = {}
) => {
  return {
    ...render(
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/login" element={ui} />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
          <Route path="/mfa-verification" element={<div>MFA Verification</div>} />
        </Routes>
      </MemoryRouter>
    ),
  };
};

describe('LoginPage Component', () => {
  // Setup before each test
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockImplementation(() => ({
      isAuthenticated: false,
      loading: false,
      error: null,
      login: vi.fn(),
      mfaRequired: false
    }));
  });

  describe('Accessibility Compliance', () => {
    it('should meet WCAG 2.1 Level AA standards', async () => {
      const { container } = renderWithRouter(<LoginPage />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should support keyboard navigation', () => {
      renderWithRouter(<LoginPage />);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Test tab order
      emailInput.focus();
      expect(document.activeElement).toBe(emailInput);
      fireEvent.keyDown(emailInput, { key: 'Tab' });
      expect(document.activeElement).toBe(passwordInput);
      fireEvent.keyDown(passwordInput, { key: 'Tab' });
      expect(document.activeElement).toBe(submitButton);
    });

    it('should announce form errors to screen readers', async () => {
      renderWithRouter(<LoginPage />);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.click(submitButton);
      
      await waitFor(() => {
        const errorMessages = screen.getAllByRole('alert');
        expect(errorMessages.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Form Validation and Security', () => {
    it('should validate email format', async () => {
      renderWithRouter(<LoginPage />);
      const emailInput = screen.getByLabelText(/email/i);

      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.blur(emailInput);

      await waitFor(() => {
        expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
      });
    });

    it('should validate password requirements', async () => {
      renderWithRouter(<LoginPage />);
      const passwordInput = screen.getByLabelText(/password/i);

      fireEvent.change(passwordInput, { target: { value: 'weak' } });
      fireEvent.blur(passwordInput);

      await waitFor(() => {
        expect(screen.getByText(/password must be/i)).toBeInTheDocument();
      });
    });

    it('should prevent XSS in error messages', async () => {
      const mockLogin = vi.fn().mockRejectedValue(new Error('<script>alert("xss")</script>'));
      (useAuth as any).mockImplementation(() => ({
        login: mockLogin,
        isAuthenticated: false,
        loading: false
      }));

      renderWithRouter(<LoginPage />);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByRole('alert');
        expect(errorMessage.innerHTML).not.toContain('<script>');
      });
    });

    it('should handle rate limiting feedback', async () => {
      const mockLogin = vi.fn()
        .mockRejectedValueOnce(new Error('Invalid credentials'))
        .mockRejectedValueOnce(new Error('Invalid credentials'))
        .mockRejectedValueOnce(new Error('Too many attempts'));

      (useAuth as any).mockImplementation(() => ({
        login: mockLogin,
        isAuthenticated: false,
        loading: false
      }));

      renderWithRouter(<LoginPage />);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Attempt multiple logins
      for (let i = 0; i < 3; i++) {
        fireEvent.click(submitButton);
        await waitFor(() => {});
      }

      expect(screen.getByText(/too many attempts/i)).toBeInTheDocument();
    });
  });

  describe('Authentication Flows', () => {
    it('should handle successful login', async () => {
      const mockLogin = vi.fn().mockResolvedValue({});
      (useAuth as any).mockImplementation(() => ({
        login: mockLogin,
        isAuthenticated: true,
        loading: false
      }));

      renderWithRouter(<LoginPage />);
      
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'Password123!'
        });
      });
    });

    it('should handle MFA flow', async () => {
      (useAuth as any).mockImplementation(() => ({
        login: vi.fn().mockResolvedValue({}),
        isAuthenticated: true,
        loading: false,
        mfaRequired: true
      }));

      renderWithRouter(<LoginPage />);
      
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(window.location.pathname).toBe('/mfa-verification');
      });
    });

    it('should handle login errors', async () => {
      const mockLogin = vi.fn().mockRejectedValue(new Error('Invalid credentials'));
      (useAuth as any).mockImplementation(() => ({
        login: mockLogin,
        isAuthenticated: false,
        loading: false,
        error: 'Invalid credentials'
      }));

      renderWithRouter(<LoginPage />);
      
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading state during authentication', async () => {
      (useAuth as any).mockImplementation(() => ({
        login: vi.fn(),
        isAuthenticated: false,
        loading: true
      }));

      renderWithRouter(<LoginPage />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should handle network errors', async () => {
      const mockLogin = vi.fn().mockRejectedValue(new Error('Network error'));
      (useAuth as any).mockImplementation(() => ({
        login: mockLogin,
        isAuthenticated: false,
        loading: false
      }));

      renderWithRouter(<LoginPage />);
      
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });
  });
});
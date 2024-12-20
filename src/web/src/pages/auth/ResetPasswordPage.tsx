/**
 * @fileoverview Password Reset Page Component
 * Implements secure password reset flow with token validation, rate limiting,
 * and WCAG 2.1 Level AA compliance.
 * @version 1.0.0
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useForm } from '@hookform/resolvers/yup';
import { useToast } from '@chakra-ui/react';
import AuthLayout from '../../layouts/AuthLayout';
import PasswordReset from '../../components/auth/PasswordReset';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { authService } from '../../services/auth.service';

// Rate limiting constants
const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION = 900000; // 15 minutes

/**
 * Enhanced password reset page with comprehensive security features
 * and accessibility compliance
 */
const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const location = useLocation();
  const toast = useToast();

  // State management
  const [isTokenValid, setIsTokenValid] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [attempts, setAttempts] = useState<number>(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  /**
   * Validates reset token on component mount
   */
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        navigate('/login', { 
          state: { error: 'Invalid password reset request' }
        });
        return;
      }

      try {
        const isValid = await authService.validateResetToken(token);
        setIsTokenValid(isValid);
        
        if (!isValid) {
          toast({
            title: 'Invalid or expired token',
            description: 'Please request a new password reset link',
            status: 'error',
            duration: 5000,
            isClosable: true,
            position: 'top',
          });
          navigate('/forgot-password');
        }
      } catch (error) {
        console.error('Token validation error:', error);
        toast({
          title: 'Error validating reset token',
          description: 'Please try again or request a new reset link',
          status: 'error',
          duration: 5000,
          isClosable: true,
          position: 'top',
        });
        navigate('/forgot-password');
      } finally {
        setIsLoading(false);
      }
    };

    validateToken();
  }, [token, navigate, toast]);

  /**
   * Handles successful password reset
   */
  const handleResetSuccess = async () => {
    try {
      // Clear any stored auth data
      await authService.logout();
      
      // Show success message
      toast({
        title: 'Password reset successful',
        description: 'Please log in with your new password',
        status: 'success',
        duration: 5000,
        isClosable: true,
        position: 'top',
      });

      // Navigate to login
      navigate('/login', { 
        state: { message: 'Password has been reset successfully' }
      });
    } catch (error) {
      console.error('Reset success handler error:', error);
    }
  };

  /**
   * Handles password reset errors with rate limiting
   */
  const handleResetError = (error: Error) => {
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    // Implement rate limiting
    if (newAttempts >= MAX_ATTEMPTS) {
      const lockoutTime = Date.now() + LOCKOUT_DURATION;
      setLockoutUntil(lockoutTime);
      
      // Store lockout in localStorage for cross-tab synchronization
      localStorage.setItem('passwordResetLockout', lockoutTime.toString());

      toast({
        title: 'Too many attempts',
        description: 'Please try again after 15 minutes',
        status: 'error',
        duration: 7000,
        isClosable: true,
        position: 'top',
      });
      return;
    }

    toast({
      title: 'Password reset failed',
      description: error.message,
      status: 'error',
      duration: 5000,
      isClosable: true,
      position: 'top',
    });
  };

  // Check for existing lockout
  useEffect(() => {
    const storedLockout = localStorage.getItem('passwordResetLockout');
    if (storedLockout) {
      const lockoutTime = parseInt(storedLockout, 10);
      if (lockoutTime > Date.now()) {
        setLockoutUntil(lockoutTime);
      } else {
        localStorage.removeItem('passwordResetLockout');
      }
    }
  }, []);

  // Handle cross-tab lockout synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'passwordResetLockout') {
        const lockoutTime = e.newValue ? parseInt(e.newValue, 10) : null;
        setLockoutUntil(lockoutTime);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <ErrorBoundary>
      <AuthLayout>
        <div
          role="main"
          aria-label="Password reset page"
        >
          <PasswordReset
            token={token}
            isTokenValid={isTokenValid}
            isLoading={isLoading}
            isLocked={!!lockoutUntil && lockoutUntil > Date.now()}
            lockoutUntil={lockoutUntil}
            onResetSuccess={handleResetSuccess}
            onResetError={handleResetError}
          />
        </div>
      </AuthLayout>
    </ErrorBoundary>
  );
};

export default ResetPasswordPage;
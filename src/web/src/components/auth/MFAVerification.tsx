/**
 * @fileoverview MFA Verification Component
 * Implements secure Time-based OTP verification with accessibility and error handling
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback } from 'react'; // ^18.0.0
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { LoadingSpinner } from '../common/LoadingSpinner';

// Constants for MFA verification
const MFA_CODE_LENGTH = 6;
const MFA_CODE_REGEX = /^[0-9]{6}$/;
const VERIFICATION_TIMEOUT_MS = 30000; // 30 seconds
const MAX_RETRY_ATTEMPTS = 3;
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute

interface MFAVerificationProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

/**
 * MFA Verification component implementing Time-based OTP verification
 * with comprehensive security features and accessibility support
 */
const MFAVerification: React.FC<MFAVerificationProps> = ({
  onSuccess,
  onCancel
}) => {
  // State management
  const [code, setCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [attempts, setAttempts] = useState<number>(0);
  const [lastAttemptTime, setLastAttemptTime] = useState<number>(0);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  // Auth hook for MFA verification
  const { verifyMfa } = useAuth();

  /**
   * Validates MFA code format
   */
  const validateCode = useCallback((value: string): boolean => {
    return MFA_CODE_REGEX.test(value);
  }, []);

  /**
   * Checks rate limiting
   */
  const checkRateLimit = useCallback((): boolean => {
    const now = Date.now();
    if (attempts >= MAX_RETRY_ATTEMPTS && 
        now - lastAttemptTime < RATE_LIMIT_WINDOW_MS) {
      const remainingTime = Math.ceil(
        (RATE_LIMIT_WINDOW_MS - (now - lastAttemptTime)) / 1000
      );
      setError(`Too many attempts. Please try again in ${remainingTime} seconds.`);
      return false;
    }
    return true;
  }, [attempts, lastAttemptTime]);

  /**
   * Handles input changes with validation
   */
  const handleInputChange = useCallback((
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value.replace(/\D/g, '').slice(0, MFA_CODE_LENGTH);
    setCode(value);
    setError('');
  }, []);

  /**
   * Handles form submission with security measures
   */
  const handleSubmit = useCallback(async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    // Validate code format
    if (!validateCode(code)) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    // Check rate limiting
    if (!checkRateLimit()) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Set verification timeout
      const timeout = setTimeout(() => {
        setLoading(false);
        setError('Verification timeout. Please try again.');
      }, VERIFICATION_TIMEOUT_MS);
      setTimeoutId(timeout);

      // Attempt verification
      await verifyMfa({ code });
      
      // Clear timeout on success
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      onSuccess?.();
    } catch (error) {
      setAttempts(prev => prev + 1);
      setLastAttemptTime(Date.now());
      setError(error instanceof Error ? error.message : 'Verification failed');
    } finally {
      setLoading(false);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }, [code, validateCode, checkRateLimit, verifyMfa, timeoutId, onSuccess]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  return (
    <div 
      className="mfa-verification"
      role="dialog"
      aria-labelledby="mfa-title"
      aria-describedby="mfa-description"
    >
      <h2 id="mfa-title">Two-Factor Authentication</h2>
      <p id="mfa-description">
        Please enter the 6-digit verification code from your authenticator app.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <Input
          name="mfaCode"
          label="Verification Code"
          type="text"
          value={code}
          onChange={handleInputChange}
          error={error}
          placeholder="Enter 6-digit code"
          required
          disabled={loading}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          autoComplete="one-time-code"
          aria-invalid={!!error}
          aria-describedby={error ? 'mfa-error' : undefined}
        />

        {error && (
          <div id="mfa-error" role="alert" className="error-message">
            {error}
          </div>
        )}

        <div className="button-group">
          <Button
            type="submit"
            variant="primary"
            disabled={loading || code.length !== MFA_CODE_LENGTH}
            loading={loading}
            loadingText="Verifying..."
            aria-busy={loading}
          >
            Verify
          </Button>

          <Button
            type="button"
            variant="text"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </form>

      {loading && <LoadingSpinner size="small" />}
    </div>
  );
};

export default MFAVerification;
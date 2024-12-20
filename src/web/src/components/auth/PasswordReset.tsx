/**
 * @fileoverview Password Reset Component
 * Implements a secure two-stage password reset flow with email verification,
 * token validation, and comprehensive validation following WCAG 2.1 Level AA standards.
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../hooks/useAuth';
import Button from '../common/Button';
import Input from '../common/Input';

// Stage enumeration for password reset flow
enum ResetStage {
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  PASSWORD_RESET = 'PASSWORD_RESET'
}

// Interface for form data
interface PasswordResetFormData {
  email: string;
  token?: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Password Reset Component implementing secure reset flow with accessibility
 */
const PasswordReset: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const { resetPassword, verifyResetToken } = useAuth();
  const [stage, setStage] = useState<ResetStage>(
    token ? ResetStage.PASSWORD_RESET : ResetStage.EMAIL_VERIFICATION
  );
  const [isTokenValid, setIsTokenValid] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Form validation with react-hook-form
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError: setFormError
  } = useForm<PasswordResetFormData>();

  // Validate token on component mount if present
  useEffect(() => {
    const validateToken = async () => {
      if (token) {
        try {
          const isValid = await verifyResetToken(token);
          setIsTokenValid(isValid);
          if (!isValid) {
            setError('Invalid or expired reset token. Please request a new one.');
            setStage(ResetStage.EMAIL_VERIFICATION);
          }
        } catch (error) {
          setError('Error validating reset token. Please try again.');
          setStage(ResetStage.EMAIL_VERIFICATION);
        }
      }
    };

    validateToken();
  }, [token, verifyResetToken]);

  // Handle form submission for both stages
  const onSubmit = async (data: PasswordResetFormData) => {
    setIsSubmitting(true);
    setError('');

    try {
      if (stage === ResetStage.EMAIL_VERIFICATION) {
        await resetPassword({ email: data.email });
        // Show success message and instructions
        setError('Password reset instructions have been sent to your email.');
      } else {
        if (data.newPassword !== data.confirmPassword) {
          setFormError('confirmPassword', {
            type: 'manual',
            message: 'Passwords do not match'
          });
          return;
        }

        await resetPassword({
          token: token!,
          newPassword: data.newPassword
        });

        // Navigate to login on success
        navigate('/login', {
          state: { message: 'Password has been reset successfully. Please log in.' }
        });
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="password-reset-container" role="main">
      <h1 className="password-reset-title">
        {stage === ResetStage.EMAIL_VERIFICATION
          ? 'Reset Password'
          : 'Create New Password'}
      </h1>

      {error && (
        <div
          className="error-message"
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="password-reset-form"
        noValidate
      >
        {stage === ResetStage.EMAIL_VERIFICATION ? (
          <Input
            label="Email Address"
            type="email"
            {...register('email', {
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address'
              }
            })}
            error={errors.email?.message}
            disabled={isSubmitting}
            ariaLabel="Enter your email address"
            required
          />
        ) : (
          <>
            <Input
              label="New Password"
              type="password"
              {...register('newPassword', {
                required: 'New password is required',
                minLength: {
                  value: 8,
                  message: 'Password must be at least 8 characters'
                },
                pattern: {
                  value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
                  message: 'Password must include uppercase, lowercase, number, and special character'
                }
              })}
              error={errors.newPassword?.message}
              disabled={isSubmitting || !isTokenValid}
              ariaLabel="Enter new password"
              required
            />

            <Input
              label="Confirm Password"
              type="password"
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: value =>
                  value === watch('newPassword') || 'Passwords do not match'
              })}
              error={errors.confirmPassword?.message}
              disabled={isSubmitting || !isTokenValid}
              ariaLabel="Confirm new password"
              required
            />
          </>
        )}

        <Button
          type="submit"
          variant="primary"
          fullWidth
          loading={isSubmitting}
          disabled={isSubmitting || (stage === ResetStage.PASSWORD_RESET && !isTokenValid)}
          ariaLabel={
            stage === ResetStage.EMAIL_VERIFICATION
              ? 'Send reset instructions'
              : 'Reset password'
          }
        >
          {stage === ResetStage.EMAIL_VERIFICATION
            ? 'Send Reset Instructions'
            : 'Reset Password'}
        </Button>

        <Button
          type="button"
          variant="text"
          fullWidth
          onClick={() => navigate('/login')}
          ariaLabel="Back to login"
        >
          Back to Login
        </Button>
      </form>
    </div>
  );
};

export default PasswordReset;
/**
 * @fileoverview Comprehensive test suite for the Button component
 * @version 1.0.0
 * Tests Material Design 3 compliance, accessibility, and component specifications
 */

import React from 'react'; // ^18.0.0
import { render, fireEvent, screen, within } from '@testing-library/react'; // ^14.0.0
import { expect, describe, it, beforeEach, afterEach } from '@jest/globals'; // ^29.0.0
import { axe, toHaveNoViolations } from '@axe-core/react'; // ^4.7.0
import Button, { ButtonProps } from '../../../../src/components/common/Button';
import { LoadingState } from '../../../../src/types/common.types';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock the LoadingSpinner component
jest.mock('../../../../src/components/common/Button', () => {
  const originalModule = jest.requireActual('../../../../src/components/common/Button');
  return {
    ...originalModule,
    LoadingSpinner: () => <div data-testid="loading-spinner" />
  };
});

const createTestProps = (overrides: Partial<ButtonProps> = {}): ButtonProps => ({
  children: 'Test Button',
  onClick: jest.fn(),
  ...overrides
});

const renderButton = (props: Partial<ButtonProps> = {}) => {
  const mergedProps = createTestProps(props);
  return render(<Button {...mergedProps} />);
};

describe('Button Component', () => {
  let mockOnClick: jest.Mock;

  beforeEach(() => {
    mockOnClick = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering and Styling', () => {
    it('renders with default props', () => {
      const { getByRole } = renderButton();
      const button = getByRole('button');
      
      expect(button).toHaveClass('md-button', 'md-button--primary', 'md-button--medium');
      expect(button).toHaveAttribute('type', 'button');
      expect(button).not.toBeDisabled();
    });

    it.each([
      ['primary', 'md-button--primary'],
      ['secondary', 'md-button--secondary'],
      ['outlined', 'md-button--outlined'],
      ['text', 'md-button--text'],
      ['error', 'md-button--error'],
      ['success', 'md-button--success']
    ])('renders %s variant correctly', (variant, expectedClass) => {
      const { getByRole } = renderButton({ variant: variant as ButtonProps['variant'] });
      expect(getByRole('button')).toHaveClass(expectedClass);
    });

    it.each([
      ['small', '32px'],
      ['medium', '36px'],
      ['large', '42px']
    ])('renders %s size with correct height', (size, expectedHeight) => {
      const { getByRole } = renderButton({ size: size as ButtonProps['size'] });
      const button = getByRole('button');
      expect(button).toHaveClass(`md-button--${size}`);
      expect(window.getComputedStyle(button).height).toBe(expectedHeight);
    });

    it('applies fullWidth style correctly', () => {
      const { getByRole } = renderButton({ fullWidth: true });
      expect(getByRole('button')).toHaveClass('md-button--full-width');
    });
  });

  describe('Accessibility Compliance', () => {
    it('meets WCAG 2.1 accessibility standards', async () => {
      const { container } = renderButton();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('supports keyboard navigation', () => {
      const { getByRole } = renderButton();
      const button = getByRole('button');
      
      button.focus();
      expect(document.activeElement).toBe(button);
      
      fireEvent.keyDown(button, { key: 'Enter' });
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('handles ARIA attributes correctly', () => {
      const ariaProps = {
        ariaLabel: 'Test Label',
        ariaPressed: true,
        ariaExpanded: true,
        ariaControls: 'test-id'
      };
      
      const { getByRole } = renderButton(ariaProps);
      const button = getByRole('button');
      
      expect(button).toHaveAttribute('aria-label', 'Test Label');
      expect(button).toHaveAttribute('aria-pressed', 'true');
      expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(button).toHaveAttribute('aria-controls', 'test-id');
    });

    it('handles disabled state accessibility', () => {
      const { getByRole } = renderButton({ disabled: true });
      const button = getByRole('button');
      
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('Interaction Handling', () => {
    it('handles click events correctly', () => {
      const { getByRole } = renderButton({ onClick: mockOnClick });
      fireEvent.click(getByRole('button'));
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('prevents click when disabled', () => {
      const { getByRole } = renderButton({ onClick: mockOnClick, disabled: true });
      fireEvent.click(getByRole('button'));
      expect(mockOnClick).not.toHaveBeenCalled();
    });

    it('prevents click during loading state', () => {
      const { getByRole } = renderButton({ onClick: mockOnClick, loading: true });
      fireEvent.click(getByRole('button'));
      expect(mockOnClick).not.toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it.each([
      ['start'],
      ['end'],
      ['center']
    ])('displays loading spinner in %s position', (position) => {
      const { getByTestId } = renderButton({
        loading: true,
        loadingPosition: position as ButtonProps['loadingPosition']
      });
      
      expect(getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('displays loading text when provided', () => {
      const loadingText = 'Loading...';
      const { getByText } = renderButton({
        loading: true,
        loadingText
      });
      
      expect(getByText(loadingText)).toBeInTheDocument();
    });

    it('handles loading timeout correctly', () => {
      jest.useFakeTimers();
      const { getByRole } = renderButton({
        loading: true,
        loadingTimeout: 1000
      });
      
      expect(getByRole('button')).toHaveAttribute('data-loading', 'true');
      
      jest.advanceTimersByTime(1000);
      
      expect(getByRole('button')).toHaveAttribute('data-loading', 'false');
      jest.useRealTimers();
    });
  });

  describe('Icon Integration', () => {
    const StartIcon = () => <span data-testid="start-icon">Start</span>;
    const EndIcon = () => <span data-testid="end-icon">End</span>;

    it('renders start and end icons correctly', () => {
      const { getByTestId } = renderButton({
        startIcon: <StartIcon />,
        endIcon: <EndIcon />
      });
      
      expect(getByTestId('start-icon')).toBeInTheDocument();
      expect(getByTestId('end-icon')).toBeInTheDocument();
    });

    it('hides icons during loading state', () => {
      const { queryByTestId } = renderButton({
        startIcon: <StartIcon />,
        endIcon: <EndIcon />,
        loading: true
      });
      
      expect(queryByTestId('start-icon')).not.toBeInTheDocument();
      expect(queryByTestId('end-icon')).not.toBeInTheDocument();
    });
  });
});
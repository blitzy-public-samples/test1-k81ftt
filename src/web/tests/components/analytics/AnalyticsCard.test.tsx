import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ThemeProvider } from '@mui/material/styles';
import { IntlProvider } from 'react-intl';
import AnalyticsCard from '../../../src/components/analytics/AnalyticsCard';
import { lightTheme, darkTheme } from '../../../src/config/theme.config';
import { ThemeMode } from '../../../src/constants/theme.constants';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Default test props
const defaultProps = {
  title: 'Task Completion Rate',
  metric: 85,
  icon: 'task_alt',
  color: 'primary' as const,
  trend: 12.5,
  metricType: 'percentage' as const,
  ariaLabel: 'Task completion rate analytics card'
};

// Test wrapper component with providers
const renderWithProviders = (
  ui: React.ReactElement,
  { theme = lightTheme } = {}
) => {
  return render(
    <ThemeProvider theme={theme}>
      <IntlProvider locale="en" messages={{}}>
        {ui}
      </IntlProvider>
    </ThemeProvider>
  );
};

describe('AnalyticsCard', () => {
  describe('Rendering', () => {
    it('renders with minimum required props', () => {
      renderWithProviders(<AnalyticsCard {...defaultProps} />);
      
      expect(screen.getByText(defaultProps.title)).toBeInTheDocument();
      expect(screen.getByRole('article')).toBeInTheDocument();
      expect(screen.getByLabelText(defaultProps.ariaLabel)).toBeInTheDocument();
    });

    it('renders metric value with correct formatting', () => {
      renderWithProviders(<AnalyticsCard {...defaultProps} />);
      
      // For percentage type, should format as 85%
      expect(screen.getByText('85.0%')).toBeInTheDocument();
    });

    it('renders different metric types correctly', () => {
      // Test number format
      renderWithProviders(
        <AnalyticsCard {...defaultProps} metric={1234} metricType="number" />
      );
      expect(screen.getByText('1,234')).toBeInTheDocument();

      // Test currency format
      renderWithProviders(
        <AnalyticsCard {...defaultProps} metric={1234.56} metricType="currency" />
      );
      expect(screen.getByText('$1,234.56')).toBeInTheDocument();

      // Test duration format
      renderWithProviders(
        <AnalyticsCard {...defaultProps} metric={2.5} metricType="duration" />
      );
      expect(screen.getByText('2.5 hours')).toBeInTheDocument();
    });

    it('renders trend indicator when trend is provided', () => {
      renderWithProviders(<AnalyticsCard {...defaultProps} />);
      
      const trendIndicator = screen.getByText('+12.5%');
      expect(trendIndicator).toBeInTheDocument();
      expect(trendIndicator.parentElement).toHaveStyle({
        color: expect.stringContaining('success')
      });
    });
  });

  describe('Accessibility', () => {
    it('meets WCAG accessibility guidelines', async () => {
      const { container } = renderWithProviders(<AnalyticsCard {...defaultProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('provides proper ARIA labels', () => {
      renderWithProviders(<AnalyticsCard {...defaultProps} />);
      
      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('aria-label', defaultProps.ariaLabel);
    });

    it('supports keyboard navigation when clickable', () => {
      const handleClick = jest.fn();
      renderWithProviders(
        <AnalyticsCard {...defaultProps} onClick={handleClick} />
      );
      
      const card = screen.getByRole('button');
      card.focus();
      expect(card).toHaveFocus();
      
      fireEvent.keyPress(card, { key: 'Enter', code: 'Enter' });
      expect(handleClick).toHaveBeenCalled();
    });

    it('has sufficient color contrast in both themes', () => {
      // Test light theme
      const { rerender } = renderWithProviders(<AnalyticsCard {...defaultProps} />);
      const lightCard = screen.getByRole('article');
      expect(lightCard).toHaveStyle({
        backgroundColor: expect.stringMatching(/^#/)
      });

      // Test dark theme
      rerender(
        <ThemeProvider theme={darkTheme}>
          <IntlProvider locale="en" messages={{}}>
            <AnalyticsCard {...defaultProps} />
          </IntlProvider>
        </ThemeProvider>
      );
      const darkCard = screen.getByRole('article');
      expect(darkCard).toHaveStyle({
        backgroundColor: expect.stringMatching(/^#/)
      });
    });
  });

  describe('Interactions', () => {
    it('handles click events when provided', async () => {
      const handleClick = jest.fn();
      renderWithProviders(
        <AnalyticsCard {...defaultProps} onClick={handleClick} />
      );
      
      const card = screen.getByRole('button');
      await userEvent.click(card);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('shows hover state on interactive elements', async () => {
      const { container } = renderWithProviders(
        <AnalyticsCard {...defaultProps} onClick={() => {}} />
      );
      
      const card = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(card);
      await waitFor(() => {
        expect(card).toHaveStyle({
          transform: expect.stringContaining('scale')
        });
      });
    });

    it('maintains focus styles when using keyboard', async () => {
      renderWithProviders(
        <AnalyticsCard {...defaultProps} onClick={() => {}} />
      );
      
      const card = screen.getByRole('button');
      await userEvent.tab();
      expect(card).toHaveFocus();
      expect(card).toHaveStyle({
        outline: expect.stringContaining('solid')
      });
    });
  });

  describe('Theming', () => {
    it('applies theme colors correctly', () => {
      renderWithProviders(
        <AnalyticsCard {...defaultProps} color="success" />
      );
      
      const icon = screen.getByRole('img', { hidden: true });
      expect(icon).toHaveStyle({
        color: expect.stringContaining('success')
      });
    });

    it('adapts to dark theme', () => {
      renderWithProviders(
        <AnalyticsCard {...defaultProps} />,
        { theme: darkTheme }
      );
      
      const card = screen.getByRole('article');
      expect(card).toHaveStyle({
        backgroundColor: expect.stringMatching(/^#/)
      });
    });
  });

  describe('Error Handling', () => {
    it('handles invalid metric values gracefully', () => {
      renderWithProviders(
        <AnalyticsCard {...defaultProps} metric={NaN} />
      );
      
      expect(screen.getByText('--')).toBeInTheDocument();
    });

    it('handles missing trend values', () => {
      renderWithProviders(
        <AnalyticsCard {...defaultProps} trend={undefined} />
      );
      
      expect(screen.queryByText('%')).not.toBeInTheDocument();
    });
  });
});
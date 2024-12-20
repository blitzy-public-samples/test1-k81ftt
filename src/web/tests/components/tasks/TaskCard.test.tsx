/**
 * @fileoverview Test suite for TaskCard component
 * Verifies rendering, interactions, visual styling, accessibility, and theme integration
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ThemeProvider } from '@emotion/react';

import TaskCard from '../../../src/components/tasks/TaskCard';
import { Task, TaskStatus } from '../../../src/types/task.types';
import { lightTheme, darkTheme } from '../../../src/config/theme.config';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Helper function to render component with theme
const renderWithTheme = (
  component: React.ReactElement,
  theme = lightTheme
) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

// Mock task data factory
const createMockTask = (overrides?: Partial<Task>): Task => ({
  id: 'task-1',
  title: 'Test Task',
  description: 'Test task description',
  status: TaskStatus.IN_PROGRESS,
  priority: 'HIGH',
  dueDate: new Date('2024-03-15'),
  assigneeId: 'user-1',
  projectId: 'project-1',
  metadata: {
    tags: ['test'],
    customFields: {}
  },
  ...overrides
});

describe('TaskCard Component', () => {
  // Mock handlers
  const mockOnClick = jest.fn();
  const mockOnStatusChange = jest.fn();
  const mockOnPriorityChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders task card with correct content and styling', () => {
      const task = createMockTask();
      const { container } = renderWithTheme(
        <TaskCard task={task} onClick={mockOnClick} />
      );

      // Verify content
      expect(screen.getByText(task.title)).toBeInTheDocument();
      expect(screen.getByText(task.description)).toBeInTheDocument();
      expect(screen.getByText(/Mar 15, 2024/)).toBeInTheDocument();

      // Verify styling
      const card = container.firstChild;
      expect(card).toHaveStyle({
        padding: '16px',
        borderRadius: '8px'
      });
      expect(card).toHaveStyle({
        boxShadow: expect.stringContaining('rgba(0, 0, 0, 0.1)')
      });
    });

    it('applies hover animation correctly', async () => {
      const task = createMockTask();
      const { container } = renderWithTheme(
        <TaskCard task={task} onClick={mockOnClick} />
      );

      const card = container.firstChild;
      fireEvent.mouseEnter(card!);

      await waitFor(() => {
        expect(card).toHaveStyle({
          transform: 'translateY(-2px)'
        });
      });
    });

    it('renders in compact mode correctly', () => {
      const task = createMockTask();
      const { container } = renderWithTheme(
        <TaskCard task={task} compact />
      );

      expect(container.firstChild).toHaveStyle({
        maxWidth: '320px'
      });
    });
  });

  describe('Accessibility', () => {
    it('meets WCAG 2.1 Level AA requirements', async () => {
      const task = createMockTask();
      const { container } = renderWithTheme(
        <TaskCard task={task} onClick={mockOnClick} />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('supports keyboard navigation', () => {
      const task = createMockTask();
      renderWithTheme(
        <TaskCard task={task} onClick={mockOnClick} />
      );

      const card = screen.getByRole('button');
      fireEvent.keyDown(card, { key: 'Enter' });
      expect(mockOnClick).toHaveBeenCalledWith(task);

      fireEvent.keyDown(card, { key: ' ' });
      expect(mockOnClick).toHaveBeenCalledWith(task);
    });

    it('provides proper ARIA attributes', () => {
      const task = createMockTask();
      renderWithTheme(
        <TaskCard task={task} onClick={mockOnClick} />
      );

      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('aria-label', `Task: ${task.title}`);
    });
  });

  describe('Interactions', () => {
    it('handles click events correctly', async () => {
      const task = createMockTask();
      const user = userEvent.setup();
      
      renderWithTheme(
        <TaskCard task={task} onClick={mockOnClick} />
      );

      await user.click(screen.getByRole('button'));
      expect(mockOnClick).toHaveBeenCalledWith(task);
    });

    it('handles status changes correctly', async () => {
      const task = createMockTask();
      const user = userEvent.setup();
      
      renderWithTheme(
        <TaskCard 
          task={task} 
          onStatusChange={mockOnStatusChange}
        />
      );

      const statusChip = screen.getByLabelText(/Task status/);
      await user.click(statusChip);
      expect(mockOnStatusChange).toHaveBeenCalled();
    });
  });

  describe('Theming', () => {
    it('renders correctly in light theme', () => {
      const task = createMockTask();
      const { container } = renderWithTheme(
        <TaskCard task={task} />,
        lightTheme
      );

      expect(container.firstChild).toHaveStyle({
        backgroundColor: lightTheme.palette.background.paper
      });
    });

    it('renders correctly in dark theme', () => {
      const task = createMockTask();
      const { container } = renderWithTheme(
        <TaskCard task={task} />,
        darkTheme
      );

      expect(container.firstChild).toHaveStyle({
        backgroundColor: darkTheme.palette.background.paper
      });
    });

    it('supports high contrast mode', () => {
      const task = createMockTask();
      renderWithTheme(
        <TaskCard task={task} highContrast />
      );

      const card = screen.getByRole('article');
      expect(card).toHaveStyle({
        border: expect.stringContaining('solid')
      });
    });
  });

  describe('Error Handling', () => {
    it('renders within error boundary', () => {
      const task = createMockTask();
      const { container } = renderWithTheme(
        <TaskCard task={task} />
      );

      expect(container.querySelector('ErrorBoundary')).toBeTruthy();
    });

    it('handles missing task data gracefully', () => {
      const incompleteTask = { id: 'task-1', title: 'Test Task' } as Task;
      renderWithTheme(
        <TaskCard task={incompleteTask} />
      );

      expect(screen.getByText('Test Task')).toBeInTheDocument();
      expect(screen.queryByText('undefined')).not.toBeInTheDocument();
    });
  });
});
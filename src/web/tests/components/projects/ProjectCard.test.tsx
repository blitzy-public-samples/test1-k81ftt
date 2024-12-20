import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { axe } from '@axe-core/react';
import { ThemeProvider } from '@emotion/react';
import ProjectCard from '../../src/components/projects/ProjectCard';
import { Project, ProjectStatus } from '../../src/types/project.types';
import ErrorBoundary from '../../src/components/common/ErrorBoundary';

// Default mock project data
const defaultMockProject: Project = {
  id: 'test-id',
  name: 'Test Project',
  description: 'Test Description',
  status: ProjectStatus.IN_PROGRESS,
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  ownerId: 'test-owner',
  metadata: {
    tags: ['test', 'development'],
    customFields: {},
    settings: {
      visibility: 'PUBLIC',
      notifications: {
        emailNotifications: true,
        inAppNotifications: true,
        frequency: 'DAILY',
        events: ['STATUS_CHANGE', 'DUE_DATE']
      }
    }
  },
  createdAt: new Date(),
  updatedAt: new Date()
};

// Helper function to create mock project with overrides
const createMockProject = (overrides?: Partial<Project>): Project => ({
  ...defaultMockProject,
  ...overrides
});

// Enhanced test setup with theme and accessibility support
const renderWithTheme = (component: React.ReactElement) => {
  const theme = {
    currentTheme: {
      palette: {
        primary: { main: '#1976d2' },
        error: { main: '#d32f2f' },
        text: { primary: '#000000', secondary: '#666666' },
        background: { paper: '#ffffff' }
      }
    },
    isDarkMode: false
  };

  return render(
    <ThemeProvider theme={theme}>
      <ErrorBoundary>
        {component}
      </ErrorBoundary>
    </ThemeProvider>
  );
};

describe('ProjectCard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders project information correctly', () => {
    const project = createMockProject();
    renderWithTheme(<ProjectCard project={project} />);

    // Verify basic project information
    expect(screen.getByText(project.name)).toBeInTheDocument();
    expect(screen.getByText(project.description)).toBeInTheDocument();
    expect(screen.getByText(/IN PROGRESS/i)).toBeInTheDocument();

    // Verify dates are formatted correctly
    expect(screen.getByText(/Jan 1, 2024/)).toBeInTheDocument();
    expect(screen.getByText(/Dec 31, 2024/)).toBeInTheDocument();

    // Verify tags are displayed
    project.metadata.tags.forEach(tag => {
      expect(screen.getByText(tag)).toBeInTheDocument();
    });
  });

  it('handles loading state correctly', async () => {
    const project = createMockProject();
    renderWithTheme(<ProjectCard project={project} isLoading={true} />);

    // Verify loading state attributes
    const card = screen.getByRole('article');
    expect(card).toHaveAttribute('aria-busy', 'true');

    // Wait for potential loading animations
    await waitFor(() => {
      expect(card).toBeInTheDocument();
    });
  });

  it('handles click events correctly', () => {
    const project = createMockProject();
    const handleClick = vi.fn();
    renderWithTheme(<ProjectCard project={project} onClick={handleClick} />);

    // Click the card
    fireEvent.click(screen.getByRole('article'));
    expect(handleClick).toHaveBeenCalledWith(project);
  });

  it('displays correct status colors', () => {
    const statuses = Object.values(ProjectStatus);
    statuses.forEach(status => {
      const project = createMockProject({ status });
      renderWithTheme(<ProjectCard project={project} />);

      const statusBadge = screen.getByText(status.replace('_', ' '));
      expect(statusBadge).toHaveClass('status-badge'); // Adjust class name as per actual implementation
    });
  });

  it('shows overdue indicator for late projects', () => {
    const overdueProject = createMockProject({
      endDate: new Date('2023-12-31'),
      status: ProjectStatus.IN_PROGRESS
    });
    renderWithTheme(<ProjectCard project={overdueProject} />);

    // Verify overdue styling
    const card = screen.getByRole('article');
    expect(card).toHaveStyle({ borderLeft: expect.stringContaining('error') });
  });

  it('calculates and displays progress correctly', () => {
    const project = createMockProject({
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31')
    });
    renderWithTheme(<ProjectCard project={project} />);

    // Verify progress bar
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
  });

  it('meets accessibility requirements', async () => {
    const project = createMockProject();
    const { container } = renderWithTheme(<ProjectCard project={project} />);

    // Run accessibility tests
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    // Verify ARIA attributes
    const card = screen.getByRole('article');
    expect(card).toHaveAttribute('aria-label', expect.stringContaining(project.name));
  });

  it('handles error states gracefully', () => {
    const invalidProject = createMockProject({
      name: undefined as unknown as string // Intentionally invalid
    });

    // Verify error boundary catches the error
    expect(() => {
      renderWithTheme(<ProjectCard project={invalidProject} />);
    }).not.toThrow();
  });

  it('supports theme variations', () => {
    const project = createMockProject();
    const darkTheme = {
      currentTheme: {
        palette: {
          primary: { main: '#90caf9' },
          error: { main: '#ef5350' },
          text: { primary: '#ffffff', secondary: '#b3b3b3' },
          background: { paper: '#424242' }
        }
      },
      isDarkMode: true
    };

    render(
      <ThemeProvider theme={darkTheme}>
        <ProjectCard project={project} />
      </ThemeProvider>
    );

    // Verify theme-specific styling
    const card = screen.getByRole('article');
    expect(card).toHaveStyle({
      backgroundColor: expect.stringContaining('424242')
    });
  });
});
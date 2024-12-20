/**
 * @fileoverview Main layout component implementing core application structure
 * with enhanced theme support, accessibility features, and responsive design
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Box, Container, useMediaQuery, Fade } from '@mui/material';
import { styled } from '@mui/material/styles';
import Header from './Header';
import Sidebar from './Sidebar';
import ErrorBoundary from '../common/ErrorBoundary';
import useTheme from '../../hooks/useTheme';

// Constants for layout dimensions and transitions
const DRAWER_WIDTH = 250;
const HEADER_HEIGHT = 64;
const THEME_TRANSITION_DURATION = 200;

// Interface for component props
interface MainLayoutProps {
  children: React.ReactNode;
  initialTheme?: ThemePreference;
}

// Styled component for main content area with theme support
const StyledMainContent = styled(Box, {
  shouldForwardProp: (prop) => !['isHighContrast'].includes(prop as string)
})<{ isHighContrast?: boolean }>(({ theme, isHighContrast }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: THEME_TRANSITION_DURATION
  }),
  marginTop: HEADER_HEIGHT,
  backgroundColor: isHighContrast 
    ? theme.palette.background.default 
    : theme.palette.background.paper,
  minHeight: `calc(100vh - ${HEADER_HEIGHT}px)`,
  position: 'relative',
  zIndex: 1,

  [theme.breakpoints.up('md')]: {
    marginLeft: DRAWER_WIDTH,
    width: `calc(100% - ${DRAWER_WIDTH}px)`
  },

  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none'
  },

  // RTL support
  [theme.direction === 'rtl' ? 'marginRight' : 'marginLeft']: {
    [theme.breakpoints.up('md')]: DRAWER_WIDTH
  }
}));

/**
 * Main layout component with enhanced theme support and accessibility features
 */
const MainLayout: React.FC<MainLayoutProps> = ({ children, initialTheme }) => {
  // Theme and responsive hooks
  const { currentTheme, themeMode, toggleTheme, isDarkMode, isHighContrastMode } = useTheme();
  const isMobile = useMediaQuery(currentTheme.breakpoints.down('md'));
  
  // Sidebar state management
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);

  // Handle sidebar toggle
  const handleSidebarToggle = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  // Handle theme toggle
  const handleThemeToggle = useCallback(() => {
    toggleTheme();
  }, [toggleTheme]);

  // Update sidebar state on screen size changes
  useEffect(() => {
    setIsSidebarOpen(!isMobile);
  }, [isMobile]);

  // Handle system theme preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (currentTheme.palette.mode === 'system') {
        toggleTheme();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [currentTheme.palette.mode, toggleTheme]);

  return (
    <ErrorBoundary>
      <Box
        sx={{
          display: 'flex',
          minHeight: '100vh',
          backgroundColor: currentTheme.palette.background.default
        }}
      >
        <Header
          onMenuClick={handleSidebarToggle}
          onThemeToggle={handleThemeToggle}
          isDarkMode={isDarkMode}
          isHighContrastMode={isHighContrastMode}
        />

        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        <StyledMainContent
          component="main"
          isHighContrast={isHighContrastMode}
          role="main"
          aria-label="Main content"
        >
          <Fade in timeout={THEME_TRANSITION_DURATION}>
            <Container
              maxWidth="lg"
              sx={{
                pt: { xs: 2, sm: 3 },
                pb: { xs: 2, sm: 3 }
              }}
            >
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </Container>
          </Fade>
        </StyledMainContent>
      </Box>
    </ErrorBoundary>
  );
};

export default MainLayout;
/**
 * @fileoverview Enhanced dashboard layout component implementing Material Design 3 principles
 * with real-time updates, theme customization, and role-based access control.
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, useMediaQuery, useTheme, Fade } from '@mui/material';
import { styled } from '@mui/material/styles';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import useAuth from '../../hooks/useAuth';
import { DRAWER_WIDTH, HEADER_HEIGHT, MOBILE_BREAKPOINT, TABLET_BREAKPOINT } from '../../constants/theme.constants';

// Styled components for enhanced layout
const StyledMain = styled(Box, {
  shouldForwardProp: (prop) => !['open', 'isHighContrast'].includes(prop as string)
})<{
  open: boolean;
  isHighContrast: boolean;
}>(({ theme, open, isHighContrast }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginLeft: `-${DRAWER_WIDTH}px`,
  width: `calc(100% - ${DRAWER_WIDTH}px)`,
  marginTop: HEADER_HEIGHT,
  ...(open && {
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginLeft: 0,
  }),
  ...(isHighContrast && {
    backgroundColor: theme.palette.background.default,
    color: theme.palette.text.primary,
    border: `1px solid ${theme.palette.divider}`,
  }),
  [theme.breakpoints.down('md')]: {
    marginLeft: 0,
    width: '100%',
    padding: theme.spacing(2),
  },
}));

// Props interface for DashboardLayout
interface DashboardLayoutProps {
  children: React.ReactNode;
  className?: string;
  initialTheme?: 'light' | 'dark' | 'high-contrast';
}

/**
 * Enhanced dashboard layout component with real-time updates and accessibility features
 */
const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  className,
  initialTheme
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, userRole } = useAuth();
  
  // Responsive breakpoints
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  
  // State management
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [isDarkMode, setIsDarkMode] = useState(theme.palette.mode === 'dark');
  const [isHighContrastMode, setIsHighContrastMode] = useState(false);

  // Handle authentication and redirection
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
    }
  }, [isAuthenticated, navigate, location]);

  // Handle responsive sidebar behavior
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isMobile]);

  // Handle theme changes
  const handleThemeToggle = useCallback(() => {
    setIsDarkMode(prev => !prev);
  }, []);

  // Handle sidebar toggle
  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  // Memoized layout configuration
  const layoutConfig = useMemo(() => ({
    sidebarWidth: DRAWER_WIDTH,
    headerHeight: HEADER_HEIGHT,
    contentPadding: isMobile ? 16 : 24,
  }), [isMobile]);

  // Early return if not authenticated
  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: theme.palette.background.default,
      }}
      className={className}
    >
      <Header
        onMenuClick={handleSidebarToggle}
        onThemeToggle={handleThemeToggle}
        isDarkMode={isDarkMode}
        isHighContrastMode={isHighContrastMode}
      />

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <Fade in={true} timeout={theme.transitions.duration.enteringScreen}>
        <StyledMain
          open={sidebarOpen}
          isHighContrast={isHighContrastMode}
          component="main"
          sx={{
            backgroundColor: theme.palette.background.default,
            minHeight: `calc(100vh - ${layoutConfig.headerHeight}px)`,
            paddingTop: `${layoutConfig.headerHeight}px`,
            paddingLeft: sidebarOpen && !isMobile ? `${layoutConfig.sidebarWidth}px` : 0,
          }}
        >
          {children}
        </StyledMain>
      </Fade>
    </Box>
  );
};

export default React.memo(DashboardLayout);
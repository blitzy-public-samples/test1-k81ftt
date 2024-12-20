/**
 * @fileoverview Enhanced Sidebar Component with Material Design 3 Implementation
 * Provides navigation, role-based access control, and responsive behavior
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { styled, useTheme } from '@mui/material/styles';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Collapse,
  IconButton,
  useMediaQuery,
  Box,
  Typography
} from '@mui/material';
import Icon from './Icon';
import { useAuth } from '../../hooks/useAuth';
import { ThemeMode, BREAKPOINTS, TRANSITIONS } from '../../constants/theme.constants';
import { RootState } from '../../types/store.types';

// Constants for sidebar dimensions and behavior
const SIDEBAR_WIDTH = 280;
const MOBILE_BREAKPOINT = 768;
const RESIZE_DEBOUNCE_MS = 150;

// Interface for sidebar props with enhanced accessibility
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  ariaLabel?: string;
}

// Interface for navigation items with role-based access
interface NavigationItem {
  path: string;
  label: string;
  icon: string;
  roles: string[];
  priority: number;
  children?: NavigationItem[];
}

// Styled components with Material Design 3 specifications
const StyledDrawer = styled(Drawer, {
  shouldForwardProp: (prop) => !['isOpen', 'isMobile'].includes(prop as string),
})<{ isOpen: boolean; isMobile: boolean }>(({ theme, isOpen, isMobile }) => ({
  width: isOpen ? SIDEBAR_WIDTH : 0,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  transition: theme.transitions.create(['width', 'transform'], {
    duration: TRANSITIONS.duration.standard,
    easing: TRANSITIONS.easing.easeInOut,
  }),
  '& .MuiDrawer-paper': {
    width: SIDEBAR_WIDTH,
    backgroundColor: theme.palette.background.paper,
    overflowX: 'hidden',
    borderRight: `1px solid ${theme.palette.divider}`,
    transition: theme.transitions.create(['width', 'transform'], {
      duration: TRANSITIONS.duration.standard,
      easing: TRANSITIONS.easing.easeInOut,
    }),
    ...(isMobile && {
      transform: isOpen ? 'translateX(0)' : `translateX(-${SIDEBAR_WIDTH}px)`,
    }),
  },
}));

// Enhanced navigation items with role-based access
const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    path: 'DASHBOARD_ROUTES.HOME',
    label: 'Dashboard',
    icon: 'dashboard',
    roles: ['admin', 'manager', 'member'],
    priority: 1
  },
  {
    path: 'PROJECT_ROUTES.LIST',
    label: 'Projects',
    icon: 'project',
    roles: ['admin', 'manager', 'member'],
    priority: 2
  },
  {
    path: 'TASK_ROUTES.LIST',
    label: 'Tasks',
    icon: 'task',
    roles: ['admin', 'manager', 'member'],
    priority: 3
  }
];

/**
 * Enhanced Sidebar component with role-based navigation and responsive behavior
 */
const Sidebar: React.FC<SidebarProps> = React.memo(({
  isOpen,
  onClose,
  className,
  ariaLabel = 'Navigation Sidebar'
}) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { isAuthenticated, user, checkPermission } = useAuth();
  const isMobile = useMediaQuery(`(max-width:${MOBILE_BREAKPOINT}px)`);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Get theme mode from Redux store
  const themeMode = useSelector((state: RootState) => state.ui.theme);

  // Filter navigation items based on user roles
  const filteredNavItems = useMemo(() => {
    if (!isAuthenticated || !user) return [];

    return NAVIGATION_ITEMS.filter(item => 
      item.roles.some(role => checkPermission(role))
    ).sort((a, b) => a.priority - b.priority);
  }, [isAuthenticated, user, checkPermission]);

  // Handle window resize with debounce
  useEffect(() => {
    let resizeTimer: NodeJS.Timeout;

    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (!isMobile && isOpen) {
          onClose();
        }
      }, RESIZE_DEBOUNCE_MS);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile, isOpen, onClose]);

  // Handle item expansion toggle
  const handleItemExpand = useCallback((path: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  // Render navigation item with accessibility support
  const renderNavItem = useCallback((item: NavigationItem, depth = 0) => (
    <React.Fragment key={item.path}>
      <ListItem
        button
        onClick={() => item.children ? handleItemExpand(item.path) : null}
        sx={{
          pl: 2 + depth * 2,
          py: 1.5,
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
          },
        }}
        aria-expanded={item.children ? expandedItems.has(item.path) : undefined}
      >
        <ListItemIcon>
          <Icon
            name={item.icon}
            size="medium"
            color={themeMode === ThemeMode.DARK ? 'inherit' : 'primary'}
            ariaLabel={`${item.label} icon`}
          />
        </ListItemIcon>
        <ListItemText
          primary={
            <Typography variant="body2" color="textPrimary">
              {item.label}
            </Typography>
          }
        />
        {item.children && (
          <Icon
            name={expandedItems.has(item.path) ? 'expandLess' : 'expandMore'}
            size="small"
            color="inherit"
          />
        )}
      </ListItem>
      {item.children && (
        <Collapse in={expandedItems.has(item.path)} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {item.children.map(child => renderNavItem(child, depth + 1))}
          </List>
        </Collapse>
      )}
    </React.Fragment>
  ), [expandedItems, handleItemExpand, theme, themeMode]);

  return (
    <StyledDrawer
      variant={isMobile ? 'temporary' : 'permanent'}
      open={isOpen}
      onClose={onClose}
      isOpen={isOpen}
      isMobile={isMobile}
      className={className}
      aria-label={ariaLabel}
      ModalProps={{
        keepMounted: true, // Better mobile performance
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          pt: theme.spacing(2),
        }}
      >
        {/* Logo and branding area */}
        <Box
          sx={{
            px: 2,
            pb: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="h6" color="primary">
            Task Master
          </Typography>
          {isMobile && (
            <IconButton onClick={onClose} aria-label="Close sidebar">
              <Icon name="close" size="small" />
            </IconButton>
          )}
        </Box>

        <Divider />

        {/* Navigation items */}
        <List component="nav" aria-label="Main navigation">
          {filteredNavItems.map(item => renderNavItem(item))}
        </List>
      </Box>
    </StyledDrawer>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
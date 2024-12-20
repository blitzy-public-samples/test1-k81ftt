import React, { useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from '@mui/material/styles/styled';
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Collapse,
  Badge
} from '@mui/material';
import Icon from '../common/Icon';
import Avatar from '../common/Avatar';
import { 
  AUTH_ROUTES, 
  DASHBOARD_ROUTES, 
  PROJECT_ROUTES, 
  TASK_ROUTES 
} from '../../constants/routes.constants';
import useAuth from '../../hooks/useAuth';

// Navigation item interface with enhanced accessibility
interface NavigationProps {
  isCollapsed: boolean;
  onToggle: () => void;
  className?: string;
  showNotifications?: boolean;
}

// Navigation item structure with role-based access
interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  roles: string[];
  badge?: number;
  children?: NavigationItem[];
  ariaLabel?: string;
}

// Styled navigation container with theme support
const StyledNavigation = styled(List)<{ isCollapsed: boolean }>(({ theme, isCollapsed }) => ({
  width: isCollapsed ? 64 : 280,
  transition: theme.transitions.create('width', {
    duration: theme.transitions.duration.shorter,
  }),
  backgroundColor: theme.palette.background.paper,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  borderRight: `1px solid ${theme.palette.divider}`,
  overflowX: 'hidden',
  '& .MuiListItemIcon-root': {
    minWidth: isCollapsed ? 'auto' : 48,
    marginRight: isCollapsed ? 'auto' : theme.spacing(2),
  },
  '& .MuiListItemText-root': {
    opacity: isCollapsed ? 0 : 1,
    transition: theme.transitions.create('opacity', {
      duration: theme.transitions.duration.shorter,
    }),
  },
}));

// Styled navigation item with accessibility support
const StyledNavigationItem = styled(ListItem)(({ theme }) => ({
  padding: theme.spacing(1, 2),
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
  '&.Mui-selected': {
    backgroundColor: theme.palette.action.selected,
    '&:hover': {
      backgroundColor: theme.palette.action.selected,
    },
  },
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: -2,
  },
}));

// Navigation items with role-based access control
const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'dashboard',
    path: DASHBOARD_ROUTES.HOME,
    roles: ['admin', 'manager', 'member'],
    ariaLabel: 'Navigate to dashboard'
  },
  {
    id: 'projects',
    label: 'Projects',
    icon: 'folder',
    path: PROJECT_ROUTES.LIST,
    roles: ['admin', 'manager', 'member'],
    ariaLabel: 'Navigate to projects'
  },
  {
    id: 'tasks',
    label: 'Tasks',
    icon: 'task',
    path: TASK_ROUTES.LIST,
    roles: ['admin', 'manager', 'member'],
    ariaLabel: 'Navigate to tasks'
  }
];

// Memoized Navigation component
const Navigation: React.FC<NavigationProps> = React.memo(({
  isCollapsed,
  onToggle,
  className,
  showNotifications = true
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasPermission } = useAuth();

  // Filter navigation items based on user roles
  const filteredItems = useMemo(() => {
    if (!user) return [];
    return NAVIGATION_ITEMS.filter(item =>
      item.roles.some(role => hasPermission(role))
    );
  }, [user, hasPermission]);

  // Handle navigation item click
  const handleNavigationClick = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  // Render navigation item with accessibility
  const renderNavigationItem = useCallback((item: NavigationItem, isActive: boolean) => (
    <StyledNavigationItem
      key={item.id}
      selected={isActive}
      onClick={() => handleNavigationClick(item.path)}
      role="menuitem"
      aria-label={item.ariaLabel}
      tabIndex={0}
    >
      <ListItemIcon>
        <Badge
          badgeContent={showNotifications ? item.badge : 0}
          color="error"
          invisible={!item.badge}
        >
          <Icon
            name={item.icon}
            size={isCollapsed ? 'small' : 'medium'}
            color={isActive ? 'primary' : 'inherit'}
            ariaLabel={item.ariaLabel}
          />
        </Badge>
      </ListItemIcon>
      <ListItemText
        primary={item.label}
        primaryTypographyProps={{
          variant: 'body2',
          color: isActive ? 'primary' : 'textPrimary'
        }}
      />
    </StyledNavigationItem>
  ), [isCollapsed, handleNavigationClick, showNotifications]);

  // Render user profile section
  const renderUserProfile = useCallback(() => (
    <>
      <Divider />
      <StyledNavigationItem
        onClick={logout}
        role="menuitem"
        aria-label="Logout"
      >
        <ListItemIcon>
          <Avatar
            size={isCollapsed ? 'small' : 'medium'}
            src={user?.avatar}
            name={user?.name || ''}
            alt={user?.name || 'User avatar'}
          />
        </ListItemIcon>
        <ListItemText
          primary={user?.name}
          secondary={user?.email}
          primaryTypographyProps={{
            variant: 'body2',
            noWrap: true
          }}
          secondaryTypographyProps={{
            variant: 'caption',
            noWrap: true
          }}
        />
      </StyledNavigationItem>
    </>
  ), [isCollapsed, logout, user]);

  return (
    <StyledNavigation
      component="nav"
      isCollapsed={isCollapsed}
      className={className}
      role="menu"
      aria-label="Main navigation"
    >
      {filteredItems.map(item => renderNavigationItem(
        item,
        location.pathname.startsWith(item.path)
      ))}
      {user && renderUserProfile()}
    </StyledNavigation>
  );
});

// Display name for debugging
Navigation.displayName = 'Navigation';

export default Navigation;
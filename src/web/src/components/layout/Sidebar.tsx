import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  Divider,
  CircularProgress,
  useTheme,
  useMediaQuery
} from '@mui/material';
import Icon from '../common/Icon';
import { useAuth } from '../../hooks/useAuth';
import { useWebSocket } from '../../hooks/useWebSocket';
import { DRAWER_WIDTH, TRANSITIONS } from '../../constants/theme.constants';

// Styled components
const StyledDrawer = styled(Drawer, {
  shouldForwardProp: (prop) => !['open', 'isNested'].includes(prop as string)
})<{
  open?: boolean;
  isNested?: boolean;
}>(({ theme, open, isNested }) => ({
  width: DRAWER_WIDTH,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  ...(open && {
    width: DRAWER_WIDTH,
    transition: theme.transitions.create('width', {
      easing: TRANSITIONS.easing.sharp,
      duration: TRANSITIONS.duration.enteringScreen
    }),
    overflowX: 'hidden',
    '& .MuiDrawer-paper': {
      width: DRAWER_WIDTH,
      transition: theme.transitions.create('width', {
        easing: TRANSITIONS.easing.sharp,
        duration: TRANSITIONS.duration.enteringScreen
      }),
      overflowX: 'hidden',
      borderRight: `1px solid ${theme.palette.divider}`
    }
  }),
  ...(!open && {
    width: theme.spacing(7),
    transition: theme.transitions.create('width', {
      easing: TRANSITIONS.easing.sharp,
      duration: TRANSITIONS.duration.leavingScreen
    }),
    overflowX: 'hidden',
    '& .MuiDrawer-paper': {
      width: theme.spacing(7),
      transition: theme.transitions.create('width', {
        easing: TRANSITIONS.easing.sharp,
        duration: TRANSITIONS.duration.leavingScreen
      }),
      overflowX: 'hidden'
    }
  }),
  ...(isNested && {
    '& .MuiListItem-root': {
      paddingLeft: theme.spacing(4)
    }
  })
}));

// Types
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  children?: NavItem[];
  requiredPermissions: string[];
  isRealTime?: boolean;
}

// Navigation items with permission requirements
const NAVIGATION_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'dashboard',
    path: '/dashboard',
    requiredPermissions: ['view:dashboard'],
    isRealTime: true
  },
  {
    id: 'projects',
    label: 'Projects',
    icon: 'folder',
    path: '/projects',
    requiredPermissions: ['view:projects'],
    isRealTime: true,
    children: [
      {
        id: 'active-projects',
        label: 'Active Projects',
        icon: 'folder_open',
        path: '/projects/active',
        requiredPermissions: ['view:projects']
      },
      {
        id: 'archived-projects',
        label: 'Archived',
        icon: 'folder_off',
        path: '/projects/archived',
        requiredPermissions: ['view:projects']
      }
    ]
  },
  {
    id: 'tasks',
    label: 'Tasks',
    icon: 'task',
    path: '/tasks',
    requiredPermissions: ['view:tasks'],
    isRealTime: true,
    children: [
      {
        id: 'my-tasks',
        label: 'My Tasks',
        icon: 'assignment_ind',
        path: '/tasks/my-tasks',
        requiredPermissions: ['view:tasks']
      },
      {
        id: 'team-tasks',
        label: 'Team Tasks',
        icon: 'group_work',
        path: '/tasks/team',
        requiredPermissions: ['view:team_tasks']
      }
    ]
  }
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, className }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, userPermissions } = useAuth();
  const { subscribe, unsubscribe } = useWebSocket();

  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Cache navigation items based on user permissions
  const filteredNavItems = useMemo(() => {
    return NAVIGATION_ITEMS.filter(item => {
      const hasPermission = item.requiredPermissions.every(
        permission => userPermissions?.includes(permission)
      );
      return hasPermission;
    });
  }, [userPermissions]);

  // Handle real-time updates for navigation items
  useEffect(() => {
    const realTimeItems = filteredNavItems.filter(item => item.isRealTime);
    
    realTimeItems.forEach(item => {
      subscribe(`navigation:${item.id}`, (update) => {
        // Handle real-time updates for navigation items
        setLoading(true);
        // Update logic here
        setLoading(false);
      });
    });

    return () => {
      realTimeItems.forEach(item => {
        unsubscribe(`navigation:${item.id}`);
      });
    };
  }, [filteredNavItems, subscribe, unsubscribe]);

  // Handle navigation item click
  const handleNavClick = useCallback((path: string, itemId: string) => {
    if (expandedItems.includes(itemId)) {
      setExpandedItems(prev => prev.filter(id => id !== itemId));
    } else {
      setExpandedItems(prev => [...prev, itemId]);
    }
    
    if (path) {
      navigate(path);
      if (isMobile) {
        onClose();
      }
    }
  }, [expandedItems, navigate, isMobile, onClose]);

  // Render navigation items recursively
  const renderNavItems = useCallback((items: NavItem[], isNested: boolean = false) => {
    return items.map(item => (
      <React.Fragment key={item.id}>
        <ListItem
          button
          onClick={() => handleNavClick(item.path, item.id)}
          selected={location.pathname === item.path}
          sx={{
            pl: isNested ? 4 : 2,
            py: 1.5,
            '&.Mui-selected': {
              backgroundColor: theme.palette.action.selected,
              '&:hover': {
                backgroundColor: theme.palette.action.hover
              }
            }
          }}
        >
          <ListItemIcon>
            <Icon
              name={item.icon}
              size="medium"
              color={location.pathname === item.path ? 'primary' : 'inherit'}
            />
          </ListItemIcon>
          <ListItemText 
            primary={item.label}
            sx={{
              opacity: isOpen ? 1 : 0,
              transition: theme.transitions.create('opacity')
            }}
          />
          {item.children && (
            <Icon
              name={expandedItems.includes(item.id) ? 'expand_less' : 'expand_more'}
              size="small"
            />
          )}
        </ListItem>
        
        {item.children && (
          <Collapse
            in={expandedItems.includes(item.id)}
            timeout="auto"
            unmountOnExit
          >
            <List component="div" disablePadding>
              {renderNavItems(item.children, true)}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    ));
  }, [expandedItems, handleNavClick, isOpen, location.pathname, theme]);

  return (
    <StyledDrawer
      variant={isMobile ? 'temporary' : 'permanent'}
      open={isOpen}
      onClose={onClose}
      className={className}
      anchor="left"
      PaperProps={{
        elevation: 2,
        sx: {
          backgroundColor: theme.palette.background.paper,
          backgroundImage: 'none'
        }
      }}
    >
      {loading && (
        <CircularProgress
          size={24}
          sx={{
            position: 'absolute',
            top: theme.spacing(2),
            right: theme.spacing(2)
          }}
        />
      )}
      
      <List component="nav" sx={{ pt: 2 }}>
        {renderNavItems(filteredNavItems)}
      </List>
      
      <Divider sx={{ my: 2 }} />
      
      {/* Additional navigation sections can be added here */}
    </StyledDrawer>
  );
};

export default React.memo(Sidebar);
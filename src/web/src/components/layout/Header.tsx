/**
 * @fileoverview Responsive header component with enhanced accessibility and Material Design 3 principles
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useState, memo } from 'react';
import { 
  AppBar, 
  Toolbar, 
  IconButton, 
  Menu, 
  MenuItem, 
  useMediaQuery, 
  useTheme, 
  Fade,
  Badge,
  Box,
  Typography,
  Tooltip,
  styled
} from '@mui/material';
import { 
  Menu as MenuIcon, 
  Notifications, 
  Settings, 
  DarkMode, 
  LightMode, 
  AccountCircle 
} from '@mui/icons-material';
import { Avatar } from '../common/Avatar';
import { Button } from '../common/Button';
import { useAuth } from '../../hooks/useAuth';
import { Z_INDEX } from '../../constants/theme.constants';

// Styled components for enhanced layout and accessibility
const StyledAppBar = styled(AppBar)(({ theme }) => ({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: Z_INDEX.header,
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
}));

const StyledToolbar = styled(Toolbar)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: theme.spacing(0, 2),
  minHeight: '64px',
  [theme.breakpoints.up('sm')]: {
    minHeight: '64px',
  },
}));

const LogoSection = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
}));

const ActionsSection = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

// Interface for component props
interface HeaderProps {
  onMenuClick: (event: React.MouseEvent) => void;
  onThemeToggle: () => void;
  isDarkMode: boolean;
  elevation?: number;
}

/**
 * Header component with enhanced accessibility and responsive design
 */
export const Header = memo(({
  onMenuClick,
  onThemeToggle,
  isDarkMode,
  elevation = 0
}: HeaderProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user, logout } = useAuth();
  
  // State management
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Event handlers
  const handleProfileMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleNotificationsOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchor(event.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleNotificationsClose = useCallback(() => {
    setNotificationAnchor(null);
  }, []);

  const handleLogout = useCallback(async () => {
    handleMenuClose();
    await logout();
  }, [logout, handleMenuClose]);

  // Render profile menu
  const renderProfileMenu = (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={handleMenuClose}
      TransitionComponent={Fade}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      PaperProps={{
        elevation: 3,
        sx: { mt: 1 }
      }}
    >
      <MenuItem onClick={handleMenuClose}>Profile</MenuItem>
      <MenuItem onClick={handleMenuClose}>Settings</MenuItem>
      <MenuItem onClick={handleLogout}>Logout</MenuItem>
    </Menu>
  );

  // Render notifications menu
  const renderNotificationsMenu = (
    <Menu
      anchorEl={notificationAnchor}
      open={Boolean(notificationAnchor)}
      onClose={handleNotificationsClose}
      TransitionComponent={Fade}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      PaperProps={{
        elevation: 3,
        sx: { mt: 1, minWidth: 320 }
      }}
    >
      <MenuItem>No new notifications</MenuItem>
    </Menu>
  );

  return (
    <StyledAppBar 
      elevation={scrolled ? elevation : 0}
      position="fixed"
      color="inherit"
    >
      <StyledToolbar>
        <LogoSection>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="open drawer"
            onClick={onMenuClick}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{ display: { xs: 'none', sm: 'block' } }}
          >
            Task Master
          </Typography>
        </LogoSection>

        <ActionsSection>
          <Tooltip title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}>
            <IconButton
              color="inherit"
              onClick={onThemeToggle}
              aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
            >
              {isDarkMode ? <LightMode /> : <DarkMode />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Notifications">
            <IconButton
              color="inherit"
              onClick={handleNotificationsOpen}
              aria-label="Show notifications"
            >
              <Badge badgeContent={0} color="error">
                <Notifications />
              </Badge>
            </IconButton>
          </Tooltip>

          {!isMobile && (
            <Button
              variant="text"
              startIcon={<Settings />}
              onClick={() => {}}
              aria-label="Settings"
            >
              Settings
            </Button>
          )}

          {user && (
            <Tooltip title={user.email}>
              <IconButton
                edge="end"
                onClick={handleProfileMenuOpen}
                color="inherit"
                aria-label="Account settings"
                aria-controls="profile-menu"
                aria-haspopup="true"
              >
                <Avatar
                  size="small"
                  src={user.profileUrl}
                  name={`${user.firstName} ${user.lastName}`}
                  ariaLabel={`${user.firstName} ${user.lastName}'s profile`}
                />
              </IconButton>
            </Tooltip>
          )}
        </ActionsSection>
      </StyledToolbar>
      {renderProfileMenu}
      {renderNotificationsMenu}
    </StyledAppBar>
  );
});

Header.displayName = 'Header';

export default Header;
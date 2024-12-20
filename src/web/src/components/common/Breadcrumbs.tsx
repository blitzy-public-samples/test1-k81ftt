/**
 * @fileoverview Accessible breadcrumb navigation component with responsive design
 * @version 1.0.0
 * 
 * Implements WCAG 2.1 Level AA compliance with proper ARIA landmarks,
 * keyboard navigation, and screen reader support. Supports dynamic route
 * matching and responsive collapsing behavior across different viewports.
 */

// react version: ^18.0.0
// react-router-dom version: ^6.0.0
// @mui/material version: ^5.0.0
import React, { useMemo, useCallback } from 'react';
import { useLocation, Link, useMatch } from 'react-router-dom';
import {
  Typography,
  Breadcrumbs as MUIBreadcrumbs,
  useTheme,
  useMediaQuery,
} from '@mui/material';

import {
  DASHBOARD_ROUTES,
  PROJECT_ROUTES,
  TASK_ROUTES,
} from '../../constants/routes.constants';
import Icon from './Icon';

// Constants for responsive design
const DEFAULT_SEPARATOR = '/';
const MAX_ITEMS = {
  DESKTOP: 8,
  TABLET: 6,
  MOBILE: 4,
} as const;

const ITEMS_BEFORE_COLLAPSE = {
  DESKTOP: 2,
  TABLET: 1,
  MOBILE: 1,
} as const;

const ITEMS_AFTER_COLLAPSE = {
  DESKTOP: 1,
  TABLET: 1,
  MOBILE: 1,
} as const;

// Type definitions
interface BreadcrumbItem {
  label: string;
  path: string;
  icon?: string;
  isActive?: boolean;
  ariaLabel?: string;
}

interface BreadcrumbsProps {
  className?: string;
  separator?: string | React.ReactNode;
  maxItems?: number;
  itemsBeforeCollapse?: number;
  itemsAfterCollapse?: number;
  onItemClick?: (item: BreadcrumbItem) => void;
}

/**
 * Generates breadcrumb items based on current route path
 * @param pathname Current location pathname
 * @returns Array of breadcrumb items
 */
const generateBreadcrumbs = (pathname: string): BreadcrumbItem[] => {
  return useMemo(() => {
    if (!pathname) return [];

    const segments = pathname.split('/').filter(Boolean);
    const items: BreadcrumbItem[] = [];

    // Add home item
    items.push({
      label: 'Home',
      path: DASHBOARD_ROUTES.HOME,
      icon: 'home',
      ariaLabel: 'Navigate to home dashboard',
    });

    let currentPath = '';
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Match segment to route constants
      const matchedRoute = (() => {
        if (currentPath.startsWith('/dashboard')) {
          return Object.entries(DASHBOARD_ROUTES).find(([_, path]) => path === currentPath);
        }
        if (currentPath.startsWith('/projects')) {
          return Object.entries(PROJECT_ROUTES).find(([_, path]) => 
            useMatch(path)?.pathname === currentPath
          );
        }
        if (currentPath.startsWith('/tasks')) {
          return Object.entries(TASK_ROUTES).find(([_, path]) => 
            useMatch(path)?.pathname === currentPath
          );
        }
        return null;
      })();

      if (matchedRoute) {
        const [key, path] = matchedRoute;
        const isLast = index === segments.length - 1;

        // Generate human-readable label
        const label = (() => {
          if (path.includes(':id')) {
            // Handle dynamic route parameters
            const entityId = segments[index];
            return `${key.charAt(0) + key.slice(1).toLowerCase()} ${entityId}`;
          }
          return key.charAt(0) + key.slice(1).toLowerCase().replace(/_/g, ' ');
        })();

        items.push({
          label,
          path: currentPath,
          icon: getIconForRoute(key),
          isActive: isLast,
          ariaLabel: `Navigate to ${label}`,
        });
      }
    });

    return items;
  }, [pathname]);
};

/**
 * Maps route keys to appropriate icons
 */
const getIconForRoute = (routeKey: string): string => {
  const iconMap: Record<string, string> = {
    HOME: 'home',
    LIST: 'list',
    DETAIL: 'detail',
    CREATE: 'add',
    EDIT: 'edit',
    SETTINGS: 'settings',
    TEAM: 'group',
    TIMELINE: 'timeline',
    COMMENTS: 'chat',
    ATTACHMENTS: 'attachment',
  };

  return iconMap[routeKey] || 'chevron-right';
};

/**
 * Breadcrumbs component with accessibility and responsive features
 */
const Breadcrumbs = React.memo<BreadcrumbsProps>(({
  className,
  separator = DEFAULT_SEPARATOR,
  maxItems: propMaxItems,
  itemsBeforeCollapse: propItemsBeforeCollapse,
  itemsAfterCollapse: propItemsAfterCollapse,
  onItemClick,
}) => {
  const location = useLocation();
  const theme = useTheme();
  
  // Responsive breakpoints
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  // Calculate responsive values
  const maxItems = propMaxItems ?? (
    isMobile ? MAX_ITEMS.MOBILE :
    isTablet ? MAX_ITEMS.TABLET :
    MAX_ITEMS.DESKTOP
  );

  const itemsBeforeCollapse = propItemsBeforeCollapse ?? (
    isMobile ? ITEMS_BEFORE_COLLAPSE.MOBILE :
    isTablet ? ITEMS_BEFORE_COLLAPSE.TABLET :
    ITEMS_BEFORE_COLLAPSE.DESKTOP
  );

  const itemsAfterCollapse = propItemsAfterCollapse ?? (
    isMobile ? ITEMS_AFTER_COLLAPSE.MOBILE :
    isTablet ? ITEMS_AFTER_COLLAPSE.TABLET :
    ITEMS_AFTER_COLLAPSE.DESKTOP
  );

  // Generate breadcrumb items
  const items = generateBreadcrumbs(location.pathname);

  /**
   * Renders individual breadcrumb item with proper accessibility attributes
   */
  const renderBreadcrumbItem = useCallback((item: BreadcrumbItem, index: number) => {
    const isLast = index === items.length - 1;
    const Component = isLast ? Typography : Link;

    return (
      <Component
        key={item.path}
        color={isLast ? 'textPrimary' : 'primary'}
        to={!isLast ? item.path : undefined}
        onClick={!isLast ? () => onItemClick?.(item) : undefined}
        sx={{
          display: 'flex',
          alignItems: 'center',
          textDecoration: 'none',
          '&:hover': !isLast && {
            textDecoration: 'underline',
          },
        }}
        aria-current={isLast ? 'page' : undefined}
        component={!isLast ? Link : 'span'}
      >
        {item.icon && (
          <Icon
            name={item.icon}
            size="small"
            sx={{ mr: 0.5 }}
            aria-hidden="true"
          />
        )}
        <span>{item.label}</span>
      </Component>
    );
  }, [items.length, onItemClick]);

  return (
    <nav aria-label="Breadcrumb navigation">
      <MUIBreadcrumbs
        className={className}
        separator={
          typeof separator === 'string' ? (
            <Typography
              aria-hidden="true"
              color="textSecondary"
              sx={{ mx: 1 }}
            >
              {separator}
            </Typography>
          ) : separator
        }
        maxItems={maxItems}
        itemsBeforeCollapse={itemsBeforeCollapse}
        itemsAfterCollapse={itemsAfterCollapse}
        sx={{
          '& .MuiBreadcrumbs-ol': {
            flexWrap: 'nowrap',
          },
          '& .MuiBreadcrumbs-li': {
            display: 'flex',
            alignItems: 'center',
          },
        }}
      >
        {items.map(renderBreadcrumbItem)}
      </MUIBreadcrumbs>
    </nav>
  );
});

Breadcrumbs.displayName = 'Breadcrumbs';

export default Breadcrumbs;
export type { BreadcrumbsProps, BreadcrumbItem };
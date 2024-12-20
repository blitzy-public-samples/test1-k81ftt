// @mui/material version: ^5.0.0
// @mui/icons-material version: ^5.0.0
import { SvgIcon, useTheme } from '@mui/material';
import {
  TaskAlt,
  TaskOutlined,
  AddTask,
  FolderOutlined,
  CreateNewFolder,
  FolderShared,
  PriorityHigh,
  LowPriority,
  Warning,
  CircleOutlined,
  CheckCircle,
  Cancel,
  Pending
} from '@mui/icons-material';
import { SvgIconProps } from '@mui/material/SvgIcon';

// Icon size constants for consistent scaling
const ICON_SIZES = {
  small: 16,
  medium: 24,
  large: 32
} as const;

// Theme-aware color constants
const ICON_COLORS = {
  light: {
    default: 'rgba(0, 0, 0, 0.87)',
    disabled: 'rgba(0, 0, 0, 0.38)'
  },
  dark: {
    default: 'rgba(255, 255, 255, 0.87)',
    disabled: 'rgba(255, 255, 255, 0.38)'
  }
} as const;

// Type definitions
type IconSize = keyof typeof ICON_SIZES;
type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'CANCELLED';

// Enhanced interface for theme-aware icon components
interface IconComponent extends SvgIconProps {
  size?: IconSize;
  highContrast?: boolean;
  ariaLabel?: string;
}

// Helper function to get icon size in pixels
const getIconSize = (size: IconSize = 'medium'): number => ICON_SIZES[size];

// Base icon wrapper with theme and accessibility support
const ThemedIcon = ({
  component: IconComponent,
  size = 'medium',
  color = 'inherit',
  highContrast = false,
  ariaLabel,
  className,
  ...props
}: IconComponent & { component: typeof SvgIcon }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  
  const iconColor = color === 'inherit' 
    ? (isDarkMode ? ICON_COLORS.dark.default : ICON_COLORS.light.default)
    : undefined;

  const iconProps = {
    component: IconComponent,
    sx: {
      width: getIconSize(size),
      height: getIconSize(size),
      ...(highContrast && {
        filter: 'contrast(1.5)'
      })
    },
    color,
    className,
    'aria-label': ariaLabel,
    ...props
  };

  return <SvgIcon {...iconProps} />;
};

// Task-related icons
export const TaskIcon = {
  Default: (props: IconComponent) => (
    <ThemedIcon component={TaskOutlined} ariaLabel="Task" {...props} />
  ),
  Completed: (props: IconComponent) => (
    <ThemedIcon component={TaskAlt} ariaLabel="Completed task" {...props} />
  ),
  New: (props: IconComponent) => (
    <ThemedIcon component={AddTask} ariaLabel="New task" {...props} />
  )
};

// Project-related icons
export const ProjectIcon = {
  Default: (props: IconComponent) => (
    <ThemedIcon component={FolderOutlined} ariaLabel="Project" {...props} />
  ),
  New: (props: IconComponent) => (
    <ThemedIcon component={CreateNewFolder} ariaLabel="New project" {...props} />
  ),
  Shared: (props: IconComponent) => (
    <ThemedIcon component={FolderShared} ariaLabel="Shared project" {...props} />
  )
};

// Priority level indicators
export const PriorityIcons: Record<PriorityLevel, React.ComponentType<IconComponent>> = {
  LOW: (props) => (
    <ThemedIcon component={LowPriority} color="info" ariaLabel="Low priority" {...props} />
  ),
  MEDIUM: (props) => (
    <ThemedIcon component={Warning} color="primary" ariaLabel="Medium priority" {...props} />
  ),
  HIGH: (props) => (
    <ThemedIcon component={PriorityHigh} color="warning" ariaLabel="High priority" {...props} />
  ),
  URGENT: (props) => (
    <ThemedIcon component={PriorityHigh} color="error" ariaLabel="Urgent priority" {...props} />
  )
};

// Status indicators
export const StatusIcons: Record<TaskStatus, React.ComponentType<IconComponent>> = {
  TODO: (props) => (
    <ThemedIcon component={CircleOutlined} ariaLabel="To do" {...props} />
  ),
  IN_PROGRESS: (props) => (
    <ThemedIcon component={Pending} color="primary" ariaLabel="In progress" {...props} />
  ),
  IN_REVIEW: (props) => (
    <ThemedIcon component={Pending} color="warning" ariaLabel="In review" {...props} />
  ),
  COMPLETED: (props) => (
    <ThemedIcon component={CheckCircle} color="success" ariaLabel="Completed" {...props} />
  ),
  CANCELLED: (props) => (
    <ThemedIcon component={Cancel} color="error" ariaLabel="Cancelled" {...props} />
  )
};

// Export constants for external use
export { ICON_SIZES, ICON_COLORS };

// Export types for external use
export type { IconComponent, IconSize, PriorityLevel, TaskStatus };
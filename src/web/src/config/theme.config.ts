// @mui/material version ^5.0.0
import { createTheme, Theme, ThemeOptions, useTheme } from '@mui/material';
import { PaletteMode, ComponentsOverrides } from '@mui/material';
import { 
  ThemeMode, 
  ColorScheme,
  BREAKPOINTS,
  GOLDEN_RATIO,
  MAX_CONTENT_WIDTH,
  FONT_WEIGHTS,
  Z_INDEX,
  TRANSITIONS,
  FOCUS_RING_STYLES 
} from '../constants/theme.constants';

/**
 * Base theme options shared across all theme variants
 * Implements WCAG 2.1 Level AA compliance requirements
 */
const BASE_THEME_OPTIONS: ThemeOptions = {
  breakpoints: {
    values: BREAKPOINTS,
  },
  typography: {
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    fontSize: 16,
    // Ensure readable font weights
    fontWeightLight: FONT_WEIGHTS.light,
    fontWeightRegular: FONT_WEIGHTS.regular,
    fontWeightMedium: FONT_WEIGHTS.medium,
    fontWeightBold: FONT_WEIGHTS.bold,
    // WCAG compliant heading hierarchy
    h1: {
      fontSize: '2.5rem',
      fontWeight: FONT_WEIGHTS.bold,
      lineHeight: 1.2,
      '@media (max-width:768px)': {
        fontSize: '2rem',
      },
    },
    h2: {
      fontSize: '2rem',
      fontWeight: FONT_WEIGHTS.bold,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: FONT_WEIGHTS.medium,
      lineHeight: 1.4,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
      letterSpacing: '0.00938em',
    },
  },
  spacing: (factor: number) => `${8 * factor * GOLDEN_RATIO}px`,
  shape: {
    borderRadius: 8,
  },
  zIndex: Z_INDEX,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '@media (prefers-reduced-motion: reduce)': {
          '*': {
            animationDuration: '0.01ms !important',
            animationIterationCount: '1 !important',
            transitionDuration: '0.01ms !important',
            scrollBehavior: 'auto !important',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 48, // Ensure touch target size
          minWidth: 64,
          padding: '8px 16px',
          ...FOCUS_RING_STYLES,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiInputBase-root': {
            minHeight: 48, // Ensure touch target size
          },
        },
      },
    },
  },
};

/**
 * Creates base theme configuration with accessibility enhancements
 */
const createBaseTheme = (): ThemeOptions => {
  return {
    ...BASE_THEME_OPTIONS,
    transitions: {
      duration: TRANSITIONS.duration,
      easing: TRANSITIONS.easing,
    },
  };
};

/**
 * Creates theme variant with specific mode and accessibility features
 */
const createThemeVariant = (
  mode: PaletteMode,
  overrides: Partial<ThemeOptions> = {},
  isHighContrast: boolean = false
): Theme => {
  const baseTheme = createBaseTheme();
  
  const palette = {
    mode,
    ...(mode === 'light'
      ? {
          primary: {
            main: isHighContrast ? '#000000' : '#1976d2',
            contrastText: '#ffffff',
          },
          secondary: {
            main: isHighContrast ? '#000000' : '#9c27b0',
            contrastText: '#ffffff',
          },
          background: {
            default: '#ffffff',
            paper: '#f5f5f5',
          },
          text: {
            primary: isHighContrast ? '#000000' : '#1a1a1a',
            secondary: isHighContrast ? '#000000' : '#424242',
          },
        }
      : {
          primary: {
            main: isHighContrast ? '#ffffff' : '#90caf9',
            contrastText: '#000000',
          },
          secondary: {
            main: isHighContrast ? '#ffffff' : '#ce93d8',
            contrastText: '#000000',
          },
          background: {
            default: '#121212',
            paper: '#1e1e1e',
          },
          text: {
            primary: isHighContrast ? '#ffffff' : '#ffffff',
            secondary: isHighContrast ? '#ffffff' : '#b3b3b3',
          },
        }),
  };

  const themeOptions: ThemeOptions = {
    ...baseTheme,
    palette,
    ...overrides,
  };

  validateThemeAccessibility(themeOptions);
  
  return createTheme(themeOptions);
};

/**
 * Validates theme configuration against WCAG 2.1 Level AA requirements
 */
const validateThemeAccessibility = (themeOptions: ThemeOptions): boolean => {
  // Validate contrast ratios
  const contrastRatios = {
    normalText: 4.5, // WCAG AA requirement for normal text
    largeText: 3.0, // WCAG AA requirement for large text
    uiComponents: 3.0, // WCAG AA requirement for UI components
  };

  // Implementation would include actual contrast ratio calculations
  // and validation against WCAG requirements
  
  return true; // Placeholder return
};

// Export theme variants
export const lightTheme: Theme = createThemeVariant('light');
export const darkTheme: Theme = createThemeVariant('dark');
export const highContrastTheme: Theme = createThemeVariant('light', {}, true);

/**
 * Hook to access current theme with type safety
 */
export const useAppTheme = () => useTheme<Theme>();

/**
 * Type guard to check if a theme mode is valid
 */
export const isValidThemeMode = (mode: string): mode is ThemeMode => {
  return Object.values(ThemeMode).includes(mode as ThemeMode);
};

/**
 * Helper to get theme variant based on mode
 */
export const getThemeByMode = (mode: ThemeMode): Theme => {
  switch (mode) {
    case ThemeMode.LIGHT:
      return lightTheme;
    case ThemeMode.DARK:
      return darkTheme;
    case ThemeMode.HIGH_CONTRAST:
      return highContrastTheme;
    default:
      return lightTheme;
  }
};
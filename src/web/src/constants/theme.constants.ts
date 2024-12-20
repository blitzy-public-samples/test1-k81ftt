// @mui/material version ^5.0.0
import { PaletteMode } from '@mui/material';

/**
 * Available theme modes for the application
 * Supports system preference and accessibility needs
 */
export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark',
  HIGH_CONTRAST = 'high-contrast'
}

/**
 * Color scheme options following Material Design 3 color system
 * Used for consistent color application across components
 */
export enum ColorScheme {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
  SUCCESS = 'success'
}

/**
 * Responsive breakpoint values in pixels
 * Following Material Design breakpoint system for consistent layout adaptation
 */
export const BREAKPOINTS = {
  xs: 320, // Mobile breakpoint
  sm: 768, // Tablet breakpoint
  md: 1024, // Desktop breakpoint
  lg: 1440 // Large desktop breakpoint
} as const;

/**
 * Golden ratio for maintaining visual hierarchy and spacing
 * Used for whitespace calculations and layout proportions
 */
export const GOLDEN_RATIO = 1.618;

/**
 * Maximum content width in pixels
 * Ensures consistent content containment across viewport sizes
 */
export const MAX_CONTENT_WIDTH = 1440;

/**
 * Font weight values for typography consistency
 * Following Material Design type scale
 */
export const FONT_WEIGHTS = {
  light: 300,
  regular: 400,
  medium: 500,
  bold: 700
} as const;

/**
 * Z-index values for consistent layering
 * Ensures proper stacking of overlapping elements
 */
export const Z_INDEX = {
  modal: 1000,
  dropdown: 900,
  header: 800,
  footer: 700,
  tooltip: 600,
  overlay: 500
} as const;

/**
 * Animation durations and easing functions
 * Following Material Design motion principles
 */
export const TRANSITIONS = {
  duration: {
    shortest: 150,
    shorter: 200,
    short: 250,
    standard: 300,
    complex: 375,
    enteringScreen: 225,
    leavingScreen: 195
  },
  easing: {
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)'
  }
} as const;

/**
 * Type for theme mode to ensure type safety with Material-UI theme system
 */
export type ThemeModeType = PaletteMode | 'high-contrast';

/**
 * Interface for breakpoint values
 * Ensures type safety when using breakpoints
 */
export interface BreakpointValues {
  readonly xs: typeof BREAKPOINTS.xs;
  readonly sm: typeof BREAKPOINTS.sm;
  readonly md: typeof BREAKPOINTS.md;
  readonly lg: typeof BREAKPOINTS.lg;
}

/**
 * Interface for z-index values
 * Ensures type safety when using z-index values
 */
export interface ZIndexValues {
  readonly modal: typeof Z_INDEX.modal;
  readonly dropdown: typeof Z_INDEX.dropdown;
  readonly header: typeof Z_INDEX.header;
  readonly footer: typeof Z_INDEX.footer;
  readonly tooltip: typeof Z_INDEX.tooltip;
  readonly overlay: typeof Z_INDEX.overlay;
}

/**
 * Interface for transition duration values
 * Ensures type safety when using transition durations
 */
export interface TransitionDurationValues {
  readonly shortest: typeof TRANSITIONS.duration.shortest;
  readonly shorter: typeof TRANSITIONS.duration.shorter;
  readonly short: typeof TRANSITIONS.duration.short;
  readonly standard: typeof TRANSITIONS.duration.standard;
  readonly complex: typeof TRANSITIONS.duration.complex;
  readonly enteringScreen: typeof TRANSITIONS.duration.enteringScreen;
  readonly leavingScreen: typeof TRANSITIONS.duration.leavingScreen;
}

/**
 * Interface for transition easing values
 * Ensures type safety when using transition easing functions
 */
export interface TransitionEasingValues {
  readonly easeInOut: typeof TRANSITIONS.easing.easeInOut;
  readonly easeOut: typeof TRANSITIONS.easing.easeOut;
  readonly easeIn: typeof TRANSITIONS.easing.easeIn;
  readonly sharp: typeof TRANSITIONS.easing.sharp;
}
// @emotion/css v11.0.0
import { css } from '@emotion/css';

// Font display strategy for optimal loading performance
const FONT_DISPLAY: FontDisplay = 'swap';

// Unicode ranges for optimal font subsetting
const UNICODE_RANGES = [
  'U+0000-00FF', // Basic Latin + Latin Supplement
  'U+0131',      // Turkish I
  'U+0152-0153', // Latin Extended-A
  'U+02BB-02BC', // Hawaiian
  'U+02C6',      // Spacing Modifier Letters
  'U+02DA',      // Spacing Modifier Letters
  'U+02DC',      // Spacing Modifier Letters
  'U+2000-206F', // General Punctuation
  'U+2074',      // Superscripts and Subscripts
  'U+20AC',      // Euro Symbol
  'U+2122',      // Trade Mark Sign
  'U+2191',      // Arrows
  'U+2193',      // Arrows
  'U+2212',      // Mathematical Operators
  'U+2215',      // Mathematical Operators
  'U+FEFF',      // Zero Width No-Break Space
  'U+FFFD'       // Replacement Character
];

// OpenType features for enhanced typography
const OPENTYPE_FEATURES = {
  'kern': true,  // Kerning
  'liga': true,  // Standard Ligatures
  'calt': true   // Contextual Alternates
};

// Font weights following Material Design guidelines and WCAG contrast requirements
export const fontWeights = {
  light: 300,
  regular: 400,
  medium: 500,
  bold: 700
} as const;

// Font families with comprehensive fallbacks for maximum compatibility
export const fontFamilies = {
  primary: "'Inter var', 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
  secondary: "'Inter var', 'Inter', Arial, 'Helvetica Neue', sans-serif",
  monospace: "'Fira Code VF', 'Fira Code', 'Consolas', 'Monaco', 'Andale Mono', 'Ubuntu Mono', monospace"
} as const;

// Type definitions for font display strategies
type FontDisplay = 'auto' | 'block' | 'swap' | 'fallback' | 'optional';

/**
 * Generates optimized @font-face declarations for custom fonts
 * @param fontFamily - Font family name
 * @param fontPath - Path to font files
 * @param fontWeight - Font weight value
 * @param fontStyle - Font style (normal, italic)
 * @param fontDisplay - Font display strategy
 * @returns Optimized CSS @font-face declaration
 */
const generateFontFace = (
  fontFamily: string,
  fontPath: string,
  fontWeight: number,
  fontStyle: string = 'normal',
  fontDisplay: FontDisplay = FONT_DISPLAY
): string => {
  return css`
    @font-face {
      font-family: '${fontFamily}';
      src: url('${fontPath}.woff2') format('woff2'),
           url('${fontPath}.woff') format('woff');
      font-weight: ${fontWeight};
      font-style: ${fontStyle};
      font-display: ${fontDisplay};
      unicode-range: ${UNICODE_RANGES.join(', ')};
      font-feature-settings: ${Object.entries(OPENTYPE_FEATURES)
        .map(([feature, enabled]) => `"${feature}" ${enabled ? '1' : '0'}`)
        .join(', ')};
    }
  `;
};

// Font face declarations for the application
export const fontFaces = css`
  /* Inter Variable Font */
  ${generateFontFace('Inter var', '/fonts/inter/Inter-roman.var', 100, 'normal')}
  ${generateFontFace('Inter var', '/fonts/inter/Inter-italic.var', 100, 'italic')}

  /* Inter Static Fonts - Fallback */
  ${generateFontFace('Inter', '/fonts/inter/Inter-Light', fontWeights.light)}
  ${generateFontFace('Inter', '/fonts/inter/Inter-Regular', fontWeights.regular)}
  ${generateFontFace('Inter', '/fonts/inter/Inter-Medium', fontWeights.medium)}
  ${generateFontFace('Inter', '/fonts/inter/Inter-Bold', fontWeights.bold)}

  /* Fira Code Variable Font */
  ${generateFontFace('Fira Code VF', '/fonts/fira-code/FiraCode-VF', 100)}

  /* Fira Code Static Fonts - Fallback */
  ${generateFontFace('Fira Code', '/fonts/fira-code/FiraCode-Light', fontWeights.light)}
  ${generateFontFace('Fira Code', '/fonts/fira-code/FiraCode-Regular', fontWeights.regular)}
  ${generateFontFace('Fira Code', '/fonts/fira-code/FiraCode-Medium', fontWeights.medium)}
  ${generateFontFace('Fira Code', '/fonts/fira-code/FiraCode-Bold', fontWeights.bold)}
`;
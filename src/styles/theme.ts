import { COLORS } from './colors';
import { SPACING, BORDER_RADIUS } from './spacing';

export const theme = {
  colors: COLORS,
  spacing: SPACING,
  borderRadius: BORDER_RADIUS,
  fonts: {
    sans: 'var(--font-geist-sans), system-ui, sans-serif',
    mono: 'var(--font-geist-mono), monospace',
  },
  shadows: {
    card: '0 4px 20px rgba(0, 0, 0, 0.3)',
    glow: {
      blue: '0 0 30px rgba(59, 130, 246, 0.3)',
      emerald: '0 0 30px rgba(16, 185, 129, 0.3)',
      red: '0 0 30px rgba(239, 68, 68, 0.3)',
    },
  },
} as const;

export type Theme = typeof theme;

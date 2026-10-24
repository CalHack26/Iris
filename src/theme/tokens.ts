/**
 * Soma design tokens, taken from the Figma file "App Design" (7Lg5xGtwccvAmHeFEx9kYA).
 * The file defines no Figma variables, so these values mirror the raw styles used across screens.
 */
import type { TextStyle } from 'react-native';

export const colors = {
  background: '#f6f6f2',
  surface: '#ffffff',
  ink: '#202522',
  muted: '#68716b',
  divider: '#e6e9e3',
  field: '#f0f2ed',
  anatomyBg: '#f0f0eb',
  accent: '#365e62',
  accentSoft: '#e3eff1',
  accentSoftAlt: '#e6eff3',
  sage: '#e6ede4',
  sand: '#f1ebdd',
  blush: '#f4e6e1',
  marker: '#bd705d',
  dotInactive: '#cdd3cb',
  sliderTrack: '#e3e6de',
  outline: '#d7e0db',
  scrim: 'rgba(32,37,34,0.14)',
  white: '#ffffff',
} as const;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
} as const;

export const radii = {
  pill: 100,
  card: 28,
  anatomy: 32,
  sheet: 32,
  field: 20,
  tile: 18,
  nav: 24,
  navItem: 16,
} as const;

export const space = {
  screen: 20,
  section: 20,
  card: 20,
} as const;

export const shadow = {
  floating: {
    shadowColor: '#26342c',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  sheet: {
    shadowColor: '#202522',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
} as const;

/** Build an Inter text style. `lh` is a line-height multiplier, as in Figma (e.g. 1.45). */
export function type(
  size: number,
  weight: keyof typeof fonts = 'regular',
  color: string = colors.ink,
  lh?: number,
): TextStyle {
  return {
    fontFamily: fonts[weight],
    fontSize: size,
    color,
    ...(lh ? { lineHeight: Math.round(size * lh) } : null),
  };
}

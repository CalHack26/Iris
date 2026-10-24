import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, space } from '@/theme/tokens';

const TONES = {
  white: colors.surface,
  sage: colors.sage,
  sand: colors.sand,
  sky: colors.accentSoftAlt,
  field: colors.field,
} as const;

type Props = {
  children: ReactNode;
  tone?: keyof typeof TONES;
  gap?: number;
  padding?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

/** The rounded content card used on every screen. */
export function Card({ children, tone = 'white', gap = 16, padding = space.card, radius = radii.card, style }: Props) {
  return (
    <View
      style={[{ backgroundColor: TONES[tone], borderRadius: radius, padding, gap, overflow: 'hidden' }, style]}>
      {children}
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: 1, backgroundColor: colors.divider, alignSelf: 'stretch' }, style]} />;
}

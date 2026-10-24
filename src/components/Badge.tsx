import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii } from '@/theme/tokens';

import { Txt } from './Txt';

const TONES = {
  blush: { bg: colors.blush, fg: colors.ink },
  sage: { bg: colors.sage, fg: colors.ink },
  sky: { bg: colors.accentSoftAlt, fg: colors.accent },
  accent: { bg: colors.accentSoft, fg: colors.accent },
  field: { bg: colors.field, fg: colors.ink },
  white: { bg: colors.surface, fg: colors.ink },
} as const;

type Props = {
  children: ReactNode;
  tone?: keyof typeof TONES;
  style?: StyleProp<ViewStyle>;
};

/** Small status pill ("Aching", "6 records", "✓ Saved"). */
export function Badge({ children, tone = 'field', style }: Props) {
  const t = TONES[tone];
  return (
    <View
      style={[
        { backgroundColor: t.bg, borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 7, alignSelf: 'flex-start' },
        style,
      ]}>
      <Txt size={12} weight="semibold" color={t.fg}>
        {children}
      </Txt>
    </View>
  );
}

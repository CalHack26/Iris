import { useSyncExternalStore } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { getDrawMode, subscribeDraw } from '@/lib/draw-selection';
import { colors, radii } from '@/theme/tokens';

import { Txt } from './Txt';

const VARIANTS = {
  primary: { bg: colors.ink, fg: colors.white, border: undefined },
  white: { bg: colors.surface, fg: colors.ink, border: undefined },
  outline: { bg: colors.surface, fg: colors.ink, border: colors.divider },
  accent: { bg: colors.accentSoft, fg: colors.accent, border: undefined },
  selected: { bg: colors.accentSoftAlt, fg: colors.accent, border: undefined },
  field: { bg: colors.field, fg: colors.ink, border: undefined },
};

export function PillButton({
  label,
  onPress,
  icon: Icon,
  variant = 'white',
  height = 40,
  paddingH = 15,
  gap = 8,
  size = 13,
  flex,
  disabled,
  style,
  accessibilityLabel,
}) {
  const drawing = useSyncExternalStore(subscribeDraw, getDrawMode, getDrawMode);
  if (drawing && /turn/i.test(label)) return null;

  const v = VARIANTS[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          paddingHorizontal: paddingH,
          gap,
          backgroundColor: v.bg,
          borderColor: v.border,
          borderWidth: v.border ? 1 : 0,
          opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
        },
        flex && styles.flex,
        style,
      ]}>
      {Icon ? <Icon /> : null}
      <Txt size={size} weight="semibold" color={v.fg} numberOfLines={1}>
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  flex: { flex: 1 },
});

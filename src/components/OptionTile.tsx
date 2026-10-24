import type { FC } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { colors } from '@/theme/tokens';

import { Txt } from './Txt';

/** Selectable illustrated tile used for "What does it feel like?" and "How strong is it?". */
export function OptionTile({
  icon: Icon,
  label,
  lines,
  selected,
  onPress,
  height,
  gap,
}: {
  icon: FC<SvgProps>;
  label: string;
  lines: string[];
  selected: boolean;
  onPress: () => void;
  height: number;
  gap: number;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={[label, ...lines].join(', ')}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        { height, gap, backgroundColor: selected ? colors.accentSoft : colors.field },
        pressed && !selected && { opacity: 0.75 },
      ]}>
      <Icon />
      <Txt size={12} weight="semibold" color={selected ? colors.accent : colors.ink} lh={1.35} numberOfLines={1}>
        {selected ? `${label} ✓` : label}
      </Txt>
      {lines.map((line) => (
        <Txt key={line} size={10} color={colors.muted} lh={1.35} style={styles.center} numberOfLines={1}>
          {line}
        </Txt>
      ))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    paddingVertical: 10,
  },
  center: { textAlign: 'center' },
});

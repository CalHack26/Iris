import { View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/theme/tokens';

import { Txt } from './Txt';

/** Label / big number / caption stack ("Saved records 06 12–24 Oct 2026"). */
export function Metric({
  label,
  value,
  caption,
  valueSize = 36,
  style,
}: {
  label: string;
  value: string;
  caption?: string;
  valueSize?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ gap: 5 }, style]}>
      <Txt size={12} color={colors.muted} lh={1.45}>
        {label}
      </Txt>
      <Txt size={valueSize} weight="medium">
        {value}
      </Txt>
      {caption ? (
        <Txt size={12} color={colors.muted} lh={1.45}>
          {caption}
        </Txt>
      ) : null}
    </View>
  );
}

/** Label over a medium-weight value, used in record details. */
export function Attribute({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 5 }}>
      <Txt size={12} color={colors.muted} lh={1.45}>
        {label}
      </Txt>
      <Txt size={16} weight="medium" lh={1.45}>
        {value}
      </Txt>
    </View>
  );
}

import { View } from 'react-native';

import { colors } from '@/theme/tokens';

import { Txt } from './Txt';

/** Page heading. The home screen's "Record, track, share" line is not shown. */
export function PageIntro({
  eyebrow,
  title,
  titleSize = 32,
  subtitle,
  subtitleSize = 14,
  gap = 12,
  before,
  children,
}) {
  const line = subtitle === 'Record, track, share' ? null : subtitle;
  return (
    <View style={{ gap }}>
      {before}
      {eyebrow ? (
        <Txt size={12} weight="semibold" color={colors.muted} lh={1.45}>
          {eyebrow}
        </Txt>
      ) : null}
      <Txt size={titleSize} weight="semibold" lh={1.12} accessibilityRole="header">
        {title}
      </Txt>
      {line ? (
        <Txt size={subtitleSize} color={colors.muted} lh={1.45}>
          {line}
        </Txt>
      ) : null}
      {children}
    </View>
  );
}

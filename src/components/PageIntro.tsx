import type { ReactNode } from 'react';
import { View } from 'react-native';

import { colors } from '@/theme/tokens';

import { Txt } from './Txt';

type Props = {
  eyebrow?: string;
  title: string;
  titleSize?: number;
  subtitle?: string;
  subtitleSize?: number;
  gap?: number;
  /** Rendered above the eyebrow (e.g. a back link or date chip). */
  before?: ReactNode;
  children?: ReactNode;
};

/** Page heading block: optional eyebrow, large title, muted subtitle, then any actions. */
export function PageIntro({
  eyebrow,
  title,
  titleSize = 32,
  subtitle,
  subtitleSize = 14,
  gap = 12,
  before,
  children,
}: Props) {
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
      {subtitle ? (
        <Txt size={subtitleSize} color={colors.muted} lh={1.45}>
          {subtitle}
        </Txt>
      ) : null}
      {children}
    </View>
  );
}

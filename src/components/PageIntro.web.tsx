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
  before?: ReactNode;
  children?: ReactNode;
};

const HIDDEN = new Set(['Record, track, share', 'View | Edit | Share']);

/** Page heading. Home and saved-record taglines stay off the website. */
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
  const line = subtitle && HIDDEN.has(subtitle) ? null : subtitle;
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

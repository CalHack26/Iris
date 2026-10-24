import { Text, type TextProps } from 'react-native';

import { colors, type fonts, type } from '@/theme/tokens';

type Props = TextProps & {
  size?: number;
  weight?: keyof typeof fonts;
  color?: string;
  /** Line-height multiplier, as in Figma (1.45 for most body copy). */
  lh?: number;
};

/** Inter text with the design's size/weight/line-height vocabulary. */
export function Txt({ size = 13, weight = 'regular', color = colors.ink, lh, style, ...rest }: Props) {
  return <Text {...rest} style={[type(size, weight, color, lh), style]} />;
}

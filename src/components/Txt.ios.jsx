import { useSyncExternalStore } from 'react';
import { Text } from 'react-native';

import { getDrawMode, subscribeDraw } from '@/lib/draw-selection';
import { colors, type } from '@/theme/tokens';

/** Inter text. While Draw is on, the turn instructions stay off the body map. */
export function Txt({ size = 13, weight = 'regular', color = colors.ink, lh, style, children, ...rest }) {
  const drawing = useSyncExternalStore(subscribeDraw, getDrawMode, getDrawMode);
  if (drawing && typeof children === 'string' && /turn it|rotate/i.test(children)) return null;
  return (
    <Text {...rest} style={[type(size, weight, color, lh), style]}>
      {children}
    </Text>
  );
}

import { useSyncExternalStore } from 'react';
import { Text } from 'react-native';

import { getDrawMode, subscribeDraw } from '@/lib/draw-selection';
import { colors, type } from '@/theme/tokens';

/** Inter text. While Draw is on, the turn instructions stay off the body map. */
export function Txt({ size = 13, weight = 'regular', color = colors.ink, lh, style, children, ...rest }) {
  const drawing = useSyncExternalStore(subscribeDraw, getDrawMode, getDrawMode);
  const line = typeof children === 'string' ? children : Array.isArray(children) ? children.join('') : '';
  if (drawing && /slides the body|two fingers turn|scroll zooms|turn it/i.test(line)) return null;
  return (
    <Text {...rest} style={[type(size, weight, color, lh), style]}>
      {children}
    </Text>
  );
}

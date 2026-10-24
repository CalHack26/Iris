import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme/tokens';

type Props = {
  values: number[];
  min: number;
  max: number;
  height: number;
  /** Horizontal inset of the first/last point from the plot edges. */
  insetX?: [number, number];
  /** Vertical inset of `max`/`min` from the plot top/bottom. */
  insetY?: [number, number];
  /** Values at which to draw 1pt gridlines. */
  gridlines?: number[];
  /** Rounded column behind the newest point. */
  highlight?: { width: number; color: string };
  points?: { r: number; strokeWidth: number };
  lineCap?: 'round' | 'butt';
};

/** Minimal line chart matching the design's plots (severity history, sensor averages, sparkline). */
export function LineChart({
  values,
  min,
  max,
  height,
  insetX = [0, 0],
  insetY = [0, 0],
  gridlines = [],
  highlight,
  points,
  lineCap = 'butt',
}: Props) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const span = max - min || 1;
  const y = (v: number) => insetY[0] + ((max - v) / span) * (height - insetY[0] - insetY[1]);
  const step = values.length > 1 ? (width - insetX[0] - insetX[1]) / (values.length - 1) : 0;
  const x = (i: number) => insetX[0] + i * step;
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join('');

  return (
    <View style={{ height, alignSelf: 'stretch' }} onLayout={onLayout}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          {gridlines.map((g) => (
            <Rect key={g} x={0} y={Math.min(Math.round(y(g)), height - 1)} width={width} height={1} fill={colors.divider} />
          ))}
          {highlight && values.length ? (
            <Rect
              x={Math.min(x(values.length - 1) - highlight.width / 2, width - highlight.width)}
              y={0}
              width={highlight.width}
              height={height}
              rx={highlight.width / 2}
              fill={highlight.color}
            />
          ) : null}
          <Path d={d} stroke={colors.ink} strokeWidth={2} strokeLinecap={lineCap} strokeLinejoin="round" fill="none" />
          {points
            ? values.map((v, i) => (
                <Circle
                  key={i}
                  cx={x(i)}
                  cy={y(v)}
                  r={points.r}
                  fill={colors.ink}
                  stroke={colors.white}
                  strokeWidth={points.strokeWidth}
                />
              ))
            : null}
        </Svg>
      ) : null}
    </View>
  );
}

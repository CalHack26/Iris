import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture, useSimultaneousGestures, useTapGesture } from 'react-native-gesture-handler';

import SliderThumbCenter from '@/assets/icons/slider-thumb-center.svg';
import SliderThumb from '@/assets/icons/slider-thumb.svg';
import { colors } from '@/theme/tokens';

const INSET = 10;

/** 0–10 pain score slider ("Fine-tune your score"). Tap or drag; snaps to whole numbers. */
export function ScoreSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [width, setWidth] = useState(0);
  const track = Math.max(width - INSET * 2, 0);
  const x = INSET + (track * value) / 10;

  const fromX = (px: number) => {
    if (!track) return;
    const v = Math.round(((px - INSET) / track) * 10);
    const next = Math.min(10, Math.max(0, v));
    if (next !== value) onChange(next);
  };

  const tap = useTapGesture({ runOnJS: true, onActivate: (e) => fromX(e.x) });
  const pan = usePanGesture({
    runOnJS: true,
    minDistance: 1,
    onActivate: (e) => fromX(e.x),
    onUpdate: (e) => fromX(e.x),
  });
  const gesture = useSimultaneousGestures(tap, pan);

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={styles.slider}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Pain score"
        accessibilityValue={{ min: 0, max: 10, now: value, text: `${value} out of 10` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) =>
          onChange(Math.min(10, Math.max(0, value + (e.nativeEvent.actionName === 'increment' ? 1 : -1))))
        }>
        <View style={[styles.track, { width: track }]} />
        <View style={[styles.fill, { width: (track * value) / 10 }]} />
        <View style={[styles.abs, { left: x - 11, top: 5 }]}>
          <SliderThumb />
        </View>
        <View style={[styles.abs, { left: x - 4, top: 12 }]}>
          <SliderThumbCenter />
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  slider: { height: 32, alignSelf: 'stretch' },
  abs: { position: 'absolute' },
  track: { position: 'absolute', left: INSET, top: 14, height: 4, borderRadius: 2, backgroundColor: colors.sliderTrack },
  fill: { position: 'absolute', left: INSET, top: 14, height: 4, borderRadius: 2, backgroundColor: colors.accent },
});

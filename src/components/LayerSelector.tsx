import { useState } from 'react';
import { Pressable, StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';

import BoneStop from '@/assets/icons/bone-stop.svg';
import DepthThumbAccent from '@/assets/icons/depth-thumb-accent.svg';
import DepthThumb from '@/assets/icons/depth-thumb.svg';
import SkinStop from '@/assets/icons/skin-stop.svg';
import { LAYERS } from '@/lib/format';
import type { Layer } from '@/lib/types';
import { colors, radii } from '@/theme/tokens';

import { Txt } from './Txt';

const ORDER: Layer[] = ['skin', 'muscles', 'bones'];

type Props = {
  value: Layer;
  onChange: (layer: Layer) => void;
  /** `card` is the Mark-a-pain layout; `dock` is the denser full-screen dock. */
  variant?: 'card' | 'dock';
};

/** Depth slider (Skin → Muscles & organs → Bones) with its three stop buttons. */
export function LayerSelector({ value, onChange, variant = 'card' }: Props) {
  const [trackWidth, setTrackWidth] = useState(0);
  const dock = variant === 'dock';
  const inset = dock ? 14 : 0;
  const index = ORDER.indexOf(value);
  const usable = Math.max(trackWidth - inset * 2, 0);
  const thumbX = inset + (usable * index) / 2;
  const thumbSize = dock ? 22 : 20;

  const onTrackPress = (e: GestureResponderEvent) => {
    if (!usable) return;
    const t = (e.nativeEvent.locationX - inset) / usable;
    onChange(ORDER[Math.min(2, Math.max(0, Math.round(t * 2)))]);
  };

  return (
    <View style={{ gap: dock ? 8 : 14 }}>
      <Pressable
        accessibilityRole="adjustable"
        accessibilityLabel="Anatomy depth"
        accessibilityValue={{ text: LAYERS[index].label }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) =>
          onChange(ORDER[Math.min(2, Math.max(0, index + (e.nativeEvent.actionName === 'increment' ? 1 : -1)))])
        }
        onPress={onTrackPress}
        onLayout={(e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width)}
        style={{ height: dock ? 24 : 20, justifyContent: 'center', paddingHorizontal: inset }}>
        <View style={styles.track} />
        {dock ? (
          <>
            <View style={[styles.fill, { left: inset, width: Math.max(thumbX - inset, 0) }]} />
            <View style={[styles.abs, { left: inset - 3, top: 9 }]}>
              <SkinStop />
            </View>
            <View style={[styles.abs, { right: inset - 3, top: 9 }]}>
              <BoneStop />
            </View>
          </>
        ) : null}
        <View style={[styles.abs, { left: thumbX - thumbSize / 2, top: dock ? 1 : 0 }]}>
          {dock ? <DepthThumbAccent /> : <DepthThumb />}
        </View>
      </Pressable>
      <View style={{ flexDirection: 'row', gap: dock ? 4 : 8 }}>
        {LAYERS.map((l) => {
          const selected = l.key === value;
          const fixed = dock ? (l.key === 'skin' ? 52 : 60) : 65;
          return (
            <Pressable
              key={l.key}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => onChange(l.key)}
              style={[
                styles.stop,
                { height: dock ? 40 : 36 },
                selected ? { flex: 1, backgroundColor: colors.accentSoftAlt } : { width: fixed },
              ]}>
              <Txt size={12} weight={selected ? 'semibold' : 'regular'} color={selected ? colors.accent : colors.muted}>
                {selected ? `✓ ${l.label}` : l.label}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.divider },
  fill: { position: 'absolute', top: 10, height: 4, borderRadius: 2, backgroundColor: colors.accent },
  stop: { borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 9 },
});

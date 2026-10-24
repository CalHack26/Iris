import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CheckWhite from '@/assets/icons/check-white.svg';
import MapPin15 from '@/assets/icons/map-pin-15.svg';
import Pencil15 from '@/assets/icons/pencil-15.svg';
import RotateCcw15 from '@/assets/icons/rotate-ccw-15.svg';
import X from '@/assets/icons/x.svg';
import { AnatomyCanvas } from '@/components/AnatomyCanvas';
import { LayerSelector } from '@/components/LayerSelector';
import { PillButton } from '@/components/PillButton';
import { Txt } from '@/components/Txt';
import { feelingLabel, severityLabel } from '@/lib/format';
import { useMarking } from '@/lib/useMarking';
import { useSomaStore } from '@/store/useSomaStore';
import { colors, radii, shadow } from '@/theme/tokens';

/** The design's enlarged anatomy box (533×483, centred, nudged 8pt up) inside a 361pt-wide canvas. */
const fullscreenImageBox = (w: number) => ({ width: 533, height: 483, left: (w - 533) / 2, top: -8 });

export default function FullScreenAnatomy() {
  const insets = useSafeAreaInsets();
  const { recordId } = useLocalSearchParams<{ recordId?: string }>();
  const m = useMarking();
  const { draft } = m;
  const [canvasHeight, setCanvasHeight] = useState(0);

  // Opened from a saved record: edit that record, and put back any in-progress mark when leaving.
  const pendingDraft = useRef(useSomaStore.getState().draft);
  useLayoutEffect(() => {
    if (recordId) useSomaStore.getState().editRecord(recordId);
  }, [recordId]);

  // Restore on unmount so swipe-down and the Android back button put the in-progress mark back too.
  useEffect(
    () => () => {
      if (recordId) useSomaStore.setState({ draft: pendingDraft.current });
    },
    [recordId],
  );

  const exit = () => router.back();
  const save = () => {
    if (recordId) useSomaStore.getState().saveDraft();
    router.back();
  };

  const detail =
    draft.feeling && draft.severity !== null
      ? `${feelingLabel(draft.feeling)} · ${draft.severity} / 10 · ${severityLabel(draft.severity)}`
      : 'Not described yet';

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 18) }]}>
      <Animated.View entering={FadeIn.duration(280)} style={styles.header}>
        <View style={{ gap: 3, flexShrink: 1 }}>
          <Txt size={20} weight="semibold" accessibilityRole="header">
            Body map
          </Txt>
          <Txt size={11} color={colors.muted}>
            Full-screen view|mark anywhere you want
          </Txt>
        </View>
        <PillButton label="Exit full screen" icon={X} gap={7} paddingH={10} onPress={exit} />
      </Animated.View>

      <View style={styles.row}>
        <PillButton
          label={m.mode === 'mark' ? '✓ Mark' : 'Mark'}
          icon={MapPin15}
          variant={m.mode === 'mark' ? 'selected' : 'white'}
          height={44}
          gap={7}
          paddingH={10}
          flex
          onPress={() => m.setMode('mark')}
        />
        <PillButton
          label={m.mode === 'draw' ? '✓ Draw' : 'Draw'}
          icon={Pencil15}
          variant={m.mode === 'draw' ? 'selected' : 'white'}
          height={44}
          gap={7}
          paddingH={10}
          flex
          onPress={() => m.setMode('draw')}
        />
      </View>

      <View style={{ flex: 1, minHeight: 280 }} onLayout={(e) => setCanvasHeight(e.nativeEvent.layout.height)}>
        {canvasHeight ? (
          <AnatomyCanvas
            height={canvasHeight}
            imageBox={fullscreenImageBox}
            background={colors.sand}
            radius={radii.card}
            labels={{ top: canvasHeight * 0.47, rLeft: 29, lRight: 32, weight: 'medium' }}
            numbered
            mark={draft.mark}
            strokes={draft.strokes}
            demoArea={draft.demoArea}
            mode={m.mode}
            zoom={m.zoom}
            turn={m.turn}
            onMark={m.onMark}
            onStroke={m.onStroke}
            onZoom={m.setZoom}>
            <Txt size={10} color={colors.muted} style={[styles.zoomLabel, { top: canvasHeight * 0.5275 }]}>
              Zoom
            </Txt>
            <View style={[styles.zoom, shadow.floating, { top: canvasHeight * 0.565 }]}>
              <Pressable accessibilityRole="button" accessibilityLabel="Zoom in" onPress={() => m.zoomBy(0.25)} style={styles.zoomBtn}>
                <Txt size={23}>+</Txt>
              </Pressable>
              <View style={styles.zoomDivider} />
              <Pressable accessibilityRole="button" accessibilityLabel="Zoom out" onPress={() => m.zoomBy(-0.25)} style={styles.zoomBtn}>
                <Txt size={23}>−</Txt>
              </Pressable>
            </View>
            <View style={styles.viewControls}>
              <PillButton label="‹ Turn left" height={44} paddingH={10} flex onPress={() => m.turnBy(-15)} />
              <PillButton
                label="Reset"
                icon={RotateCcw15}
                height={44}
                paddingH={10}
                gap={7}
                style={{ width: 91 }}
                accessibilityLabel={m.mode === 'draw' ? 'Reset view and clear drawing' : 'Reset view'}
                onPress={() => {
                  m.resetView();
                  if (m.mode === 'draw') m.clearDrawing();
                }}
              />
              <PillButton label="Turn right ›" height={44} paddingH={10} flex onPress={() => m.turnBy(15)} />
            </View>
          </AnatomyCanvas>
        ) : null}
      </View>

      <View style={styles.dock}>
        <View style={styles.selected}>
          <View style={styles.markId}>
            <Txt size={12} weight="semibold" color={colors.marker}>
              {m.marks ? '1' : '–'}
            </Txt>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Txt size={14} weight="semibold" numberOfLines={1}>
              {draft.location || 'Tap the body to mark'}
            </Txt>
            <Txt size={12} color={colors.muted} numberOfLines={1}>
              {detail}
            </Txt>
          </View>
        </View>
        <View style={styles.between}>
          <Txt size={12} weight="semibold">
            Anatomy layers
          </Txt>
          <Txt size={11} color={colors.accent}>
            {m.status}
          </Txt>
        </View>
        <LayerSelector variant="dock" value={draft.layer} onChange={m.setLayer} />
        <View style={styles.row}>
          <PillButton label="− Shallower" variant="field" height={44} paddingH={10} flex onPress={() => m.shiftLayer(-1)} />
          <PillButton label="+ Deeper" variant="field" height={44} paddingH={10} flex onPress={() => m.shiftLayer(1)} />
        </View>
        <PillButton
          label="Save changes"
          icon={CheckWhite}
          variant="primary"
          height={44}
          gap={7}
          paddingH={10}
          onPress={save}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 16, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  row: { flexDirection: 'row', gap: 8 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 18 },
  // Vertical positions scale with the canvas; the design's 400pt canvas puts them at 188/211/226.
  zoomLabel: { position: 'absolute', right: 22 },
  zoom: {
    position: 'absolute',
    right: 12,
    width: 44,
    borderRadius: 100,
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  zoomBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  zoomDivider: { width: 24, height: 1, backgroundColor: colors.divider },
  viewControls: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    gap: 6,
    ...shadow.floating,
  },
  dock: { backgroundColor: colors.white, borderRadius: radii.card, padding: 16, gap: 8, minHeight: 290 },
  selected: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 44 },
  markId: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

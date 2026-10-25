import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import ChevronLeft from '@/assets/icons/chevron-left.svg';
import ChevronRight from '@/assets/icons/chevron-right.svg';
import MapPin from '@/assets/icons/map-pin.svg';
import Maximize from '@/assets/icons/maximize.svg';
import Minus from '@/assets/icons/minus.svg';
import Pencil from '@/assets/icons/pencil.svg';
import Plus from '@/assets/icons/plus.svg';
import Rotate3d from '@/assets/icons/rotate-3d.svg';
import RotateCcw from '@/assets/icons/rotate-ccw.svg';
import { AnatomyCanvas } from '@/components/AnatomyCanvas';
import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { StepDots } from '@/components/Controls';
import { LayerSelector } from '@/components/LayerSelector';
import { PageIntro } from '@/components/PageIntro';
import { PillButton } from '@/components/PillButton';
import { Screen, Section } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { dateTimeComma, feelingLabel, layerLabel, shortLocation } from '@/lib/format';
import { useMarking } from '@/lib/useMarking';
import { useSomaStore } from '@/store/useSomaStore';
import { colors, shadow } from '@/theme/tokens';

export default function MarkAPain() {
  const m = useMarking();
  const { draft } = m;
  const { editingId } = draft;
  const discardEdit = useSomaStore((s) => s.discardEdit);
  const hasMark = m.marks > 0;

  return (
    <Screen>
      <Section index={1}>
        <PageIntro eyebrow={draft.editingId ? 'Editing saved record' : 'Guided symptom record'} title="Mark a pain" titleSize={30}>
          <Txt size={14} color={colors.muted} lh={1.45}>
            {dateTimeComma(new Date(draft.at))}
          </Txt>
          {editingId ? (
            <PillButton
              label="Cancel edit"
              variant="outline"
              height={40}
              style={{ alignSelf: 'flex-start' }}
              onPress={() => {
                discardEdit();
                router.navigate({ pathname: '/record/[id]', params: { id: editingId } });
              }}
            />
          ) : null}
        </PageIntro>
      </Section>

      <Section index={2}>
        <View style={{ gap: 12 }}>
          <View style={styles.row}>
            <PillButton
              label={m.mode === 'mark' ? '✓ Mark' : 'Mark'}
              icon={MapPin}
              variant={m.mode === 'mark' ? 'selected' : 'white'}
              paddingH={14}
              flex
              onPress={() => m.setMode('mark')}
            />
            <PillButton
              label={m.mode === 'draw' ? '✓ Draw' : 'Draw'}
              icon={Pencil}
              variant={m.mode === 'draw' ? 'selected' : 'white'}
              paddingH={14}
              flex
              onPress={() => m.setMode('draw')}
            />
          </View>
          <Badge tone="sky">{m.status}</Badge>
        </View>

        <AnatomyCanvas
          height={320}
          mark={draft.mark}
          mark3d={draft.mark3d}
          strokes={draft.strokes}
          demoArea={draft.demoArea}
          mode={m.canvasMode}
          zoom={m.zoom}
          turn={m.turn}
          onMark={m.onMark}
          onStroke={m.onStroke}
          onZoom={m.setZoom}
          onTurn={m.setTurn}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Full-screen body map"
            onPress={() => router.push('/body-map-fullscreen')}
            style={[styles.expand, shadow.floating]}>
            <Maximize />
          </Pressable>
          {hasMark ? (
            <View style={[styles.annotation, shadow.floating]} pointerEvents="none">
              <Txt size={12} weight="semibold" lh={1.45}>
                {shortLocation(draft.location)}
              </Txt>
              <Txt size={12} color={colors.muted} lh={1.45}>
                {draft.feeling && draft.severity !== null
                  ? `${feelingLabel(draft.feeling)} · ${draft.severity} / 10`
                  : 'Describe it next'}
              </Txt>
              <Txt size={11} color={colors.accent} lh={1.45}>
                {layerLabel(draft.layer)}
              </Txt>
            </View>
          ) : null}
          <View style={[styles.viewControls, shadow.floating]}>
            {m.mode === 'mark' ? (
              <ViewControl
                label="Rotate"
                icon={<Rotate3d />}
                selected={m.rotating}
                onPress={m.toggleRotate}
              />
            ) : null}
            <ViewControl label="Zoom −" onPress={() => m.zoomBy(-0.25)} />
            <ViewControl label="Zoom +" onPress={() => m.zoomBy(0.25)} />
            <ViewControl
              label="Reset"
              icon={<RotateCcw />}
              accessibilityLabel={m.mode === 'draw' ? 'Reset view and clear drawing' : 'Reset view'}
              onPress={() => {
                m.resetView();
                if (m.mode === 'draw') m.clearDrawing();
              }}
            />
          </View>
        </AnatomyCanvas>

        <View style={{ gap: 10 }}>
          <Txt size={12} color={colors.muted} lh={1.45}>
            {m.rotating ? 'Drag across the body to rotate. Tap Rotate again to mark.' : 'Drag to rotate in Rotate mode, or use buttons.'}
          </Txt>
          <View style={styles.row}>
            <PillButton label="Turn left" icon={ChevronLeft} paddingH={14} flex onPress={() => m.turnBy(-15)} />
            <PillButton label="Turn right" icon={ChevronRight} paddingH={14} flex onPress={() => m.turnBy(15)} />
          </View>
        </View>

        <Card radius={32}>
          <View style={{ gap: 14 }}>
            <View style={styles.between}>
              <Txt size={13} weight="semibold" lh={1.45}>
                Anatomy layers
              </Txt>
              <Txt size={12} color={colors.accent} lh={1.45}>
                {layerLabel(draft.layer)} selected
              </Txt>
            </View>
            <LayerSelector value={draft.layer} onChange={m.setLayer} />
          </View>
          <View style={{ gap: 10 }}>
            <Txt size={12} color={colors.muted} lh={1.45}>
              Mark or draw at the selected depth, including inside the body.
            </Txt>
            <View style={styles.row}>
              <PillButton label="Shallower" icon={Minus} paddingH={14} flex onPress={() => m.shiftLayer(-1)} />
              <PillButton label="Deeper" icon={Plus} paddingH={14} flex onPress={() => m.shiftLayer(1)} />
            </View>
          </View>
        </Card>
      </Section>

      <View style={{ gap: 12 }}>
        <PillButton
          label="Continue to symptom details"
          variant="primary"
          height={48}
          disabled={!hasMark}
          onPress={() => router.push('/survey')}
        />
        <StepDots step={1} />
      </View>
    </Screen>
  );
}

function ViewControl({
  label,
  icon,
  selected,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  icon?: ReactNode;
  selected?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={selected === undefined ? undefined : { selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.viewControl,
        selected && { backgroundColor: colors.accentSoftAlt },
        pressed && { opacity: 0.6 },
      ]}>
      {icon}
      <Txt size={13} weight="semibold" lh={1.45} numberOfLines={1}>
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  expand: {
    position: 'absolute',
    right: 12,
    top: 50,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  annotation: {
    position: 'absolute',
    right: 12,
    top: 134,
    width: 112,
    padding: 14,
    gap: 4,
    borderRadius: 20,
    backgroundColor: colors.white,
  },
  viewControls: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 2,
    padding: 6,
    borderRadius: 100,
    backgroundColor: colors.white,
  },
  viewControl: {
    minWidth: 72,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});

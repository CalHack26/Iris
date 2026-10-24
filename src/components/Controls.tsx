import type { FC, ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import Information from '@/assets/icons/information.svg';
import Microphone from '@/assets/icons/microphone.svg';
import Pencil12 from '@/assets/icons/pencil-12.svg';
import { colors, radii } from '@/theme/tokens';

import { Txt } from './Txt';

/** Pill segmented control. `dark` is the sensor range selector; `light` is the translation input mode. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  tone = 'dark',
  style,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
  tone?: 'dark' | 'light';
  style?: StyleProp<ViewStyle>;
}) {
  const dark = tone === 'dark';
  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.segmented,
        { backgroundColor: dark ? colors.surface : colors.accentSoft, gap: dark ? 4 : 2 },
        style,
      ]}>
      {options.map((o) => {
        const selected = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.key)}
            style={[
              styles.segment,
              selected && { backgroundColor: dark ? colors.ink : colors.surface },
            ]}>
            <Txt
              size={13}
              weight={selected || dark ? 'semibold' : 'regular'}
              color={selected ? (dark ? colors.white : colors.accent) : colors.muted}>
              {o.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/** "1 of 3" progress dots used by the guided mark-a-pain flow. */
export function StepDots({ step, total = 3 }: { step: number; total?: number }) {
  return (
    <View style={styles.dotsRow} accessibilityLabel={`Step ${step} of ${total}`}>
      <View style={styles.dots}>
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={[styles.dot, i + 1 === step && styles.dotActive]} />
        ))}
      </View>
      <Txt size={11} color={colors.muted}>
        {step} of {total}
      </Txt>
    </View>
  );
}

/** Grey note with a leading info icon. */
export function InfoNote({
  children,
  icon: Icon = Information,
  tone = 'field',
  size = 11,
  style,
}: {
  children: ReactNode;
  icon?: FC<SvgProps>;
  tone?: 'field' | 'sand';
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        styles.note,
        { backgroundColor: tone === 'sand' ? colors.sand : colors.field, borderRadius: tone === 'sand' ? 20 : 18 },
        style,
      ]}>
      <Icon />
      <Txt size={size} color={colors.muted} lh={tone === 'sand' ? 1.45 : 1.4} style={{ flex: 1 }}>
        {children}
      </Txt>
    </View>
  );
}

/** "Tap to edit" + "Voice recording" row that sits under editable symptom text. */
export function EntryControls({
  editLabel,
  onEdit,
  recording,
  onVoice,
  voiceIcon: VoiceIcon = Microphone,
  editIcon: EditIcon = Pencil12,
}: {
  editLabel: string;
  onEdit: () => void;
  recording: boolean;
  onVoice: () => void;
  voiceIcon?: FC<SvgProps>;
  editIcon?: FC<SvgProps>;
}) {
  return (
    <View style={styles.entryControls}>
      <Pressable onPress={onEdit} accessibilityRole="button" hitSlop={8} style={styles.editHint}>
        <EditIcon />
        <Txt size={11} weight="medium" color={colors.accent}>
          {editLabel}
        </Txt>
      </Pressable>
      <Pressable
        onPress={onVoice}
        accessibilityRole="button"
        accessibilityState={{ selected: recording }}
        style={[styles.voice, recording && { backgroundColor: colors.accentSoft }]}>
        <VoiceIcon />
        <Txt size={11} weight="medium" color={colors.accent}>
          {recording ? 'Listening… tap to stop' : 'Voice recording'}
        </Txt>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  segmented: { flexDirection: 'row', padding: 4, borderRadius: radii.pill },
  segment: { flex: 1, height: 36, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  dotsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 22 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.dotInactive },
  dotActive: { width: 18, backgroundColor: colors.accent },
  note: { flexDirection: 'row', gap: 8, padding: 12, alignItems: 'flex-start' },
  entryControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  editHint: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  voice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
  },
});

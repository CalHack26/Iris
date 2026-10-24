import { router } from 'expo-router';
import { useRef, useState, type FC } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  type TextInputInstance,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { Easing, FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SvgProps } from 'react-native-svg';

import Dismiss from '@/assets/icons/dismiss.svg';
import Mic14 from '@/assets/icons/mic-14.svg';
import Pencil12 from '@/assets/icons/pencil-12.svg';
import Mild from '@/assets/illustrations/faces/mild.svg';
import Moderate from '@/assets/illustrations/faces/moderate.svg';
import NoPain from '@/assets/illustrations/faces/no-pain.svg';
import Severe from '@/assets/illustrations/faces/severe.svg';
import Strong from '@/assets/illustrations/faces/strong.svg';
import Worst from '@/assets/illustrations/faces/worst.svg';
import Aching from '@/assets/illustrations/feel/aching.svg';
import Burning from '@/assets/illustrations/feel/burning.svg';
import Other from '@/assets/illustrations/feel/other.svg';
import Pressure from '@/assets/illustrations/feel/pressure.svg';
import Sharp from '@/assets/illustrations/feel/sharp.svg';
import Stiffness from '@/assets/illustrations/feel/stiffness.svg';
import Swelling from '@/assets/illustrations/feel/swelling.svg';
import Throbbing from '@/assets/illustrations/feel/throbbing.svg';
import Tingling from '@/assets/illustrations/feel/tingling.svg';
import { AnatomyCanvas } from '@/components/AnatomyCanvas';
import { EntryControls, InfoNote, StepDots } from '@/components/Controls';
import { LocationRecap } from '@/components/LocationRecap';
import { OptionTile } from '@/components/OptionTile';
import { PillButton } from '@/components/PillButton';
import { ScoreSlider } from '@/components/ScoreSlider';
import { Txt } from '@/components/Txt';
import { dateTime, FEELINGS, feelingLabel, layerLabel, severityLabel } from '@/lib/format';
import type { Feeling } from '@/lib/types';
import { useSomaStore } from '@/store/useSomaStore';
import { colors, fonts, radii, shadow } from '@/theme/tokens';

const FEELING_ART: Record<Feeling, FC<SvgProps>> = {
  aching: Aching,
  sharp: Sharp,
  burning: Burning,
  throbbing: Throbbing,
  tingling: Tingling,
  pressure: Pressure,
  stiffness: Stiffness,
  swelling: Swelling,
  other: Other,
};

const INTENSITIES: { label: string; range: string; hint: string; min: number; max: number; art: FC<SvgProps> }[] = [
  { label: 'No pain', range: '0 / 10', hint: 'At ease', min: 0, max: 0, art: NoPain },
  { label: 'Mild', range: '1–2 / 10', hint: 'Easy to ignore', min: 1, max: 2, art: Mild },
  { label: 'Moderate', range: '3–4 / 10', hint: 'Hard to ignore', min: 3, max: 4, art: Moderate },
  { label: 'Strong', range: '5–6 / 10', hint: 'Limits activity', min: 5, max: 6, art: Strong },
  { label: 'Severe', range: '7–8 / 10', hint: 'Hard to focus', min: 7, max: 8, art: Severe },
  { label: 'Worst', range: '9–10 / 10', hint: 'Overwhelming', min: 9, max: 10, art: Worst },
];

const DURATIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120];
const WHEN_OFFSETS_MIN = [0, 30, 60, 120, 240];
const TITLES = ['What does it feel like?', 'How strong is it?', 'Anything else to add?'];

const chunk = <T,>(xs: T[], n: number) =>
  Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

const durationLabel = (min: number) =>
  min < 60 ? `${min} minutes` : min % 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min / 60} hour${min > 60 ? 's' : ''}`;

export default function SymptomSurvey() {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const draft = useSomaStore((s) => s.draft);
  const updateDraft = useSomaStore((s) => s.updateDraft);
  const saveDraft = useSomaStore((s) => s.saveDraft);
  const [step, setStep] = useState(1);
  const [recording, setRecording] = useState(false);
  const [whenIndex, setWhenIndex] = useState(0);
  const startedAt = useRef(new Date(draft.at)).current;
  const noteInput = useRef<TextInputInstance>(null);

  const side = /^left/i.test(draft.location) ? 'left' : /^right/i.test(draft.location) ? 'right' : 'centre';
  const recapDetail =
    step < 3 || !draft.feeling || draft.severity === null
      ? `Patient ${side} ✓ · ${layerLabel(draft.layer)} selected`
      : `Patient ${side} · ${feelingLabel(draft.feeling)} · ${draft.severity} / 10 · ${severityLabel(draft.severity)}`;

  const canContinue = step === 1 ? draft.feeling !== null : step === 2 ? draft.severity !== null : true;
  const sheetHeight = Math.min(618, windowHeight - insets.top - 120);

  const next = () => {
    if (step < 3) return setStep(step + 1);
    const id = saveDraft();
    router.back();
    router.navigate({ pathname: '/record/[id]', params: { id } });
  };

  const cycleWhen = () => {
    const i = (whenIndex + 1) % WHEN_OFFSETS_MIN.length;
    setWhenIndex(i);
    updateDraft({ at: new Date(startedAt.getTime() - WHEN_OFFSETS_MIN[i] * 60_000).toISOString() });
  };
  const cycleDuration = () => {
    const i = DURATIONS.indexOf(draft.durationMin);
    updateDraft({ durationMin: DURATIONS[(i + 1) % DURATIONS.length] });
  };

  return (
    <View style={styles.screen}>
      {/* Marked anatomy context behind the sheet. */}
      <View style={[styles.context, { paddingTop: insets.top }]}>
        <View style={styles.contextHeader}>
          <Txt size={20} weight="semibold">
            Body map
          </Txt>
          <View style={styles.depthChip}>
            <Txt size={11} weight="semibold" color={colors.accent}>
              ✓ {layerLabel(draft.layer)}
            </Txt>
          </View>
        </View>
        <View style={{ paddingHorizontal: 20, paddingTop: 2 }}>
          <AnatomyCanvas
            height={320}
            background={colors.sand}
            mark={draft.mark}
            strokes={draft.strokes}
            demoArea={draft.demoArea}
          />
        </View>
      </View>
      <Animated.View entering={FadeIn.duration(200)} style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Close survey" onPress={() => router.back()} />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.sheetWrap, { paddingBottom: Math.max(insets.bottom, 18) }]}
        pointerEvents="box-none">
        <Animated.View
          entering={SlideInDown.duration(360).easing(Easing.bezier(0.22, 1, 0.36, 1))}
          style={[styles.sheet, shadow.sheet, { height: sheetHeight }]}>
          <View style={styles.heading}>
            <Txt size={20} weight="medium" style={{ flex: 1 }} accessibilityRole="header">
              {TITLES[step - 1]}
            </Txt>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()}>
              <Dismiss />
            </Pressable>
          </View>

          <LocationRecap title={draft.location || 'Marked area'} detail={recapDetail} />

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 10 }} keyboardShouldPersistTaps="handled">
            {step === 1 ? (
              <View style={{ gap: 8 }}>
                {chunk(FEELINGS, 3).map((row, i) => (
                  <View key={i} style={styles.row}>
                    {row.map((f) => (
                      <OptionTile
                        key={f.key}
                        icon={FEELING_ART[f.key]}
                        label={f.label}
                        lines={[f.hint]}
                        selected={draft.feeling === f.key}
                        onPress={() => updateDraft({ feeling: f.key })}
                        height={112}
                        gap={5}
                      />
                    ))}
                  </View>
                ))}
              </View>
            ) : null}

            {step === 2 ? (
              <>
                <View style={[styles.between, styles.severityHeader]}>
                  <Txt size={12} color={colors.muted}>
                    Pain intensity
                  </Txt>
                  <Txt size={14} weight="semibold" color={colors.accent}>
                    {draft.severity === null ? 'Choose a level' : `${draft.severity} / 10 · ${severityLabel(draft.severity)}`}
                  </Txt>
                </View>
                <View style={{ gap: 8 }}>
                  {chunk(INTENSITIES, 3).map((row, i) => (
                    <View key={i} style={styles.row}>
                      {row.map((it) => (
                        <OptionTile
                          key={it.label}
                          icon={it.art}
                          label={it.label}
                          lines={[it.range, it.hint]}
                          selected={draft.severity !== null && draft.severity >= it.min && draft.severity <= it.max}
                          onPress={() => updateDraft({ severity: it.max })}
                          height={118}
                          gap={3}
                        />
                      ))}
                    </View>
                  ))}
                </View>
                <View style={{ gap: 2 }}>
                  <View style={styles.between}>
                    <Txt size={11} color={colors.muted}>
                      Fine-tune your score
                    </Txt>
                    <Txt size={11} weight="semibold" color={colors.accent}>
                      {draft.severity ?? 0} out of 10
                    </Txt>
                  </View>
                  <ScoreSlider value={draft.severity ?? 0} onChange={(v) => updateDraft({ severity: v })} />
                  <View style={styles.between}>
                    <Txt size={10} color={colors.muted}>
                      No symptom
                    </Txt>
                    <Txt size={10} color={colors.muted}>
                      Worst imaginable
                    </Txt>
                  </View>
                </View>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <View style={styles.row}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityHint="Moves the time earlier"
                    onPress={cycleWhen}
                    style={[styles.infoTile, { flex: 195 }]}>
                    <View style={[styles.between, { alignItems: 'flex-start' }]}>
                      <Txt size={11} color={colors.muted}>
                        When
                      </Txt>
                      <Pencil12 />
                    </View>
                    <Txt size={12} weight="medium">
                      {dateTime(new Date(draft.at))}
                    </Txt>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityHint="Changes the duration"
                    onPress={cycleDuration}
                    style={[styles.infoTile, { flex: 126 }]}>
                    <Txt size={11} color={colors.muted}>
                      Duration
                    </Txt>
                    <Txt size={12} weight="medium">
                      {durationLabel(draft.durationMin)}
                    </Txt>
                  </Pressable>
                </View>
                <View style={{ gap: 8 }}>
                  <View style={{ height: 44, justifyContent: 'center' }}>
                    <Txt size={13} weight="semibold">
                      In your own words
                    </Txt>
                  </View>
                  <View style={styles.note}>
                    <TextInput
                      ref={noteInput}
                      value={draft.note}
                      onChangeText={(note) => updateDraft({ note })}
                      multiline
                      placeholder="A dull ache at the front of my left shoulder after desk work. Worse when I raise my arm. No numbness or tingling."
                      placeholderTextColor={colors.muted}
                      style={styles.noteInput}
                      accessibilityLabel="Describe it in your own words"
                    />
                    <EntryControls
                      editLabel="Tap to type or edit"
                      onEdit={() => noteInput.current?.focus()}
                      recording={recording}
                      onVoice={() => setRecording((r) => !r)}
                      voiceIcon={Mic14}
                    />
                  </View>
                  <Txt size={11} color={colors.muted} lh={1.45}>
                    {recording
                      ? 'Voice transcription isn’t connected yet — please type for now.'
                      : 'Review words before saving.'}
                  </Txt>
                </View>
                <InfoNote>Your mark describes where you feel it, not a confirmed structure or diagnosis.</InfoNote>
              </>
            ) : null}
          </ScrollView>

          <View style={{ gap: 12 }}>
            <View style={styles.row}>
              {step > 1 ? (
                <PillButton label="Back" variant="field" height={48} style={{ width: 88 }} onPress={() => setStep(step - 1)} />
              ) : null}
              <PillButton
                label={step === 3 ? 'Save symptom' : 'Continue'}
                variant="primary"
                height={48}
                flex
                disabled={!canContinue}
                onPress={next}
              />
            </View>
            <StepDots step={step} />
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  context: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.background },
  contextHeader: {
    height: 64,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  depthChip: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
    justifyContent: 'center',
  },
  sheetWrap: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 12 },
  sheet: {
    backgroundColor: colors.white,
    borderRadius: radii.sheet,
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
    gap: 12,
  },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 44 },
  row: { flexDirection: 'row', gap: 8 },
  severityHeader: { height: 24 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  infoTile: { backgroundColor: colors.field, borderRadius: 18, padding: 12, gap: 6, height: 68 },
  note: { backgroundColor: colors.field, borderRadius: radii.field, padding: 16, gap: 12 },
  noteInput: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
    minHeight: 60,
    padding: 0,
    textAlignVertical: 'top',
  },
});

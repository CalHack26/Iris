import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputInstance } from 'react-native';

import Back from '@/assets/icons/back.svg';
import Information from '@/assets/icons/information.svg';
import { Card } from '@/components/Card';
import { EntryControls } from '@/components/Controls';
import { PageIntro } from '@/components/PageIntro';
import { PillButton } from '@/components/PillButton';
import { Screen, Section } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { EXTRA_TAGS, QUICK_TAGS } from '@/data/seed';
import { symptomFeedback } from '@/lib/feedback';
import { dateTime } from '@/lib/format';
import { useSomaStore } from '@/store/useSomaStore';
import { colors, fonts, radii } from '@/theme/tokens';

export default function RecordSymptom() {
  const addTextRecord = useSomaStore((s) => s.addTextRecord);
  const [text, setText] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagOptions, setTagOptions] = useState(QUICK_TAGS);
  const [showMore, setShowMore] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceHint, setVoiceHint] = useState(false);
  const input = useRef<TextInputInstance>(null);

  const feedback = symptomFeedback(text, tags);
  const canSave = text.trim().length > 0 || tags.length > 0;

  const toggleTag = (tag: string) =>
    setTags((s) => (s.includes(tag) ? s.filter((t) => t !== tag) : [...s, tag]));

  const addTag = (tag: string) => {
    setTagOptions((s) => (s.includes(tag) ? s : [...s, tag]));
    setTags((s) => (s.includes(tag) ? s : [...s, tag]));
    setShowMore(false);
  };

  const onVoice = () => {
    // Speech-to-text isn't wired up yet; the button shows the listening state and then asks the user to type.
    if (recording) setVoiceHint(true);
    setRecording((r) => !r);
  };

  const save = () => {
    const id = addTextRecord({ note: text.trim(), tags });
    setText('');
    setTags([]);
    router.navigate({ pathname: '/record/[id]', params: { id } });
  };

  return (
    <Screen>
      <Section index={1}>
        <PageIntro
          title="Record a symptom"
          titleSize={30}
          before={
            <Pressable
              accessibilityRole="link"
              onPress={() => router.navigate('/')}
              style={styles.back}
              hitSlop={8}>
              <Back />
              <Txt size={12} weight="semibold" color={colors.accent}>
                Overview
              </Txt>
            </Pressable>
          }>
          <Txt size={12} color={colors.muted} lh={1.45}>
            {dateTime(new Date())}
          </Txt>
        </PageIntro>
      </Section>

      <Section index={2}>
        <Card gap={12}>
          <Txt size={15} weight="semibold" lh={1.45}>
            Speak or type
          </Txt>
          <View style={styles.entry}>
            <TextInput
              ref={input}
              value={text}
              onChangeText={setText}
              multiline
              placeholder="I’ve had a dull headache since this morning. It comes and goes, and feels worse after looking at my screen."
              placeholderTextColor={colors.muted}
              style={styles.input}
              accessibilityLabel="Describe your symptom"
            />
            <EntryControls
              editLabel="Tap to edit"
              onEdit={() => input.current?.focus()}
              recording={recording}
              onVoice={onVoice}
            />
          </View>
          <Txt size={11} color={colors.muted} lh={1.45}>
            {voiceHint
              ? 'Voice transcription isn’t connected yet — please type for now.'
              : 'Type or record, then review before saving.'}
          </Txt>
          <View style={{ gap: 8 }}>
            <View style={styles.between}>
              <Txt size={13} weight="semibold" lh={1.45}>
                Quick tags
              </Txt>
              <Txt size={11} color={colors.muted}>
                Optional · select any
              </Txt>
            </View>
            <View style={styles.tags}>
              {tagOptions.map((tag) => (
                <Tag key={tag} label={tag} selected={tags.includes(tag)} onPress={() => toggleTag(tag)} />
              ))}
            </View>
            {showMore ? (
              <View style={styles.tags}>
                {EXTRA_TAGS.filter((t) => !tagOptions.includes(t)).map((tag) => (
                  <Tag key={tag} label={`+ ${tag}`} selected={false} onPress={() => addTag(tag)} />
                ))}
              </View>
            ) : (
              <Tag label="Add common tag" selected={false} onPress={() => setShowMore(true)} />
            )}
          </View>
        </Card>

        <Card tone="sage" gap={12}>
          <View style={styles.heading}>
            <Information />
            <Txt size={15} weight="semibold" lh={1.45}>
              Feedback & suggestions
            </Txt>
          </View>
          <Txt size={13} lh={1.45}>
            {feedback.message}
          </Txt>
          {feedback.suggestion ? (
            <Txt size={11} color={colors.muted} lh={1.45}>
              {feedback.suggestion}
            </Txt>
          ) : null}
        </Card>

        <PillButton label="Save symptom" variant="primary" height={48} disabled={!canSave} onPress={save} />
      </Section>
    </Screen>
  );
}

function Tag({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.tag, { backgroundColor: selected ? colors.accentSoft : colors.field }]}>
      <Txt size={12} weight={selected ? 'semibold' : 'medium'} color={selected ? colors.accent : colors.ink}>
        {selected ? `✓  ${label}` : label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 24, alignSelf: 'flex-start' },
  entry: { backgroundColor: colors.field, borderRadius: radii.field, padding: 16, gap: 20 },
  input: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
    minHeight: 60,
    padding: 0,
    textAlignVertical: 'top',
  },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});

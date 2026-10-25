import * as Clipboard from 'expo-clipboard';
import * as Speech from 'expo-speech';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, type TextInputInstance, View } from 'react-native';

import ArrowDownWhite from '@/assets/icons/arrow-down-white.svg';
import ChevronDown from '@/assets/icons/chevron-down.svg';
import Copy from '@/assets/icons/copy.svg';
import Info16 from '@/assets/icons/info-16.svg';
import Mic17 from '@/assets/icons/mic-17.svg';
import Volume from '@/assets/icons/volume.svg';
import { Card, Divider } from '@/components/Card';
import { InfoNote, SegmentedControl } from '@/components/Controls';
import { PageIntro } from '@/components/PageIntro';
import { PillButton } from '@/components/PillButton';
import { Screen, Section } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { TRANSLATION_EXAMPLE } from '@/data/seed';
import { LANGUAGES, SPEECH_CODE, translateSymptom, translateToEnglish, type Language } from '@/lib/translate';
import { colors, fonts, radii } from '@/theme/tokens';

export default function SymptomTranslation() {
  const [source, setSource] = useState<Language>('French');
  const [mode, setMode] = useState<'voice' | 'type'>('type');
  const [text, setText] = useState(TRANSLATION_EXAMPLE.source);
  const [result, setResult] = useState(() => translateSymptom(TRANSLATION_EXAMPLE.source, 'French'));
  const [copied, setCopied] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translationError, setTranslationError] = useState('');
  const input = useRef<TextInputInstance>(null);

  const nextLanguage = () => {
    setSource(LANGUAGES[(LANGUAGES.indexOf(source) + 1) % LANGUAGES.length]);
    setResult({ english: '', keywords: [], connected: false });
    setTranslationError('');
  };
  const speak = (words: string) => {
    Speech.stop();
    Speech.speak(words, { language: SPEECH_CODE.English });
  };

  return (
    <Screen activeTopBarItem="translate">
      <Section index={1}>
        <PageIntro title="Plain words to medical terms" subtitle="Preserve best how you feel, but better understood by doctors." gap={16} />
      </Section>

      <Section index={2} gap={20}>
        <Card tone="sky">
          <View style={styles.between}>
            <Txt size={20} weight="medium">
              Your words
            </Txt>
            <LanguagePill label={source} onPress={nextLanguage} />
          </View>
          <View style={styles.row}>
            <SegmentedControl
              tone="light"
              style={{ flex: 1 }}
              value={mode}
              onChange={setMode}
              options={[
                { key: 'voice', label: 'Voice' },
                { key: 'type', label: 'Type' },
              ]}
            />
            <PillButton
              label="Dictate"
              icon={Mic17}
              height={44}
              paddingH={16}
              onPress={() => {
                setMode('voice');
                input.current?.focus();
              }}
            />
          </View>
          <View style={styles.entry}>
            <Txt size={12} weight="medium" color={colors.muted}>
              In your own words
            </Txt>
            {mode === 'voice' ? (
              <Txt size={11} color={colors.muted} lh={1.45}>
                Set your keyboard’s dictation language to {source}, then tap its microphone. Your keyboard handles
                dictation and may use its own speech service; this app does not record audio.
              </Txt>
            ) : null}
            <TextInput
              ref={input}
              value={text}
              onChangeText={(value) => {
                setText(value);
                setResult({ english: '', keywords: [], connected: false });
                setTranslationError('');
              }}
              multiline
              placeholder="Describe how you feel, in any language."
              placeholderTextColor={colors.muted}
              style={styles.input}
              accessibilityLabel="Your words"
            />
          </View>
          <View style={styles.row}>
            <PillButton
              label="Clear"
              height={44}
              paddingH={16}
              flex
              onPress={() => {
                setText('');
                setTranslationError('');
              }}
            />
            <PillButton
              label={translating ? 'Translating…' : 'Translate'}
              icon={ArrowDownWhite}
              variant="primary"
              height={44}
              paddingH={16}
              flex
              disabled={!text.trim() || translating}
              onPress={async () => {
                setTranslating(true);
                setTranslationError('');
                setResult({ english: '', keywords: [], connected: false });
                try {
                  const english = await translateToEnglish(text, source);
                  setResult(translateSymptom(english, 'English'));
                  setCopied(false);
                } catch (error) {
                  setTranslationError(error instanceof Error ? error.message : String(error));
                } finally {
                  setTranslating(false);
                }
              }}
            />
          </View>
          {translationError ? (
            <Txt size={12} color={colors.marker} lh={1.45} accessibilityRole="alert">
              {translationError}
            </Txt>
          ) : null}
          {source !== 'English' ? (
            <InfoNote icon={Info16} tone="sand" size={11}>
              Translation sends text to MyMemory’s online service, which may log requests. Avoid names or identifying details.
              Free anonymous limit: 5,000 characters per day.
            </InfoNote>
          ) : null}
        </Card>

        <Card>
          <View style={styles.between}>
            <Txt size={20} weight="medium">
              Translation
            </Txt>
            <LanguagePill label="English" />
          </View>
          <View style={{ gap: 10 }}>
            <Txt size={12} weight="semibold" color={colors.accent}>
              Your words in English
            </Txt>
            <Txt size={15} lh={1.5}>
              {result.english || '—'}
            </Txt>
            <View style={styles.actions}>
              <PillButton
                label={copied ? 'Copied' : 'Copy'}
                icon={Copy}
                variant="field"
                height={44}
                paddingH={16}
                onPress={async () => {
                  await Clipboard.setStringAsync(result.english);
                  setCopied(true);
                }}
              />
              <PillButton label="Listen" icon={Volume} variant="field" height={44} paddingH={16} onPress={() => speak(result.english)} />
            </View>
          </View>
          <Divider />
          <View style={{ gap: 12 }}>
            <View style={styles.between}>
              <View style={{ flex: 1, gap: 5 }}>
                <Txt size={16} weight="medium">
                  Clinical keywords
                </Txt>
                <Txt size={12} color={colors.muted} lh={1.45}>
                  AI-assisted draft · Not a diagnosis
                </Txt>
              </View>
              <PillButton
                label="Listen"
                icon={Volume}
                variant="field"
                height={44}
                paddingH={16}
                disabled={!result.keywords.length}
                onPress={() => speak(result.keywords.join('. '))}
              />
            </View>
            <View style={{ gap: 6 }}>
              {result.keywords.map((k) => (
                <View key={k} style={styles.keyword}>
                  <Txt size={13} lh={1.4}>
                    {k}
                  </Txt>
                </View>
              ))}
              {!result.keywords.length ? (
                <Txt size={13} color={colors.muted} lh={1.4}>
                  No clinical keywords found yet.
                </Txt>
              ) : null}
            </View>
          </View>
          <InfoNote icon={Info16} tone="sand" size={12}>
            Review before sharing. Save only wording that matches how you feel.
          </InfoNote>
        </Card>
      </Section>
    </Screen>
  );
}

function LanguagePill({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Language: ${label}${onPress ? '. Tap to change.' : ''}`}
      disabled={!onPress}
      onPress={onPress}
      style={styles.language}>
      <Txt size={14} weight="semibold">
        {label}
      </Txt>
      <ChevronDown />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actions: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  language: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  entry: { backgroundColor: colors.surface, borderRadius: radii.field, padding: 16, gap: 10, minHeight: 190 },
  input: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 23, color: colors.ink, padding: 0, textAlignVertical: 'top' },
  keyword: { backgroundColor: colors.sage, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
});

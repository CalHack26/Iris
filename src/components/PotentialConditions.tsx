import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/Txt';
import { findPotentialConditions, type PotentialCondition } from '@/lib/monarch';
import type { SymptomRecord } from '@/lib/types';
import { colors, radii } from '@/theme/tokens';

export function PotentialConditions({ records }: { records: SymptomRecord[] }) {
  const [results, setResults] = useState<PotentialCondition[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [error, setError] = useState('');

  const search = async () => {
    setStatus('loading');
    setError('');
    try {
      setResults(await findPotentialConditions(records));
      setStatus('loaded');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  };

  return (
    <View style={styles.container}>
      <Txt size={17} weight="semibold" lh={1.4}>
        Potential disease matches
      </Txt>
      <Txt size={12} color={colors.muted} lh={1.45}>
        Optional Monarch Knowledge Graph lookup. On request, up to three generalized body-location terms are sent to
        Monarch’s public API; notes and personal details are not sent.
      </Txt>
      <Pressable
        accessibilityRole="button"
        disabled={status === 'loading'}
        onPress={search}
        style={({ pressed }) => [styles.button, (pressed || status === 'loading') && { opacity: 0.6 }]}>
        <Txt size={13} weight="semibold" color={colors.accent}>
          {status === 'loading' ? 'Searching…' : status === 'loaded' ? 'Refresh matches' : 'Find potential matches'}
        </Txt>
      </Pressable>
      {status === 'error' ? (
        <Txt size={12} color={colors.muted} lh={1.45}>
          Could not load Monarch matches: {error}
        </Txt>
      ) : null}
      {status === 'loaded' ? (
        results.length ? (
          <View style={{ gap: 8 }}>
            {results.map((condition) => (
              <View key={condition.id} style={styles.result}>
                <Txt size={14} weight="medium" lh={1.4}>
                  {condition.name}
                </Txt>
                <Txt size={11} color={colors.muted} lh={1.4}>
                  {condition.id} · linked to {condition.matchedSymptoms} searched symptom location
                  {condition.matchedSymptoms === 1 ? '' : 's'}
                </Txt>
              </View>
            ))}
          </View>
        ) : (
          <Txt size={12} color={colors.muted} lh={1.45}>
            No disease associations were found for the supported body locations in these records.
          </Txt>
        )
      ) : null}
      <Txt size={11} color={colors.muted} lh={1.45}>
        These are knowledge-graph associations, not a diagnosis, probability, or measure of personal risk. A match may
        be unrelated to your symptoms.
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.accentSoft, borderRadius: radii.field, padding: 16, gap: 10 },
  button: { alignSelf: 'flex-start', backgroundColor: colors.white, borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 10 },
  result: { backgroundColor: colors.white, borderRadius: 12, padding: 12, gap: 4 },
});

import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import Maximize from '@/assets/icons/maximize.svg';
import Pencil from '@/assets/icons/pencil.svg';
import { AnatomyCanvas } from '@/components/AnatomyCanvas';
import { Badge } from '@/components/Badge';
import { Card, Divider } from '@/components/Card';
import { Attribute } from '@/components/Metric';
import { PageIntro } from '@/components/PageIntro';
import { PillButton } from '@/components/PillButton';
import { Screen, Section } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { date, dateTimeComma, feelingLabel, layerLabel, severityLabel, shortDateTime, sideLabel, time } from '@/lib/format';
import { useSomaStore } from '@/store/useSomaStore';
import { colors, shadow } from '@/theme/tokens';

export default function SavedRecord() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const record = useSomaStore((s) => s.records.find((r) => r.id === id));
  const editRecord = useSomaStore((s) => s.editRecord);

  if (!record) {
    return (
      <Screen>
        <PageIntro title="Record not found" subtitle="It may have been removed." />
        <PillButton label="Back to history" variant="outline" height={48} onPress={() => router.navigate('/history')} />
      </Screen>
    );
  }

  const at = new Date(record.at);
  const marked = Boolean(record.location);

  const edit = () => {
    if (!marked) return router.navigate('/record-symptom');
    editRecord(record.id);
    router.navigate('/body-map');
  };

  return (
    <Screen>
      <Section index={1}>
        <PageIntro
          eyebrow={`RECORDS / ${date(at).toUpperCase()} · ${time(at)}`}
          title="Saved Record"
          subtitle="View | Edit | Share"
          subtitleSize={15}
        />
      </Section>

      <Section index={2}>
        <PillButton
          label="Edit record"
          icon={Pencil}
          variant="outline"
          height={48}
          paddingH={20}
          style={styles.start}
          onPress={edit}
        />
      </Section>

      <Section index={3}>
        {marked ? (
          <AnatomyCanvas
            height={280}
            image="saved"
            radius={28}
            labels={{ top: 132, rLeft: 56, lRight: 40 }}
            mark={record.mark}
            strokes={record.strokes}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/body-map-fullscreen', params: { recordId: record.id } })}
              style={[styles.fullScreen, shadow.floating]}>
              <Maximize />
              <Txt size={13} weight="semibold" lh={1.45}>
                Full screen
              </Txt>
            </Pressable>
          </AnatomyCanvas>
        ) : null}

        <Card>
          <View style={styles.state}>
            <Badge tone="sage">✓ Saved</Badge>
            <Txt size={12} color={colors.muted} lh={1.45}>
              {shortDateTime(at)}
            </Txt>
          </View>
          <Txt size={22} weight="medium" lh={1.45}>
            {marked ? record.location : 'Symptom note'}
          </Txt>
          <Divider />
          {marked ? (
            <>
              <Attribute label="Anatomical side" value={sideLabel(record.location)} />
              <Attribute label="Marked depth" value={layerLabel(record.layer)} />
              <Txt size={13} color={colors.muted} lh={1.45}>
                Position and depth selected by the patient. No specific tissue is confirmed.
              </Txt>
            </>
          ) : (
            <>
              <Attribute label="In your words" value={record.note || '—'} />
              {record.tags.length ? <Attribute label="Tags" value={record.tags.join(', ')} /> : null}
            </>
          )}
        </Card>

        {marked ? (
          <Card gap={12}>
            <Attribute label="Symptom" value={`${feelingLabel(record.feeling)} pain`} />
            <Attribute label="Severity" value={`${record.severity} / 10 · ${severityLabel(record.severity)}`} />
            <Attribute label="Duration" value={`${record.durationMin} minutes`} />
            <Attribute label="Recorded" value={dateTimeComma(at)} />
            {record.note ? <Attribute label="In your words" value={record.note} /> : null}
          </Card>
        ) : null}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  start: { alignSelf: 'flex-start' },
  state: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  fullScreen: {
    position: 'absolute',
    right: 12,
    top: 50,
    height: 40,
    width: 116,
    borderRadius: 100,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});

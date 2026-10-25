import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import DownloadWhite from '@/assets/icons/download-white.svg';
import FileCheck from '@/assets/icons/file-check.svg';
import Info17 from '@/assets/icons/info-17.svg';
import { Card, Divider } from '@/components/Card';
import { Metric } from '@/components/Metric';
import { PageIntro } from '@/components/PageIntro';
import { PillButton } from '@/components/PillButton';
import { PotentialConditions } from '@/components/PotentialConditions';
import { Screen, Section } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { buildReport, reportHtml } from '@/lib/report';
import { useMarkedRecords } from '@/store/useSomaStore';
import { colors, radii } from '@/theme/tokens';

/** Tile width encodes duration in steps, as in the design (20 min = 88pt … 45 min = 184pt). */
const tileWidth = (min: number) => (min <= 20 ? 88 : min <= 30 ? 104 : min <= 35 ? 136 : min <= 40 ? 160 : 184);

export default function ClinicianReport() {
  const records = useMarkedRecords();
  const report = useMemo(() => buildReport(records), [records]);
  const [busy, setBusy] = useState(false);

  const share = async () => {
    setBusy(true);
    try {
      const { uri } = await Print.printToFileAsync({ html: reportHtml(report) });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Share report' });
      } else {
        Alert.alert('Report saved', uri);
      }
    } catch (e) {
      Alert.alert('Couldn’t create the PDF', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Section index={1}>
        <PageIntro eyebrow="LATEST CLINICIAN REPORT" title="Concise report backed by data" titleSize={34} subtitle="Share with your doctor">
          <PillButton
            label={busy ? 'Preparing…' : 'Export PDF'}
            icon={DownloadWhite}
            variant="primary"
            height={48}
            paddingH={16}
            disabled={busy || !report.count}
            style={styles.start}
            onPress={share}
          />
        </PageIntro>
      </Section>

      <Section index={2}>
        <Card>
          <View style={{ gap: 6 }}>
            <Txt size={20} lh={1.45}>
              soma
            </Txt>
            <Txt size={28} weight="medium" lh={1.2}>
              Symptom history summary
            </Txt>
            <Txt size={13} color={colors.muted} lh={1.45}>
              {report.subtitle}
            </Txt>
          </View>
          <Divider />
          {report.count ? (
            <>
              <View style={{ gap: 12 }}>
                {report.metrics.map((m) => (
                  <View key={m.label} style={styles.tile}>
                    <Metric label={m.label} value={m.value} caption={m.caption} valueSize={32} />
                  </View>
                ))}
              </View>

              <View style={{ gap: 12 }}>
                <View style={{ gap: 10 }}>
                  <Txt size={18} weight="semibold" lh={1.45}>
                    Patient-reported symptoms
                  </Txt>
                  <Txt size={11} color={colors.muted} lh={1.45}>
                    Source: {report.count} saved records
                  </Txt>
                </View>
                {report.facts.map((f) => (
                  <View key={f.label} style={[styles.tile, { gap: 6 }]}>
                    <Txt size={12} color={colors.muted} lh={1.45}>
                      {f.label}
                    </Txt>
                    <Txt size={14} lh={1.45}>
                      {f.text}
                    </Txt>
                  </View>
                ))}
              </View>

              <View style={{ gap: 10 }}>
                <Txt size={13} weight="semibold" lh={1.45}>
                  Recent recorded history · {report.month}
                </Txt>
                <View style={styles.history}>
                  {report.history.map((h) => (
                    <View key={h.id} style={[styles.historyTile, { width: tileWidth(h.durationMin) }]}>
                      <Txt size={12} weight="semibold" lh={1.45}>
                        {h.day}
                      </Txt>
                      <Txt size={15} weight="medium" lh={1.45}>
                        {h.severity}
                      </Txt>
                      <Txt size={12} color={colors.muted} lh={1.45}>
                        {h.duration}
                      </Txt>
                    </View>
                  ))}
                </View>
              </View>

              <Card tone="sky" padding={16} radius={radii.field} gap={10}>
                <Txt size={16} weight="semibold" lh={1.45}>
                  Summary
                </Txt>
                <Txt size={14} lh={1.45}>
                  {report.summary}
                </Txt>
              </Card>
              <PotentialConditions records={records} />
            </>
          ) : (
            <Txt size={14} color={colors.muted} lh={1.45}>
              No marked symptoms yet. Mark a pain on the body map to build your report.
            </Txt>
          )}

          <View style={styles.limitations}>
            <Info17 />
            <Txt size={12} color={colors.muted} lh={1.45} style={{ flex: 1 }}>
              Not a diagnosis or medical assessment. Self-reported logs are incomplete and unverified. No examination or medical
              test results are included. Optional Monarch matches are knowledge-graph associations, not predictions.
            </Txt>
          </View>
        </Card>
      </Section>

      <Section index={3}>
        <Card tone="sand" gap={14}>
          <FileCheck />
          <Txt size={24} weight="medium" lh={1.45}>
            Long-term health record for your doctor
          </Txt>
          <Txt size={14} color={colors.muted} lh={1.45}>
            Bring your observations to a clinician. They can interpret your history alongside an examination and any
            appropriate tests.
          </Txt>
          <Pressable
            accessibilityRole="button"
            disabled={busy || !report.count}
            onPress={share}
            style={({ pressed }) => [styles.send, pressed && { opacity: 0.6 }]}>
            <Txt size={12} weight="semibold" lh={1.45}>
              Send to clinician
            </Txt>
          </Pressable>
        </Card>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  start: { alignSelf: 'flex-start' },
  tile: { backgroundColor: colors.field, borderRadius: radii.field, padding: 16 },
  history: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  historyTile: { backgroundColor: colors.field, borderRadius: 16, padding: 12, gap: 5 },
  limitations: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  send: {
    alignSelf: 'flex-start',
    backgroundColor: colors.field,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
});

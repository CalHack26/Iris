import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import ArrowRight from '@/assets/icons/arrow-right.svg';
import ArrowUpRight from '@/assets/icons/arrow-up-right.svg';
import FileText from '@/assets/icons/file-text.svg';
import Layers from '@/assets/icons/layers.svg';
import LockKeyhole from '@/assets/icons/lock-keyhole.svg';
import MoveUpRight from '@/assets/icons/move-up-right.svg';
import PlusAccent from '@/assets/icons/plus-accent.svg';
import PlusWhite from '@/assets/icons/plus-white.svg';
import { Badge } from '@/components/Badge';
import { Card, Divider } from '@/components/Card';
import { LineChart } from '@/components/LineChart';
import { Metric } from '@/components/Metric';
import { PageIntro } from '@/components/PageIntro';
import { PillButton } from '@/components/PillButton';
import { Screen, Section } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { dateRange, dayMonth, feelingLabel, longDate, shortDateTime, shortLocation } from '@/lib/format';
import { fmtAvg, range, regionName, severityTrend } from '@/lib/insights';
import { useMarkedRecords, useSomaStore } from '@/store/useSomaStore';
import { colors } from '@/theme/tokens';

const pad2 = (n: number) => String(n).padStart(2, '0');

export default function Overview() {
  const records = useMarkedRecords();
  const discardEdit = useSomaStore((s) => s.discardEdit);
  const latest = records[0];
  const trend = severityTrend(records.slice(0, 6));
  const severities = trend.chrono.map((r) => r.severity);
  const [lo, hi] = range(severities);
  const locations = new Set(records.map((r) => r.location));
  const first = records.at(-1);

  return (
    <Screen>
      <Section index={1}>
        <PageIntro eyebrow={longDate(new Date())} title="We’re here for your health" titleSize={34} subtitle="Record, track, share" subtitleSize={15} gap={16}>
          <View style={styles.actions}>
            <PillButton
              label="Mark a pain"
              icon={PlusWhite}
              variant="primary"
              height={48}
              paddingH={18}
              onPress={() => {
                discardEdit();
                router.navigate('/body-map');
              }}
            />
            <PillButton
              label="Record a symptom"
              icon={PlusAccent}
              variant="accent"
              height={48}
              paddingH={18}
              onPress={() => router.navigate('/record-symptom')}
            />
          </View>
        </PageIntro>
      </Section>

      <Section index={2}>
        {latest ? (
          <Card>
            <Txt size={13} weight="semibold" lh={1.45}>
              LATEST CHECK-IN
            </Txt>
            <View style={styles.severityRow}>
              <Metric label="Patient-reported severity" value={`${latest.severity} / 10`} style={{ flex: 1 }} />
              <Badge tone="blush">{feelingLabel(latest.feeling)}</Badge>
            </View>
            <Divider />
            <View style={{ gap: 4 }}>
              <Txt size={15} weight="semibold" lh={1.45}>
                {latest.location}
              </Txt>
              <Txt size={13} color={colors.muted} lh={1.45}>
                {shortDateTime(new Date(latest.at))} · {latest.durationMin} minutes
              </Txt>
            </View>
            <PillButton
              label="View saved record"
              icon={ArrowUpRight}
              style={styles.start}
              onPress={() => router.navigate({ pathname: '/record/[id]', params: { id: latest.id } })}
            />
          </Card>
        ) : (
          <Card>
            <Txt size={13} weight="semibold" lh={1.45}>
              LATEST CHECK-IN
            </Txt>
            <Txt size={13} color={colors.muted} lh={1.45}>
              No check-ins yet. Mark a pain on the body map to start your record.
            </Txt>
          </Card>
        )}

        {latest && severities.length >= 2 ? (
          <Card tone="sage">
            <View style={styles.between}>
              <Txt size={15} weight="semibold" lh={1.45}>
                Recent trends
              </Txt>
              <MoveUpRight />
            </View>
            <Txt size={24} weight="medium" lh={1.45}>
              {trend.direction === 'steady'
                ? `${regionName(latest.location)} severity is holding steady.`
                : `${regionName(latest.location)} severity is trending ${trend.direction}.`}
            </Txt>
            <LineChart values={severities} min={lo} max={hi === lo ? lo + 1 : hi} height={67} insetY={[1, 1]} />
            <Txt size={13} color={colors.muted} lh={1.45}>
              Average {fmtAvg(trend.before)} → {fmtAvg(trend.after)} / 10 across two groups of {trend.half} logs,{' '}
              {dateRange(new Date(trend.chrono[0].at), new Date(trend.chrono.at(-1)!.at)).replace(/ \d{4}$/, '')}.
              Few entries; this may reflect when you chose to log.
            </Txt>
            <PillButton
              label="Explore the trend"
              icon={ArrowRight}
              style={styles.start}
              onPress={() => router.navigate('/history')}
            />
          </Card>
        ) : null}

        <Card gap={18}>
          <View style={styles.between}>
            <Txt size={15} weight="semibold" lh={1.45}>
              Records
            </Txt>
            <Layers />
          </View>
          <View style={styles.metrics}>
            <Metric
              label="Saved records"
              value={pad2(records.length)}
              caption={first && latest ? dateRange(new Date(first.at), new Date(latest.at)) : '—'}
              style={{ flex: 1 }}
            />
            <Metric
              label="Marked locations"
              value={pad2(locations.size)}
              caption={
                locations.size === 1 && latest
                  ? shortLocation(latest.location)
                  : latest
                    ? `Latest: ${dayMonth(new Date(latest.at))}`
                    : '—'
              }
              style={{ flex: 1 }}
            />
          </View>
        </Card>

        <Card tone="sand" gap={14}>
          <FileText />
          <Txt size={20} weight="medium" lh={1.45}>
            Bring record to your doctor
          </Txt>
          <Txt size={13} color={colors.muted} lh={1.45}>
            A concise summary of what you reported | trends supported by data | no diagnosis
          </Txt>
          <PillButton
            label="View report"
            icon={ArrowUpRight}
            style={styles.start}
            onPress={() => router.navigate('/report')}
          />
        </Card>
      </Section>

      <View style={styles.privacy}>
        <LockKeyhole />
        <Txt size={12} color={colors.muted} lh={1.45} style={{ flex: 1 }}>
          Your body. Your story. Your choice to share.
        </Txt>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 12 },
  severityRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metrics: { flexDirection: 'row', gap: 24 },
  start: { alignSelf: 'flex-start' },
  privacy: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});

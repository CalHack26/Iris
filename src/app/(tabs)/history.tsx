import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import ArrowUpRight16 from '@/assets/icons/arrow-up-right-16.svg';
import BellDot from '@/assets/icons/bell-dot.svg';
import CalendarDays from '@/assets/icons/calendar-days.svg';
import CalendarWhite from '@/assets/icons/calendar-white.svg';
import ChevronDown17 from '@/assets/icons/chevron-down-17.svg';
import { Badge } from '@/components/Badge';
import { Card, Divider } from '@/components/Card';
import { LineChart } from '@/components/LineChart';
import { PageIntro } from '@/components/PageIntro';
import { PillButton } from '@/components/PillButton';
import { Screen, Section } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { average, date, dateRange, dayMonth, feelingLabel, layerLabel, shortLocation, time } from '@/lib/format';
import { fmtAvg, range, sampleLabels, severityTrend } from '@/lib/insights';
import { APPOINTMENT_URL } from '@/lib/links';
import type { SymptomRecord } from '@/lib/types';
import { useSomaStore } from '@/store/useSomaStore';
import { colors, radii } from '@/theme/tokens';

const FILTERS = ['All records', 'Marked pain', 'Notes'] as const;
type Filter = (typeof FILTERS)[number];

/** Opens the hospital's booking page in an in-app browser; booking itself isn't built yet. */
async function bookAppointment() {
  try {
    await WebBrowser.openBrowserAsync(APPOINTMENT_URL, { controlsColor: colors.accent, dismissButtonStyle: 'done' });
  } catch (e) {
    Alert.alert('Couldn’t open the booking site', e instanceof Error ? e.message : String(e));
  }
}

export default function RecentTrends() {
  const records = useSomaStore((s) => s.records);
  const [filter, setFilter] = useState<Filter>('All records');

  const marked = records.filter((r) => r.location);
  const focus = marked[0]?.location;
  const series = marked.filter((r) => r.location === focus);
  const trend = severityTrend(series);
  const severities = trend.chrono.map((r) => r.severity);
  const firstAt = trend.chrono.length ? Date.parse(trend.chrono[0].at) : 0;
  const spanMs = trend.chrono.length ? Date.parse(trend.chrono[trend.chrono.length - 1].at) - firstAt : 0;
  const dayPositions = spanMs > 0 ? trend.chrono.map((r) => (Date.parse(r.at) - firstAt) / spanMs) : undefined;
  const [lo, hi] = range(severities);

  const shown = records.filter((r) =>
    filter === 'All records' ? true : filter === 'Marked pain' ? Boolean(r.location) : !r.location,
  );
  const span = records.length
    ? dateRange(new Date(records.at(-1)!.at), new Date(records[0].at))
    : dateRange(new Date(), new Date());

  return (
    <Screen>
      <Section index={1} gap={12}>
        <View style={styles.dateChip}>
          <CalendarDays />
          <Txt size={13} weight="semibold" lh={1.45}>
            {span}
          </Txt>
        </View>
        <PageIntro eyebrow="Indications only | Not diagnosis" title="Recent Trends" subtitle="Check with the doctors if necessary" />
      </Section>

      <Section index={2}>
        <PillButton
          label="Make an appointment"
          icon={CalendarWhite}
          variant="primary"
          height={48}
          paddingH={18}
          size={14}
          onPress={bookAppointment}
        />
      </Section>

      <Section index={3} gap={20}>
        {series.length ? (
          <Card>
            <View style={styles.between}>
              <View style={{ width: 220, gap: 4 }}>
                <Txt size={20} weight="medium" lh={1.35}>
                  {shortLocation(focus!)}, over time
                </Txt>
                <Txt size={12} color={colors.muted} lh={1.45}>
                  {feelingLabel(series[0].feeling)} · Patient-reported severity / 10
                </Txt>
              </View>
              <Badge tone="sky">{`${series.length} record${series.length === 1 ? '' : 's'}`}</Badge>
            </View>
            <View style={styles.plotRow}>
              <View style={styles.axis}>
                {['10', '5', '0'].map((t) => (
                  <Txt key={t} size={11} color={colors.muted} lh={1.45}>
                    {t}
                  </Txt>
                ))}
              </View>
              <View style={{ flex: 1 }}>
                <LineChart
                  values={severities}
                  xs={dayPositions}
                  min={0}
                  max={10}
                  height={160}
                  insetX={[9, 10]}
                  gridlines={[5, 0]}
                  highlight={{ width: 32, color: colors.accentSoftAlt }}
                  points={{ r: 3, strokeWidth: 2 }}
                />
              </View>
            </View>
            <View style={styles.dateAxis}>
              {sampleLabels(trend.chrono).map((r) => (
                <Txt key={r.id} size={11} color={colors.muted} lh={1.45}>
                  {dayMonth(new Date(r.at))}
                </Txt>
              ))}
            </View>
            <View style={{ gap: 8 }}>
              <Txt size={13} lh={1.45}>
                Average {fmtAvg(average(severities))} / 10
              </Txt>
              <Txt size={13} color={colors.muted} lh={1.45}>
                Range {lo}–{hi} / 10
              </Txt>
              <Txt size={13} color={colors.muted} lh={1.45}>
                Each dot is one saved entry.
              </Txt>
            </View>
          </Card>
        ) : null}

        {series.length >= 4 ? (
          <Card tone="sage">
            <View style={styles.inline}>
              <BellDot />
              <Txt size={14} weight="semibold" lh={1.45}>
                A possible early pattern
              </Txt>
            </View>
            <Txt size={24} weight="medium" lh={1.35}>
              {trend.direction === 'steady'
                ? 'Your logged severity has been steady.'
                : `You logged ${trend.direction} severity recently.`}
            </Txt>
            <Txt size={14} color={colors.muted} lh={1.45}>
              The last {trend.half} entries average {fmtAvg(trend.after)}/10, compared with {fmtAvg(trend.before)}/10 for the
              first {trend.half}. Both windows contain {trend.half} logs.
            </Txt>
            <Divider />
            <Txt size={13} color={colors.muted} lh={1.45}>
              Only {series.length} self-reported entries. Logging habits and unrecorded symptoms may affect this pattern; it
              does not establish a cause or worsening condition.
            </Txt>
            <Badge tone="field">Based only on your symptom logs</Badge>
          </Card>
        ) : null}

        <Card gap={12}>
          <View style={{ gap: 10 }}>
            <Txt size={20} weight="medium" lh={1.35}>
              Past Record Entries
            </Txt>
            <PillButton
              label={filter}
              icon={ChevronDown17}
              variant="outline"
              paddingH={14}
              style={styles.start}
              accessibilityLabel={`Filter: ${filter}. Tap to change.`}
              onPress={() => setFilter(FILTERS[(FILTERS.indexOf(filter) + 1) % FILTERS.length])}
            />
          </View>
          <View>
            {shown.map((r) => (
              <RecordRow key={r.id} record={r} />
            ))}
            {!shown.length ? (
              <Txt size={13} color={colors.muted} style={{ paddingVertical: 12 }}>
                No entries match this filter.
              </Txt>
            ) : null}
          </View>
          <Txt size={11} color={colors.muted} lh={1.45}>
            {summaryLine(shown)}
          </Txt>
        </Card>
      </Section>
    </Screen>
  );
}

function RecordRow({ record }: { record: SymptomRecord }) {
  const at = new Date(record.at);
  const marked = Boolean(record.location);
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.navigate({ pathname: '/record/[id]', params: { id: record.id } })}
      style={({ pressed }) => pressed && { opacity: 0.6 }}>
      <Divider />
      <View style={styles.row}>
        <View style={styles.rowTop}>
          <View style={{ flex: 1, gap: 1 }}>
            <Txt size={13} weight="medium" lh={1.45}>
              {date(at)}
            </Txt>
            <Txt size={11} color={colors.muted} lh={1.45}>
              {time(at)}
            </Txt>
          </View>
          <View style={[styles.severity, { backgroundColor: marked && record.severity >= 4 ? colors.blush : colors.field }]}>
            <Txt size={13} weight="semibold" lh={1.45}>
              {marked ? `${record.severity}/10` : 'Note'}
            </Txt>
          </View>
          {marked ? (
            <Txt size={13} color={colors.muted} lh={1.45}>
              Duration: {record.durationMin} min
            </Txt>
          ) : null}
          <ArrowUpRight16 />
        </View>
        <Txt size={13} lh={1.45}>
          {marked
            ? `${shortLocation(record.location)} · ${feelingLabel(record.feeling)}`
            : `Symptom note${record.tags.length ? ` · ${record.tags.join(', ')}` : ''}`}
        </Txt>
        {record.note ? (
          <Txt size={13} color={colors.muted} lh={1.45} numberOfLines={2}>
            {record.note}
          </Txt>
        ) : null}
      </View>
    </Pressable>
  );
}

/** Up to six evenly spaced date labels for the chart's x-axis. */
function summaryLine(records: SymptomRecord[]) {
  const marked = records.filter((r) => r.location);
  const n = records.length;
  const all = n === 1 ? '1 entry' : `All ${n} entries`;
  const same = <K extends keyof SymptomRecord>(k: K) => marked.length > 0 && marked.every((r) => r[k] === marked[0][k]);
  if (!marked.length || marked.length !== n) return `${all} · ${marked.length} with a body mark`;
  if (same('location') && same('layer') && same('feeling')) {
    return `${all} · ${marked[0].location} · ${layerLabel(marked[0].layer)} depth · ${feelingLabel(marked[0].feeling)} pain`;
  }
  return `${all} · ${new Set(marked.map((r) => r.location)).size} marked locations`;
}

const styles = StyleSheet.create({
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  plotRow: { flexDirection: 'row', gap: 12, paddingRight: 14 },
  axis: { width: 24, height: 160, justifyContent: 'space-between' },
  dateAxis: { flexDirection: 'row', justifyContent: 'space-between', paddingRight: 50 },
  start: { alignSelf: 'flex-start' },
  row: { paddingVertical: 12, gap: 10 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  severity: { width: 56, height: 30, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
});
